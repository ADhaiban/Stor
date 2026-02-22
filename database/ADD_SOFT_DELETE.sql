-- ========================================================
-- ADD SOFT DELETE SUPPORT
-- ========================================================

-- 1. Helper Function to add is_deleted column if missing
CREATE OR REPLACE FUNCTION add_soft_delete_column(tblreg regclass) RETURNS void AS $$
BEGIN
    EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE', tblreg);
END;
$$ LANGUAGE plpgsql;

-- 2. Add 'is_deleted' to all key tables
SELECT add_soft_delete_column('products');
SELECT add_soft_delete_column('warehouses');
SELECT add_soft_delete_column('departments');
SELECT add_soft_delete_column('product_categories');
SELECT add_soft_delete_column('uoms');
SELECT add_soft_delete_column('vendors');
SELECT add_soft_delete_column('clients');
-- Movements should generally not be deleted, but voided. For now we skip them.

-- 3. Update Policies/Views? 
-- For MVP, we will just filter them out in the API call "SELECT * FROM x WHERE is_deleted = false"
