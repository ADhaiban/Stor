-- 16_fix_inventory_and_generate_bag_serials.sql

-- ========================================================
-- 1. Fix Inventory Stock View (Aggregation & Transfer Logic)
-- ========================================================

DROP VIEW IF EXISTS inventory_stock;

CREATE OR REPLACE VIEW inventory_stock AS
WITH movements AS (
    -- Incoming Stock (Add)
    SELECT 
        product_id, 
        warehouse_to_id AS warehouse_id, 
        quantity 
    FROM stock_movements 
    WHERE type IN ('IN', 'ADJUSTMENT_IN', 'RETURN', 'TRANSFER') -- Added TRANSFER here
      AND warehouse_to_id IS NOT NULL

    UNION ALL

    -- Outgoing Stock (Deduct)
    SELECT 
        product_id, 
        warehouse_from_id AS warehouse_id, 
        -quantity 
    FROM stock_movements 
    WHERE type IN ('OUT', 'ADJUSTMENT_OUT', 'TRANSFER')
      AND warehouse_from_id IS NOT NULL
)
SELECT 
    m.product_id,
    p.name AS product_name,
    p.sku,
    c.name AS category_name,
    m.warehouse_id,
    w.name AS warehouse_name,
    SUM(m.quantity) AS quantity,
    0 AS quantity_reserved -- Placeholder for now if needed
FROM movements m
JOIN products p ON m.product_id = p.id
LEFT JOIN product_categories c ON p.category_id = c.id
LEFT JOIN warehouses w ON m.warehouse_id = w.id
WHERE m.warehouse_id IS NOT NULL
GROUP BY m.product_id, p.name, p.sku, c.name, m.warehouse_id, w.name
HAVING SUM(m.quantity) <> 0; -- Optional: Hide zero balances

-- ========================================================
-- 2. Auto-Generate Serials for Existing Bags
-- ========================================================

DO $$
DECLARE
    v_bag_category_id UUID;
    v_bag_rec RECORD;
    v_existing_serials_count INTEGER;
    v_serial_needed INTEGER;
    v_new_serial VARCHAR;
    v_movement_id UUID;
    v_counter INTEGER;
BEGIN
    -- Get 'شنط' Category ID
    SELECT id INTO v_bag_category_id FROM product_categories WHERE name = 'شنط';
    
    -- If no exact match, try 'Delivery Bags' or similar, or skip
    IF v_bag_category_id IS NULL THEN
        RAISE NOTICE 'Category "شنط" not found, skipping serial generation.';
        RETURN;
    END IF;

    -- Loop through all Bag Products with positive inventory
    FOR v_bag_rec IN 
        SELECT * FROM inventory_stock 
        WHERE quantity > 0 AND category_name = 'شنط' -- Relies on view having correct category name
    LOOP
        -- Count existing serials for this product
        SELECT COUNT(*) INTO v_existing_serials_count 
        FROM product_serials 
        WHERE product_id = v_bag_rec.product_id;

        -- Calculate how many missing
        v_serial_needed := v_bag_rec.quantity - v_existing_serials_count;

        IF v_serial_needed > 0 THEN
            RAISE NOTICE 'Generating % serials for %', v_serial_needed, v_bag_rec.sku;
            
            -- Create a "Migration" movement to link these serials to (historical)
            -- We just pick the latest IN movement for this product/warehouse as a proxy, 
            -- or create a dummy one if none exists.
            SELECT id INTO v_movement_id 
            FROM stock_movements 
            WHERE product_id = v_bag_rec.product_id 
              AND warehouse_to_id = v_bag_rec.warehouse_id 
              AND type = 'IN' 
            ORDER BY transaction_date DESC LIMIT 1;
            
            -- Start counter
            v_counter := 1;
            
            WHILE v_counter <= v_serial_needed LOOP
                -- Generate unique serial: SKU-SEQ-RANDOM
                v_new_serial := v_bag_rec.sku || '-' || (v_existing_serials_count + v_counter) || '-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 4);
                
                -- Insert Serial
                INSERT INTO product_serials (
                    product_id, 
                    serial_number, 
                    status, 
                    warehouse_id, 
                    movement_in_id
                ) VALUES (
                    v_bag_rec.product_id, 
                    v_new_serial, 
                    'AVAILABLE', 
                    v_bag_rec.warehouse_id, 
                    v_movement_id -- Can be NULL if no movement found
                );
                
                v_counter := v_counter + 1;
            END LOOP;
        END IF;
    END LOOP;
END $$;
