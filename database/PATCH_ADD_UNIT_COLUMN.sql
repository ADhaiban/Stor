-- ================================================
-- PATCH: Add unit column to products table
-- Fixes: "Could not find the 'unit' column of 'products' in the schema cache"
-- ================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'unit';

-- To refresh the Supabase schema cache after running this:
-- 1. Go to Supabase Dashboard -> Settings -> API
-- 2. Click "Save" on the bottom (or run `NOTIFY pgrst, 'reload schema'`)
-- Or just run this in SQL Editor:
NOTIFY pgrst, 'reload schema';
