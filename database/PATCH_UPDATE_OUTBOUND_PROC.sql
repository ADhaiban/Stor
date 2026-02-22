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
        department_id, -- Added field
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
        (p_movement->>'department_id')::UUID, -- Added extraction
        (p_movement->>'quantity')::DECIMAL,
        (p_movement->>'unit_cost')::DECIMAL,
        (p_movement->>'total_amount')::DECIMAL,
        p_movement->>'reference_doc_id',
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
