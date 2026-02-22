-- 22_fix_custody_report_and_functions.sql

-- ========================================================
-- 1. Fix the view to ensure ALL serials show up (LEFT JOINs)
-- ========================================================

CREATE OR REPLACE VIEW delivery_bags_report_view AS
SELECT 
    ps.id AS serial_id,
    ps.serial_number AS bag_no,
    ps.created_at,
    m_in.transaction_date AS supplied_at,
    m_out.transaction_date AS issued_at,
    ps.status,
    m_out.beneficiary_id AS current_driver_id,
    ben.name AS driver_name,
    ps.warehouse_id,
    w.name AS branch_name,
    p.name AS product_name,
    c.name AS category_name,
    -- effectively issued if status is ISSUED
    (ps.status = 'ISSUED') AS is_issued
FROM product_serials ps
LEFT JOIN products p ON ps.product_id = p.id
LEFT JOIN product_categories c ON COALESCE(ps.category_id, p.category_id) = c.id
LEFT JOIN stock_movements m_in ON ps.movement_in_id = m_in.id
LEFT JOIN stock_movements m_out ON ps.movement_out_id = m_out.id
LEFT JOIN inventory_beneficiaries ben ON m_out.beneficiary_id = ben.id
LEFT JOIN warehouses w ON ps.warehouse_id = w.id;

-- ========================================================
-- 2. Redeclare RPC Functions with correct signatures
-- ========================================================

-- A. Issue Bag/Serial to Driver
CREATE OR REPLACE FUNCTION issue_bag_serial(
    p_serial_id UUID,
    p_driver_id UUID,
    p_user_id UUID,
    p_notes TEXT
) RETURNS JSONB AS $$
DECLARE
    v_serial RECORD;
    v_movement_id UUID;
BEGIN
    -- Get serial with lock
    SELECT * INTO v_serial FROM product_serials WHERE id = p_serial_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'السيريال غير موجود');
    END IF;

    -- Validation
    IF v_serial.status = 'ISSUED' OR v_serial.movement_out_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'البند مصروف حالياً بالفعل');
    END IF;
    
    IF v_serial.status IN ('DAMAGED', 'SOLD') THEN
        RETURN jsonb_build_object('success', false, 'message', 'حالة البند لا تسمح بالصرف (تالفة أو مباعة)');
    END IF;

    -- Create OUT Movement (Issue)
    INSERT INTO stock_movements (
        type, product_id, product_name, warehouse_from_id, quantity, unit_cost,
        user_id, beneficiary_id, notes, transaction_date, serial_number
    )
    SELECT 
        'OUT', v_serial.product_id, p.name, v_serial.warehouse_id, 1, p.current_wac_cost,
        p_user_id, p_driver_id, p_notes, NOW(), v_serial.serial_number
    FROM products p WHERE id = v_serial.product_id
    RETURNING id INTO v_movement_id;

    -- Update Serial
    UPDATE product_serials
    SET status = 'ISSUED',
        movement_out_id = v_movement_id,
        updated_at = NOW()
    WHERE id = p_serial_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- B. Receive Bag/Serial From Driver
CREATE OR REPLACE FUNCTION receive_bag_serial(
    p_serial_id UUID,
    p_status VARCHAR, -- Optional status update (AVAILABLE, DAMAGED...)
    p_user_id UUID,
    p_notes TEXT
) RETURNS JSONB AS $$
DECLARE
    v_serial RECORD;
    v_driver_id UUID;
BEGIN
    SELECT * INTO v_serial FROM product_serials WHERE id = p_serial_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'السيريال غير موجود');
    END IF;

    -- Get driver from current movement_out
    SELECT beneficiary_id INTO v_driver_id FROM stock_movements WHERE id = v_serial.movement_out_id;

    -- Create IN Movement (Return)
    INSERT INTO stock_movements (
        type, product_id, product_name, warehouse_to_id, quantity, unit_cost,
        user_id, beneficiary_id, notes, transaction_date, serial_number
    )
    SELECT 
        'IN', v_serial.product_id, p.name, v_serial.warehouse_id, 1, p.current_wac_cost,
        p_user_id, v_driver_id, COALESCE(p_notes, 'إرجاع من الموصل'), NOW(), v_serial.serial_number
    FROM products p WHERE id = v_serial.product_id;

    -- Update Serial
    UPDATE product_serials
    SET status = COALESCE(p_status, 'AVAILABLE'),
        movement_out_id = NULL,
        updated_at = NOW()
    WHERE id = p_serial_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- C. Transfer Serial (Driver to Driver)
CREATE OR REPLACE FUNCTION transfer_bag_serial(
    p_serial_id UUID,
    p_new_driver_id UUID,
    p_user_id UUID,
    p_notes TEXT
) RETURNS JSONB AS $$
DECLARE
    v_res JSONB;
BEGIN
    -- 1. Receive
    v_res := receive_bag_serial(p_serial_id, 'AVAILABLE', p_user_id, 'إرجاع تلقائي تمهيداً للنقل');
    IF (v_res->>'success')::boolean = false THEN
        RETURN v_res;
    END IF;

    -- 2. Issue
    v_res := issue_bag_serial(p_serial_id, p_new_driver_id, p_user_id, p_notes);
    IF (v_res->>'success')::boolean = false THEN
        RAISE EXCEPTION 'فشل النقل: %', v_res->>'message';
    END IF;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- D. Register/Supply New Serial
CREATE OR REPLACE FUNCTION register_bag_serial(
    p_serial_number VARCHAR,
    p_product_id UUID,
    p_warehouse_id UUID,
    p_user_id UUID,
    p_notes TEXT
) RETURNS JSONB AS $$
DECLARE
    v_serial_id UUID;
    v_movement_id UUID;
    v_category_id UUID;
BEGIN
    SELECT category_id INTO v_category_id FROM products WHERE id = p_product_id;

    -- Check if serial exists in this CATEGORY
    IF EXISTS (SELECT 1 FROM product_serials WHERE serial_number = p_serial_number AND category_id = v_category_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'رقم السيريال مسجل مسبقاً لهذه الفئة');
    END IF;

    -- Create IN Movement
    INSERT INTO stock_movements (
        type, product_id, product_name, warehouse_to_id, quantity, unit_cost, 
        user_id, notes, transaction_date, serial_number
    ) 
    SELECT 
        'IN', p_product_id, name, p_warehouse_id, 1, current_wac_cost, 
        p_user_id, p_notes, NOW(), p_serial_number
    FROM products WHERE id = p_product_id
    RETURNING id INTO v_movement_id;

    -- Create Serial
    INSERT INTO product_serials (
        product_id, category_id, serial_number, status, warehouse_id, movement_in_id
    ) VALUES (
        p_product_id, v_category_id, p_serial_number, 'AVAILABLE', p_warehouse_id, v_movement_id
    ) RETURNING id INTO v_serial_id;

    RETURN jsonb_build_object('success', true, 'serial_id', v_serial_id);
END;
$$ LANGUAGE plpgsql;

-- Notify change
NOTIFY pgrst, 'reload schema';
