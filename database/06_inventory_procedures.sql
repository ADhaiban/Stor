-- ================================================
-- 6. Inventory Procedures
-- Atomic handling of stock movements and inventory updates
-- ================================================

-- Procedure to process inbound movement atomically
CREATE OR REPLACE FUNCTION process_inbound_movement(
    p_movement JSONB,
    p_inventory_items JSONB
) RETURNS UUID AS $$
DECLARE
    v_movement_id UUID;
    v_item RECORD;
BEGIN
    -- 1. Insert Movement Record
    INSERT INTO stock_movements (
        type, 
        product_id, 
        product_name, 
        warehouse_to_id, 
        quantity, 
        unit_cost, 
        total_amount, 
        reference_doc_id, 
        notes,
        vendor_id
    ) VALUES (
        (p_movement->>'type')::movement_type_enum,
        (p_movement->>'product_id')::UUID,
        p_movement->>'product_name',
        (p_movement->>'warehouse_to_id')::UUID,
        (p_movement->>'quantity')::DECIMAL,
        (p_movement->>'unit_cost')::DECIMAL,
        (p_movement->>'total_amount')::DECIMAL,
        (p_movement->>'reference_doc_id'), -- Removed ::UUID cast
        p_movement->>'notes',
        (p_movement->>'vendor_id')::UUID
    ) RETURNING id INTO v_movement_id;

    -- 2. Update/Insert Inventory Stock
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_inventory_items) AS x(
        warehouse_id UUID, product_id UUID, quantity DECIMAL, location_id UUID
    ) LOOP
        INSERT INTO inventory_stock (
            warehouse_id, product_id, location_id, quantity_on_hand
        ) VALUES (
            v_item.warehouse_id, v_item.product_id, v_item.location_id, v_item.quantity
        )
        ON CONFLICT (warehouse_id, product_id, location_id) 
        DO UPDATE SET 
            quantity_on_hand = inventory_stock.quantity_on_hand + EXCLUDED.quantity_on_hand;
    END LOOP;

    RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

-- Procedure to process outbound movement atomically
CREATE OR REPLACE FUNCTION process_outbound_movement(
    p_movement JSONB,
    p_inventory_items JSONB
) RETURNS UUID AS $$
DECLARE
    v_movement_id UUID;
    v_item RECORD;
BEGIN
    -- 1. Insert Movement Record
    INSERT INTO stock_movements (
        type, 
        product_id, 
        product_name, 
        warehouse_from_id, 
        quantity, 
        unit_cost, 
        total_amount, 
        reference_doc_id, 
        notes,
        client_id
    ) VALUES (
        (p_movement->>'type')::movement_type_enum,
        (p_movement->>'product_id')::UUID,
        p_movement->>'product_name',
        (p_movement->>'warehouse_from_id')::UUID,
        (p_movement->>'quantity')::DECIMAL,
        (p_movement->>'unit_cost')::DECIMAL,
        (p_movement->>'total_amount')::DECIMAL,
        (p_movement->>'reference_doc_id'), -- Removed ::UUID cast
        p_movement->>'notes',
        (p_movement->>'client_id')::UUID
    ) RETURNING id INTO v_movement_id;

    -- 2. Update Inventory Stock (Decrease)
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_inventory_items) AS x(
        warehouse_id UUID, product_id UUID, quantity DECIMAL, location_id UUID
    ) LOOP
        UPDATE inventory_stock 
        SET quantity_on_hand = quantity_on_hand - v_item.quantity
        WHERE warehouse_id = v_item.warehouse_id 
          AND product_id = v_item.product_id
          AND (location_id = v_item.location_id OR (location_id IS NULL AND v_item.location_id IS NULL));
    END LOOP;

    RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

