-- ========================================================
-- TAWSEEL STORE - ADD SERIALIZATION FEATURE
-- Run this AFTER the main schema is created
-- ========================================================

-- Step 1: Add 'is_serialized' column to products table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'is_serialized'
    ) THEN
        ALTER TABLE products ADD COLUMN is_serialized BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Step 2: Create Serial Numbers Table
CREATE TABLE IF NOT EXISTS product_serials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    serial_number VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'AVAILABLE',
    warehouse_id UUID REFERENCES warehouses(id),
    location_id UUID REFERENCES locations(id),
    movement_in_id UUID REFERENCES stock_movements(id),
    movement_out_id UUID REFERENCES stock_movements(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_product_serial UNIQUE(product_id, serial_number)
);

-- Step 3: Create function to bulk generate serials
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
        ) ON CONFLICT (product_id, serial_number) DO NOTHING;
        
        IF FOUND THEN
            v_count := v_count + 1;
        END IF;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Disable RLS for development
ALTER TABLE product_serials DISABLE ROW LEVEL SECURITY;

-- Step 5: Create index for performance
CREATE INDEX IF NOT EXISTS idx_product_serials_product ON product_serials(product_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_product_serials_status ON product_serials(status) WHERE is_deleted = FALSE;

-- Refresh cache
NOTIFY pgrst, 'reload schema';
