-- ========================================================
-- UPDATE PRODUCTS TABLE WITH NEW FIELDS
-- ========================================================

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES departments(id), -- or categories if we had a table
ADD COLUMN IF NOT EXISTS preferred_vendor_id UUID REFERENCES vendors(id),
ADD COLUMN IF NOT EXISTS default_warehouse_id UUID REFERENCES warehouses(id),
ADD COLUMN IF NOT EXISTS default_department_id UUID REFERENCES departments(id);

-- Note: category_id is pointing to departments for now as we don't have a separate categories table in schema,
-- but the user has a "categories" concept in frontend. 
-- In a real scenario, we might want a 'product_categories' table.
