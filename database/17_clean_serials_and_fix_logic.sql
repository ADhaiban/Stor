-- 17_clean_serials_and_fix_logic.sql

-- ========================================================
-- 1. Sanitize Existing Serials (Numbers Only)
-- ========================================================

-- A. Clean non-numeric characters from all serials
UPDATE product_serials 
SET serial_number = regexp_replace(serial_number, '[^0-9]', '', 'g')
WHERE serial_number ~ '[^0-9]';

-- B. Remove Duplicates (Keeping the newest one)
DELETE FROM product_serials ps1
WHERE ps1.id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY product_id, serial_number ORDER BY created_at DESC) as row_num
        FROM product_serials
    ) t
    WHERE t.row_num > 1
);

-- C. Add Constraint to prevent non-numeric serials in future (Optional but recommended)
-- ALTER TABLE product_serials ADD CONSTRAINT serial_numeric_only CHECK (serial_number ~ '^[0-9]+$');
-- Note: Commented out in case some existing business logic still needs strings, but cleaning is done.

-- ========================================================
-- 2. Corrected Auto-Generate Script (Fixes column i.category_name error)
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
    -- We loop through inventory_stock but join with products to get category name correctly
    -- if inventory_stock is a table and doesn't have category_name.
    FOR v_bag_rec IN 
        SELECT 
            i.product_id, 
            i.warehouse_id, 
            i.quantity_on_hand,
            p.sku,
            w.name as warehouse_name
        FROM inventory_stock i
        JOIN products p ON i.product_id = p.id
        JOIN product_categories c ON p.category_id = c.id
        JOIN warehouses w ON i.warehouse_id = w.id
        WHERE c.name = v_cat_str AND i.quantity_on_hand > 0
    LOOP
        -- Count existing numeric serials
        SELECT COUNT(*) INTO v_existing_count 
        FROM product_serials 
        WHERE product_id = v_bag_rec.product_id 
          AND warehouse_id = v_bag_rec.warehouse_id
          AND status = 'AVAILABLE'; 
        
        v_needed := v_bag_rec.quantity_on_hand::INTEGER - v_existing_count;
        
        IF v_needed > 0 THEN
            RAISE NOTICE 'Generating % numeric serials for % at %', v_needed, v_bag_rec.sku, v_bag_rec.warehouse_name;
            
            -- Find latest IN movement to link
            SELECT id INTO v_movement_id 
            FROM stock_movements 
            WHERE product_id = v_bag_rec.product_id 
              AND warehouse_to_id = v_bag_rec.warehouse_id 
              AND type IN ('IN', 'TRANSFER', 'ADJUSTMENT_IN')
            ORDER BY transaction_date DESC LIMIT 1;
            
            FOR v_i IN 1..v_needed LOOP
                -- Generate unique numeric serial: SKU-numeric-random (digits only)
                -- We'll use a sequence starting from 1000 + existing
                v_new_serial := (10000 + v_existing_count + v_i)::TEXT;
                
                -- Ensure uniqueness in the loop
                WHILE EXISTS (SELECT 1 FROM product_serials WHERE serial_number = v_new_serial AND product_id = v_bag_rec.product_id) LOOP
                    v_new_serial := (v_new_serial::BIGINT + 1)::TEXT;
                END WHILE;

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
