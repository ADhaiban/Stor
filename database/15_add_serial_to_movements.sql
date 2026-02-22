-- 15_add_serial_to_movements.sql

-- 1. Add serial_number to stock_movements
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);

-- 2. Update RPCs to include serial_number
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
    IF EXISTS (SELECT 1 FROM product_serials WHERE serial_number = p_serial_number AND product_id = p_product_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'رقم الشنطة التسلسلي مسجل مسبقاً لهذا المنتج');
    END IF;

    INSERT INTO stock_movements (
        type, product_id, product_name, warehouse_to_id, quantity, unit_cost, 
        user_id, notes, transaction_date, serial_number
    ) 
    SELECT 
        'IN', p_product_id, name, p_warehouse_id, 1, current_wac_cost, 
        p_user_id, p_notes, NOW(), p_serial_number
    FROM products WHERE id = p_product_id
    RETURNING id INTO v_movement_id;

    INSERT INTO product_serials (
        product_id, serial_number, status, warehouse_id, movement_in_id
    ) VALUES (
        p_product_id, p_serial_number, 'AVAILABLE', p_warehouse_id, v_movement_id
    ) RETURNING id INTO v_serial_id;

    RETURN jsonb_build_object('success', true, 'serial_id', v_serial_id);
END;
$$ LANGUAGE plpgsql;

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
    
    IF v_serial.status = 'ISSUED' OR v_serial.movement_out_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'الشنطة مسلمة بالفعل');
    END IF;
    
    IF v_serial.status IN ('DAMAGED', 'SOLD') THEN
        RETURN jsonb_build_object('success', false, 'message', 'حالة الشنطة لا تسمح بالصرف (تالفة أو مباعة)');
    END IF;

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

    INSERT INTO stock_movements (
        type, product_id, product_name, warehouse_from_id, quantity, unit_cost,
        user_id, beneficiary_id, notes, transaction_date, serial_number
    )
    SELECT 
        'OUT', v_serial.product_id, p.name, v_serial.warehouse_id, 1, p.current_wac_cost,
        p_user_id, p_driver_id, p_notes, NOW(), v_serial.serial_number
    FROM products p WHERE id = v_serial.product_id
    RETURNING id INTO v_movement_id;

    UPDATE product_serials
    SET status = 'ISSUED',
        movement_out_id = v_movement_id,
        updated_at = NOW()
    WHERE id = p_serial_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION receive_bag_serial(
    p_serial_id UUID,
    p_status serial_status_enum, 
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

    INSERT INTO stock_movements (
        type, product_id, product_name, warehouse_to_id, quantity, unit_cost,
        user_id, beneficiary_id, notes, transaction_date, serial_number
    )
    SELECT 
        'IN', v_serial.product_id, p.name, v_serial.warehouse_id, 1, p.current_wac_cost,
        p_user_id, (SELECT beneficiary_id FROM stock_movements WHERE id = v_serial.movement_out_id), 
        COALESCE(p_notes, 'Returned from driver'), NOW(), v_serial.serial_number
    FROM products p WHERE id = v_serial.product_id;

    UPDATE product_serials
    SET status = COALESCE(p_status, 'AVAILABLE'),
        movement_out_id = NULL, 
        updated_at = NOW()
    WHERE id = p_serial_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