-- Procedure to process internal issue request
CREATE OR REPLACE FUNCTION process_issue_request(
    p_request_id UUID,
    p_receiver_employee_name VARCHAR DEFAULT NULL,
    p_issued_by VARCHAR DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_req RECORD;
    v_default_warehouse_id UUID;
    v_available_qty DECIMAL(15, 4);
    v_movement_id UUID;
BEGIN
    SELECT *
    INTO v_req
    FROM stock_issue_requests
    WHERE id = p_request_id
      AND is_deleted = FALSE
      AND status = 'APPROVED';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Issue request must be APPROVED: %', p_request_id;
    END IF;

    SELECT default_warehouse_id
    INTO v_default_warehouse_id
    FROM products
    WHERE id = v_req.product_id;

    IF v_default_warehouse_id IS NULL THEN
        RAISE EXCEPTION 'Product % has no default warehouse', v_req.product_id;
    END IF;

    SELECT COALESCE(quantity_on_hand, 0)
    INTO v_available_qty
    FROM inventory_stock
    WHERE warehouse_id = v_default_warehouse_id
      AND product_id = v_req.product_id
      AND location_id IS NULL
    LIMIT 1;

    IF COALESCE(v_available_qty, 0) < v_req.quantity THEN
        RAISE EXCEPTION 'Insufficient stock';
    END IF;

    INSERT INTO stock_movements (
        type,
        product_id,
        product_name,
        warehouse_from_id,
        department_id,
        quantity,
        unit_cost,
        total_amount,
        beneficiary_id,
        reference_doc_id,
        notes
    )
    SELECT
        'CONSUMPTION',
        p.id,
        p.name,
        v_default_warehouse_id,
        v_req.department_id,
        v_req.quantity,
        p.current_wac_cost,
        (v_req.quantity * p.current_wac_cost),
        v_req.beneficiary_id,
        v_req.id,
        COALESCE(p_notes, 'Issue request execution: ' || v_req.request_code)
    FROM products p
    WHERE p.id = v_req.product_id
    RETURNING id INTO v_movement_id;

    UPDATE inventory_stock
    SET quantity_on_hand = quantity_on_hand - v_req.quantity
    WHERE warehouse_id = v_default_warehouse_id
      AND product_id = v_req.product_id
      AND location_id IS NULL;

    UPDATE stock_issue_requests
    SET status = 'ISSUED',
        issued_at = NOW(),
        receiver_employee_name = p_receiver_employee_name,
        issued_movement_id = v_movement_id,
        updated_at = NOW()
    WHERE id = p_request_id;

    RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

-- Procedure to process purchase order receipt atomically
CREATE OR REPLACE FUNCTION process_purchase_receipt(
    p_po_id UUID,
    p_receipt_items JSONB,
    p_user_name VARCHAR DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_item RECORD;
    v_remaining_qty DECIMAL(15, 4);
    v_processed_count INTEGER := 0;
    v_total_ordered DECIMAL(15, 4);
    v_total_received DECIMAL(15, 4);
    v_po_number VARCHAR(50);
    v_vendor_id UUID;
BEGIN
    SELECT po_number, vendor_id
    INTO v_po_number, v_vendor_id
    FROM purchase_orders
    WHERE id = p_po_id AND is_deleted = FALSE;

    IF v_po_number IS NULL THEN
        RAISE EXCEPTION 'Purchase order not found: %', p_po_id;
    END IF;

    FOR v_item IN
        SELECT *
        FROM jsonb_to_recordset(p_receipt_items) AS x(
            purchase_order_item_id UUID,
            quantity_received DECIMAL,
            warehouse_id UUID
        )
    LOOP
        IF v_item.quantity_received IS NULL OR v_item.quantity_received <= 0 THEN
            CONTINUE;
        END IF;

        SELECT (quantity_ordered - quantity_received)
        INTO v_remaining_qty
        FROM purchase_order_items
        WHERE id = v_item.purchase_order_item_id
          AND purchase_order_id = p_po_id;

        IF v_remaining_qty IS NULL THEN
            RAISE EXCEPTION 'PO item not found: %', v_item.purchase_order_item_id;
        END IF;

        IF v_item.quantity_received > v_remaining_qty THEN
            RAISE EXCEPTION 'Received quantity exceeds remaining quantity for item %', v_item.purchase_order_item_id;
        END IF;

        INSERT INTO stock_movements (
            type,
            product_id,
            product_name,
            warehouse_to_id,
            quantity,
            unit_cost,
            total_amount,
            vendor_id,
            reference_doc_id,
            notes
        )
        SELECT
            'IN',
            poi.product_id,
            p.name,
            COALESCE(v_item.warehouse_id, poi.warehouse_id, p.default_warehouse_id),
            v_item.quantity_received,
            poi.unit_cost,
            v_item.quantity_received * poi.unit_cost,
            v_vendor_id,
            p_po_id,
            COALESCE(p_notes, 'PO Receipt - ' || v_po_number)
        FROM purchase_order_items poi
        JOIN products p ON p.id = poi.product_id
        WHERE poi.id = v_item.purchase_order_item_id;

        INSERT INTO inventory_stock (warehouse_id, location_id, product_id, quantity_on_hand, quantity_reserved)
        SELECT
            COALESCE(v_item.warehouse_id, poi.warehouse_id, p.default_warehouse_id),
            NULL,
            poi.product_id,
            v_item.quantity_received,
            0
        FROM purchase_order_items poi
        JOIN products p ON p.id = poi.product_id
        WHERE poi.id = v_item.purchase_order_item_id
        ON CONFLICT ON CONSTRAINT unique_stock_loc
        DO UPDATE SET quantity_on_hand = inventory_stock.quantity_on_hand + EXCLUDED.quantity_on_hand;

        UPDATE purchase_order_items
        SET quantity_received = quantity_received + v_item.quantity_received,
            updated_at = NOW()
        WHERE id = v_item.purchase_order_item_id;

        v_processed_count := v_processed_count + 1;
    END LOOP;

    IF v_processed_count = 0 THEN
        RAISE EXCEPTION 'No valid receipt lines were provided';
    END IF;

    SELECT
        COALESCE(SUM(quantity_ordered), 0),
        COALESCE(SUM(quantity_received), 0)
    INTO v_total_ordered, v_total_received
    FROM purchase_order_items
    WHERE purchase_order_id = p_po_id;

    UPDATE purchase_orders
    SET status = CASE
            WHEN v_total_received = 0 THEN status
            WHEN v_total_received < v_total_ordered THEN 'PARTIALLY_RECEIVED'::po_status_enum
            ELSE 'RECEIVED'::po_status_enum
        END,
        received_at = CASE WHEN v_total_received >= v_total_ordered THEN NOW() ELSE received_at END,
        updated_at = NOW()
    WHERE id = p_po_id;

    RETURN v_processed_count;
END;
$$ LANGUAGE plpgsql;
