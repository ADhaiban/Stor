-- Atomic functions for stock issue workflow

CREATE OR REPLACE FUNCTION approve_stock_issue(
    p_request_id UUID,
    p_approved_by VARCHAR
) RETURNS JSONB AS $$
DECLARE
    v_req RECORD;
    v_stock RECORD;
    v_available DECIMAL;
BEGIN
    -- Select for update to lock the request
    SELECT * INTO v_req FROM stock_issue_requests 
    WHERE id = p_request_id AND is_deleted = FALSE FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'NOT_FOUND', 'message', 'الطلب غير موجود');
    END IF;
    
    IF v_req.status <> 'PENDING' THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_STATUS', 'message', 'يمكن اعتماد الطلبات المعلقة فقط');
    END IF;

    -- Lock the inventory row
    SELECT * INTO v_stock FROM inventory_stock 
    WHERE product_id = v_req.product_id AND location_id IS NULL FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'STOCK_ROW_NOT_FOUND', 'message', 'لم يتم العثور على سجل مخزون لهذا الصنف');
    END IF;

    v_available := v_stock.quantity_on_hand - v_stock.quantity_reserved;
    
    IF v_available < v_req.quantity THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error_code', 'INSUFFICIENT_STOCK', 
            'message', 'المخزون المتاح غير كافٍ للاعتماد',
            'details', jsonb_build_object(
                'available', v_available,
                'requested', v_req.quantity,
                'on_hand', v_stock.quantity_on_hand,
                'reserved', v_stock.quantity_reserved
            )
        );
    END IF;

    -- Update reservation
    UPDATE inventory_stock SET quantity_reserved = quantity_reserved + v_req.quantity
    WHERE id = v_stock.id;

    UPDATE stock_issue_requests SET 
        status = 'APPROVED',
        approved_by = p_approved_by,
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true, 'message', 'تم اعتماد الطلب وحجز الكمية بنجاح');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION execute_stock_issue(
    p_request_id UUID,
    p_receiver_name VARCHAR,
    p_issued_by VARCHAR,
    p_notes TEXT
) RETURNS JSONB AS $$
DECLARE
    v_req RECORD;
    v_stock RECORD;
    v_movement_id UUID;
    v_prod_name VARCHAR;
    v_prod_cost DECIMAL;
BEGIN
    SELECT * INTO v_req FROM stock_issue_requests 
    WHERE id = p_request_id AND is_deleted = FALSE FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'NOT_FOUND', 'message', 'الطلب غير موجود');
    END IF;
    
    IF v_req.status <> 'APPROVED' THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_STATUS', 'message', 'يجب أن يكون الطلب معتمداً ليتم صرفه');
    END IF;

    SELECT name, current_wac_cost INTO v_prod_name, v_prod_cost FROM products WHERE id = v_req.product_id;

    SELECT * INTO v_stock FROM inventory_stock 
    WHERE product_id = v_req.product_id AND location_id IS NULL FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'STOCK_ROW_NOT_FOUND', 'message', 'لم يتم العثور على سجل مخزون لهذا الصنف');
    END IF;

    -- Final on-hand check
    IF v_stock.quantity_on_hand < v_req.quantity THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error_code', 'INSUFFICIENT_STOCK', 
            'message', 'المخزون الفعلي أقل من الكمية المطلوبة (عجز غير متوقع)',
            'details', jsonb_build_object(
                'on_hand', v_stock.quantity_on_hand,
                'requested', v_req.quantity
            )
        );
    END IF;

    -- Deduct from stock and reservation
    UPDATE inventory_stock SET 
        quantity_on_hand = quantity_on_hand - v_req.quantity,
        quantity_reserved = quantity_reserved - v_req.quantity
    WHERE id = v_stock.id;

    -- Create movement record
    INSERT INTO stock_movements (
        type, product_id, product_name, quantity, unit_cost, total_amount, 
        warehouse_from_id, department_id, beneficiary_id, reference_doc_id, notes,
        created_by
    ) VALUES (
        'CONSUMPTION', v_req.product_id, v_prod_name, v_req.quantity, v_prod_cost, (v_req.quantity * v_prod_cost),
        v_stock.warehouse_id, v_req.department_id, v_req.beneficiary_id, v_req.request_code, 
        COALESCE(p_notes, 'صرف بناء على الطلب: ' || v_req.request_code),
        p_issued_by
    ) RETURNING id INTO v_movement_id;

    -- Finalize request
    UPDATE stock_issue_requests SET 
        status = 'ISSUED',
        issued_at = NOW(),
        issued_movement_id = v_movement_id,
        receiver_employee_name = p_receiver_name,
        notes = COALESCE(notes, '') || E'\nExecuted By: ' || p_issued_by || CASE WHEN p_notes IS NOT NULL THEN E'\nNotes: ' || p_notes ELSE '' END,
        updated_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true, 'message', 'تم تنفيذ الصرف بنجاح', 'movement_id', v_movement_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reject_stock_issue(
    p_request_id UUID,
    p_rejected_by VARCHAR,
    p_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_req RECORD;
BEGIN
    SELECT * INTO v_req FROM stock_issue_requests 
    WHERE id = p_request_id AND is_deleted = FALSE FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'NOT_FOUND', 'message', 'الطلب غير موجود');
    END IF;

    -- Release reservation if it was approved
    IF v_req.status = 'APPROVED' THEN
        UPDATE inventory_stock SET quantity_reserved = quantity_reserved - v_req.quantity
        WHERE product_id = v_req.product_id AND location_id IS NULL;
    END IF;

    UPDATE stock_issue_requests SET 
        status = 'REJECTED',
        notes = COALESCE(notes, '') || E'\nRejection By: ' || p_rejected_by || CASE WHEN p_reason IS NOT NULL THEN E'\nReason: ' || p_reason ELSE '' END,
        updated_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true, 'message', 'تم رفض الطلب بنجاح');
END;
$$ LANGUAGE plpgsql;
