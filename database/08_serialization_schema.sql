-- ========================================================
-- TAWSEEL STORE - SERIALIZATION FEATURE
-- Adds support for tracking individual items by serial numbers
-- ========================================================

-- 1. Create Serial Numbers Table
CREATE TABLE IF NOT EXISTS product_serials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    serial_number VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'AVAILABLE', -- AVAILABLE, SOLD, RESERVED, DAMAGED
    warehouse_id UUID REFERENCES warehouses(id),
    location_id UUID REFERENCES locations(id),
    movement_in_id UUID REFERENCES stock_movements(id), -- Link to the receipt movement
    movement_out_id UUID REFERENCES stock_movements(id), -- Link to the dispatch movement
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure serial number is unique per product
    CONSTRAINT unique_product_serial UNIQUE(product_id, serial_number)
);

-- 2. Add function to bulk generate serials
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
BEGIN
    FOR v_i IN 0..(p_quantity - 1) LOOP
        v_serial_text := COALESCE(p_prefix, '') || (p_start_number + v_i)::VARCHAR || COALESCE(p_suffix, '');
        
        INSERT INTO product_serials (
            product_id, 
            serial_number, 
            warehouse_id, 
            movement_in_id
        ) VALUES (
            p_product_id, 
            v_serial_text, 
            p_warehouse_id, 
            p_movement_id
        ) ON CONFLICT DO NOTHING;
        
        IF FOUND THEN
            v_count := v_count + 1;
        END IF;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 3. Update RLS (Disable for development as requested before)
ALTER TABLE product_serials DISABLE ROW LEVEL SECURITY;

-- 4. Refresh Cache
NOTIFY pgrst, 'reload schema';
