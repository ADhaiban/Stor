-- 14_delivery_bags_refactor.sql

-- 1. Ensure 'شنط' Category Exists
INSERT INTO product_categories (name) VALUES ('شنط') ON CONFLICT (name) DO NOTHING;

-- 2. Update serial_status_enum to include 'ISSUED'
DO $$
BEGIN
    ALTER TYPE serial_status_enum ADD VALUE 'ISSUED';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Add beneficiary_id to stock_movements if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_movements' AND column_name='beneficiary_id') THEN
        ALTER TABLE stock_movements ADD COLUMN beneficiary_id UUID REFERENCES inventory_beneficiaries(id);
    END IF;
END $$;

-- 4. Create View for Delivery Bags Report
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
    -- Check if effectively issued (has OUT movement but no return)
    -- Logic: status is ISSUED or (movement_out_id IS NOT NULL)
    (ps.status = 'ISSUED') AS is_issued
FROM product_serials ps
JOIN products p ON ps.product_id = p.id
JOIN product_categories c ON p.category_id = c.id
LEFT JOIN stock_movements m_in ON ps.movement_in_id = m_in.id
LEFT JOIN stock_movements m_out ON ps.movement_out_id = m_out.id
LEFT JOIN inventory_beneficiaries ben ON m_out.beneficiary_id = ben.id
LEFT JOIN warehouses w ON ps.warehouse_id = w.id
WHERE c.name = 'شنط';

-- 5. RPC Functions

-- A. Register/Supply New Bag (Serial)
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
BEGIN
    -- Check if serial exists
    IF EXISTS (SELECT 1 FROM product_serials WHERE serial_number = p_serial_number AND product_id = p_product_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'رقم الشنطة التسلسلي مسجل مسبقاً لهذا المنتج');
    END IF;

    -- Create IN Movement (Supply)
    INSERT INTO stock_movements (
        type, product_id, product_name, warehouse_to_id, quantity, unit_cost, 
        user_id, notes, transaction_date
    ) 
    SELECT 
        'IN', p_product_id, name, p_warehouse_id, 1, current_wac_cost, 
        p_user_id, p_notes, NOW()
    FROM products WHERE id = p_product_id
    RETURNING id INTO v_movement_id;

    -- Create Serial
    INSERT INTO product_serials (
        product_id, serial_number, status, warehouse_id, movement_in_id
    ) VALUES (
        p_product_id, p_serial_number, 'AVAILABLE', p_warehouse_id, v_movement_id
    ) RETURNING id INTO v_serial_id;

    RETURN jsonb_build_object('success', true, 'serial_id', v_serial_id);
END;
$$ LANGUAGE plpgsql;

-- B. Issue Bag to Driver
CREATE OR REPLACE FUNCTION issue_bag_serial(
    p_serial_id UUID,
    p_driver_id UUID,
    p_user_id UUID,
    p_notes TEXT
) RETURNS JSONB AS $$
DECLARE
    v_serial RECORD;
    v_driver_has_bag BOOLEAN;
    v_movement_id UUID;
BEGIN
    SELECT * INTO v_serial FROM product_serials WHERE id = p_serial_id FOR UPDATE;
    
    -- Validation
    IF v_serial.status = 'ISSUED' OR v_serial.movement_out_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'الشنطة مسلمة بالفعل');
    END IF;
    
    IF v_serial.status IN ('DAMAGED', 'SOLD') THEN
        RETURN jsonb_build_object('success', false, 'message', 'حالة الشنطة لا تسمح بالصرف (تالفة أو مباعة)');
    END IF;

    -- Check One Bag Per Driver Rule
    -- We check if any serial in 'شنط' category is currently issued to this driver
    SELECT EXISTS (
        SELECT 1 
        FROM product_serials ps
        JOIN products p ON ps.product_id = p.id
        JOIN product_categories c ON p.category_id = c.id
        JOIN stock_movements m_out ON ps.movement_out_id = m_out.id
        WHERE c.name = 'شنط' 
          AND ps.status = 'ISSUED' 
          AND m_out.beneficiary_id = p_driver_id
    ) INTO v_driver_has_bag;

    IF v_driver_has_bag THEN
        RETURN jsonb_build_object('success', false, 'message', 'الموصل لديه شنطة أخرى بالعهدة');
    END IF;

    -- Create OUT Movement (Issue)
    INSERT INTO stock_movements (
        type, product_id, product_name, warehouse_from_id, quantity, unit_cost,
        user_id, beneficiary_id, notes, transaction_date
    )
    SELECT 
        'OUT', v_serial.product_id, p.name, v_serial.warehouse_id, 1, p.current_wac_cost,
        p_user_id, p_driver_id, p_notes, NOW()
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

-- C. Receive Bag From Driver
CREATE OR REPLACE FUNCTION receive_bag_serial(
    p_serial_id UUID,
    p_status serial_status_enum, -- Optional status update (AVAILABLE, DAMAGED...)
    p_user_id UUID,
    p_notes TEXT
) RETURNS JSONB AS $$
DECLARE
    v_serial RECORD;
    v_movement_id UUID;
BEGIN
    SELECT * INTO v_serial FROM product_serials WHERE id = p_serial_id FOR UPDATE;

    IF v_serial.status != 'ISSUED' AND v_serial.movement_out_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'الشنطة موجودة بالمخزن بالفعل (غير منصرفة)');
    END IF;

    -- Log Return Movement (as Transfer back to warehouse or just IN?) 
    -- We'll use IN or TRANSFER usually to record history. But serial logic clears movement_out_id.
    -- Let's create an 'IN' movement to log the return transaction history, 
    -- but we WON'T set ps.movement_in_id to it (preserving original supply date).
    INSERT INTO stock_movements (
        type, product_id, product_name, warehouse_to_id, quantity, unit_cost,
        user_id, beneficiary_id, notes, transaction_date
    )
    SELECT 
        'IN', v_serial.product_id, p.name, v_serial.warehouse_id, 1, p.current_wac_cost,
        p_user_id, (SELECT beneficiary_id FROM stock_movements WHERE id = v_serial.movement_out_id), 
        COALESCE(p_notes, 'Returned from driver'), NOW()
    FROM products p WHERE id = v_serial.product_id;

    -- Update Serial
    UPDATE product_serials
    SET status = COALESCE(p_status, 'AVAILABLE'),
        movement_out_id = NULL, -- Clear link so it's back in stock
        updated_at = NOW()
    WHERE id = p_serial_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- D. Transfer Bag (Driver to Driver)
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
    v_res := receive_bag_serial(p_serial_id, 'AVAILABLE', p_user_id, 'Auto-receive for transfer');
    IF (v_res->>'success')::boolean = false THEN
        RETURN v_res;
    END IF;

    -- 2. Issue
    v_res := issue_bag_serial(p_serial_id, p_new_driver_id, p_user_id, p_notes);
    IF (v_res->>'success')::boolean = false THEN
        -- Rollback logic? This function is atomic in a transaction block usually.
        -- But for now if issue fails (e.g. driver has bag), we are stuck with received bag.
        -- Ideally raise exception to rollback everything.
        RAISE EXCEPTION 'فشل النقل: %', v_res->>'message';
    END IF;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;
