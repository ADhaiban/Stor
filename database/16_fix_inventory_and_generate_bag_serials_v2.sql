-- 16_fix_inventory_and_generate_bag_serials.sql

-- ========================================================
-- 1. Fix Inventory Stock View (Aggregation & Transfer Logic)
-- ========================================================

DROP VIEW IF EXISTS inventory_stock CASCADE;
-- Using CASCADE because dependent views/functions might exist

CREATE OR REPLACE VIEW inventory_stock AS
SELECT 
    m.product_id,
    p.name AS product_name,
    p.sku,
    c.name AS category_name,
    m.warehouse_id,
    w.name AS warehouse_name,
    SUM(m.quantity) AS quantity_on_hand,
    0 AS quantity_reserved -- Placeholder
FROM (
    -- Incoming Stock (Add)
    SELECT product_id, warehouse_to_id AS warehouse_id, quantity 
    FROM stock_movements 
    WHERE type IN ('IN', 'ADJUSTMENT_IN', 'RETURN', 'TRANSFER') 
      AND warehouse_to_id IS NOT NULL

    UNION ALL

    -- Outgoing Stock (Deduct)
    SELECT product_id, warehouse_from_id AS warehouse_id, -quantity 
    FROM stock_movements 
    WHERE type IN ('OUT', 'ADJUSTMENT_OUT', 'TRANSFER') 
      AND warehouse_from_id IS NOT NULL
) m
JOIN products p ON m.product_id = p.id
LEFT JOIN product_categories c ON p.category_id = c.id
LEFT JOIN warehouses w ON m.warehouse_id = w.id
WHERE m.warehouse_id IS NOT NULL
GROUP BY m.product_id, p.name, p.sku, c.name, m.warehouse_id, w.name
HAVING SUM(m.quantity) <> 0;

-- ========================================================
-- 2. Auto-Generate Serials for Existing Bags (Logic Block)
-- ========================================================

DO $$
DECLARE
    v_bag_rec RECORD;
    v_existing_count INTEGER;
    v_needed INTEGER;
    v_new_serial VARCHAR;
    v_movement_id UUID;
    v_i INTEGER; 
    v_cat_str VARCHAR := 'شنط';
BEGIN
    FOR v_bag_rec IN 
        SELECT i.* 
        FROM inventory_stock i
        WHERE i.category_name = v_cat_str AND i.quantity_on_hand > 0
    LOOP
        -- How many serials exist for this product at this warehouse?
        SELECT COUNT(*) INTO v_existing_count 
        FROM product_serials 
        WHERE product_id = v_bag_rec.product_id 
          AND warehouse_id = v_bag_rec.warehouse_id
          AND status = 'AVAILABLE'; 
        
        -- If we have 10 items in stock, but only 2 serials "AVAILABLE", we need 8 more.
        -- Note: If items are ISSUED, they are OUT of stock in this view (because issued = OUT movement), 
        -- so inventory_stock *only* sees AVAILABLE items.
        -- Therefore, we simply compare current stock count with available serials count.
        
        v_needed := v_bag_rec.quantity_on_hand - v_existing_count;
        
        IF v_needed > 0 THEN
            RAISE NOTICE 'Generating % serials for % at %', v_needed, v_bag_rec.sku, v_bag_rec.warehouse_name;
            
            -- Find latest IN movement to link
            SELECT id INTO v_movement_id 
            FROM stock_movements 
            WHERE product_id = v_bag_rec.product_id 
              AND warehouse_to_id = v_bag_rec.warehouse_id 
              AND type IN ('IN', 'TRANSFER', 'ADJUSTMENT_IN')
            ORDER BY transaction_date DESC LIMIT 1;
            
            FOR v_i IN 1..v_needed LOOP
                v_new_serial := v_bag_rec.sku || '-AUTO-' || (v_existing_count + v_i) || '-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 4);
                
                INSERT INTO product_serials (
                    product_id, 
                    serial_number, 
                    status, 
                    warehouse_id, 
                    movement_in_id,
                    created_at
                ) VALUES (
                    v_bag_rec.product_id, 
                    v_new_serial, 
                    'AVAILABLE', 
                    v_bag_rec.warehouse_id, 
                    v_movement_id,
                    NOW()
                );
            END LOOP;
        END IF;
    END LOOP;
END $$;
