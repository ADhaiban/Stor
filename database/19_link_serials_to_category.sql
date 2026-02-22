-- 19_link_serials_to_category.sql

-- ========================================================
-- 1. ADD RELATIONSHIP TO CATEGORY IN SERIALS TABLE
-- ========================================================

-- A. Add category_id column (linking by UUID)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_serials' AND column_name='category_id') THEN
        ALTER TABLE product_serials ADD COLUMN category_id UUID REFERENCES product_categories(id);
    END IF;
END $$;

-- B. Backfill category_id from the products table
UPDATE product_serials ps
SET category_id = p.category_id
FROM products p
WHERE ps.product_id = p.id;

-- ========================================================
-- 2. RESOLVE DUPLICATE SERIALS WITHIN THE SAME CATEGORY
-- ========================================================
-- This ensures that no category has the same serial number twice, 
-- even if they belong to different products (as requested).
WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY category_id, serial_number ORDER BY created_at DESC) as r
    FROM product_serials
)
DELETE FROM product_serials WHERE id IN (SELECT id FROM duplicates WHERE r > 1);

-- ========================================================
-- 3. ENFORCE UNIQUE CONSTRAINT (CATEGORY + SERIAL_NUMBER)
-- ========================================================

-- Drop the old per-product constraint
ALTER TABLE product_serials DROP CONSTRAINT IF EXISTS unique_product_serial;
-- Drop if old category constraint exists from a failed run
ALTER TABLE product_serials DROP CONSTRAINT IF EXISTS unique_category_serial;

-- Add the new per-category constraint
ALTER TABLE product_serials ADD CONSTRAINT unique_category_serial UNIQUE(category_id, serial_number);

-- ========================================================
-- 4. UPDATE FUNCTIONS TO SUPPORT NEW LOGIC
-- ========================================================

-- A. Update Bulk Generation Function
CREATE OR REPLACE FUNCTION generate_product_serials(
    p_product_id UUID,
    p_warehouse_id UUID,
    p_movement_id UUID,
    p_start_number BIGINT,
    p_prefix VARCHAR(50),
    p_suffix VARCHAR(50),
    p_quantity INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_i INTEGER;
    v_serial_text VARCHAR(100);
    v_category_id UUID;
BEGIN
    -- Get the category_id from the product
    SELECT category_id INTO v_category_id FROM products WHERE id = p_product_id;

    FOR v_i IN 0..(p_quantity - 1) LOOP
        -- Strictly numeric as per previous requirement
        v_serial_text := (p_start_number + v_i)::VARCHAR;
        
        INSERT INTO product_serials (
            product_id, 
            category_id,
            serial_number, 
            status,
            warehouse_id, 
            movement_in_id
        ) VALUES (
            p_product_id, 
            v_category_id,
            v_serial_text, 
            'AVAILABLE',
            p_warehouse_id, 
            p_movement_id
        ) ON CONFLICT (category_id, serial_number) DO NOTHING;
        
        IF FOUND THEN
            v_count := v_count + 1;
        END IF;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- B. Update Bag Registration Function
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
    -- Get category_id
    SELECT category_id INTO v_category_id FROM products WHERE id = p_product_id;

    -- NEW: Check if serial exists in this CATEGORY (regardless of product)
    IF EXISTS (SELECT 1 FROM product_serials WHERE serial_number = p_serial_number AND category_id = v_category_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'رقم السيريال مسجل مسبقاً في هذه الفئة');
    END IF;

    -- Create IN Movement
    INSERT INTO stock_movements (
        type, product_id, product_name, warehouse_to_id, quantity, unit_cost, 
        user_id, notes, transaction_date
    ) 
    SELECT 
        'IN', p_product_id, name, p_warehouse_id, 1, current_wac_cost, 
        p_user_id, p_notes, NOW()
    FROM products WHERE id = p_product_id
    RETURNING id INTO v_movement_id;

    -- Create Serial with category_id
    INSERT INTO product_serials (
        product_id, category_id, serial_number, status, warehouse_id, movement_in_id
    ) VALUES (
        p_product_id, v_category_id, p_serial_number, 'AVAILABLE', p_warehouse_id, v_movement_id
    ) RETURNING id INTO v_serial_id;

    RETURN jsonb_build_object('success', true, 'serial_id', v_serial_id);
END;
$$ LANGUAGE plpgsql;
