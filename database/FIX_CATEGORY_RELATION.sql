-- ========================================================
-- FIX CATEGORY TABLE AND CONSTRAINTS
-- ========================================================

-- 1. Create Product Categories Table
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Drop the old (incorrect) constraint on products if it exists
-- We previously pointed category_id to departments(id) by mistake
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_id_fkey;

-- 3. Link category_id to the NEW table
ALTER TABLE products 
ADD CONSTRAINT products_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES product_categories(id);

-- 4. Seed some categories
INSERT INTO product_categories (name) VALUES 
('Electronics'), 
('Furniture'), 
('Consumables')
ON CONFLICT (name) DO NOTHING;
