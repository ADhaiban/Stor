-- ========================================================
-- FIX SUPABASE PERMISSIONS (RLS)
-- Run this in your Supabase SQL Editor if you get "Error saving"
-- ========================================================

-- Disable Row Level Security for all tables to allow the app to work during development
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses DISABLE ROW LEVEL SECURITY;
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE financial_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE batches DISABLE ROW LEVEL SECURITY;

-- Alternative: If you want to keep RLS on, run this one instead to allow all access:
-- CREATE POLICY "Allow all access" ON products FOR ALL USING (true);
-- ... (repeat for each table)
