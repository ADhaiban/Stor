-- 18_robust_serial_fix_and_numeric_enforcement.sql

-- ========================================================
-- 1. CLEAN AND FIX EXISTING DATA (Deduplication + Numeric Only)
-- ========================================================

-- A. Create a temporary table to store cleaned data
CREATE TEMP TABLE cleaned_serials AS
SELECT 
    id,
    product_id,
    regexp_replace(serial_number, '[^0-9]', '', 'g') as new_serial,
    created_at
FROM product_serials;

-- B. Handle conflicts within the same product (Duplicate IDs after cleaning)
-- Logic: If multiple serials for the same product result in the same number, keep the latest one.
WITH duplicates_to_delete AS (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY product_id, new_serial ORDER BY created_at DESC) as r
        FROM cleaned_serials
    ) t WHERE r > 1
)
DELETE FROM product_serials WHERE id IN (SELECT id FROM duplicates_to_delete);

-- C. Apply the cleaning to the main table
UPDATE product_serials ps
SET serial_number = c.new_serial
FROM cleaned_serials c
WHERE ps.id = c.id AND c.new_serial != ''; -- Don't set empty strings if regex cleared everything

-- D. Remove any records where cleaning resulted in empty string (invalid)
DELETE FROM product_serials WHERE serial_number = '';

-- ========================================================
-- 2. UPDATE RPC TO BE NUMERIC ONLY (REMOVE PREFIX/SUFFIX)
-- ========================================================

CREATE OR REPLACE FUNCTION generate_product_serials(
    p_product_id UUID,
    p_warehouse_id UUID,
    p_movement_id UUID,
    p_start_number BIGINT,
    p_prefix VARCHAR(50), -- Kept for signature compatibility but ignored
    p_suffix VARCHAR(50), -- Kept for signature compatibility but ignored
    p_quantity INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_i INTEGER;
    v_serial_text VARCHAR(100);
BEGIN
    FOR v_i IN 0..(p_quantity - 1) LOOP
        -- Strictly numeric generation
        v_serial_text := (p_start_number + v_i)::VARCHAR;
        
        INSERT INTO product_serials (
            product_id, 
            serial_number, 
            status,
            warehouse_id, 
            movement_in_id
        ) VALUES (
            p_product_id, 
            v_serial_text, 
            'AVAILABLE',
            p_warehouse_id, 
            p_movement_id
        ) ON CONFLICT (product_id, serial_number) DO NOTHING;
        
        IF FOUND THEN
            v_count := v_count + 1;
        END IF;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================================
-- 3. FIX GENERATION LOGIC FOR MISSING BAGS (BAG COLLISION)
-- ========================================================

DO $$
DECLARE
    v_bag_rec RECORD;
    v_max_serial BIGINT;
    v_needed INTEGER;
    v_next_serial BIGINT;
    v_movement_id UUID;
    v_i INTEGER; 
    v_cat_str VARCHAR := 'شنط';
BEGIN
    FOR v_bag_rec IN 
        SELECT 
            i.product_id, i.warehouse_id, i.quantity_on_hand,
            p.sku
        FROM inventory_stock i
        JOIN products p ON i.product_id = p.id
        JOIN product_categories c ON p.category_id = c.id
        WHERE c.name = v_cat_str AND i.quantity_on_hand > 0
    LOOP
        -- Find current REAL max serial (numeric) for this product
        SELECT MAX(CAST(serial_number AS BIGINT)) INTO v_max_serial 
        FROM product_serials 
        WHERE product_id = v_bag_rec.product_id 
          AND serial_number ~ '^[0-9]+$'; 

        v_max_serial := COALESCE(v_max_serial, 1000); -- Start at 1001 if none exist
        
        -- Current available serials count
        SELECT COUNT(*) INTO v_i 
        FROM product_serials 
        WHERE product_id = v_bag_rec.product_id 
          AND status = 'AVAILABLE';
        
        v_needed := v_bag_rec.quantity_on_hand::INTEGER - v_i;
        
        IF v_needed > 0 THEN
            -- Find latest IN movement
            SELECT id INTO v_movement_id FROM stock_movements 
            WHERE product_id = v_bag_rec.product_id AND type IN ('IN', 'TRANSFER', 'ADJUSTMENT_IN')
            ORDER BY transaction_date DESC LIMIT 1;
            
            v_next_serial := v_max_serial + 1;
            
            FOR v_i IN 1..v_needed LOOP
                -- Keep incrementing until we find a free number (safety check)
                WHILE EXISTS (SELECT 1 FROM product_serials WHERE product_id = v_bag_rec.product_id AND serial_number = v_next_serial::TEXT) LOOP
                    v_next_serial := v_next_serial + 1;
                END WHILE;

                INSERT INTO product_serials (
                    product_id, serial_number, status, warehouse_id, movement_in_id, created_at
                ) VALUES (
                    v_bag_rec.product_id, v_next_serial::TEXT, 'AVAILABLE', v_bag_rec.warehouse_id, v_movement_id, NOW()
                );
                
                v_next_serial := v_next_serial + 1;
            END LOOP;
        END IF;
    END LOOP;
END $$;
