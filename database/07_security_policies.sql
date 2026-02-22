-- ================================================
-- 7. Security Policies (RLS)
-- Re-enabling and configuring RLS for production readiness
-- ================================================

-- Enable RLS for all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE uoms ENABLE ROW LEVEL SECURITY;

-- Dynamic Policy Creation for all tables
-- This script creates a baseline policy allowing all access to authenticated users.
-- For production, replace 'authenticated' with more specific roles if needed.

DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
    LOOP
        -- Drop existing "Allow all access" if any
        EXECUTE format('DROP POLICY IF EXISTS "Enable all access for authenticated" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all access" ON %I', t);
        
        -- Create baseline policy for authenticated users
        EXECUTE format('CREATE POLICY "Enable all access for authenticated" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
        
        -- Also add one for anon for now IF the app hasn't implemented Auth yet
        -- Remove this block when Auth is enforced
        EXECUTE format('DROP POLICY IF EXISTS "Enable all access for anon" ON %I', t);
        EXECUTE format('CREATE POLICY "Enable all access for anon" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;
