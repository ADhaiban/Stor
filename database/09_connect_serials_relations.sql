-- ========================================================
-- TAWSEEL STORE - CONNECT PRODUCT SERIALS WITH RELATIONS
-- Establishes proper foreign key relationships and indexes
-- ========================================================

-- ============================================
-- 1. ADD MISSING FOREIGN KEY CONSTRAINTS
-- ============================================

-- Note: Most FK constraints already exist, but we'll ensure they're all there
-- Using IF NOT EXISTS checks by attempting to add them (will fail gracefully if exists)

-- Connection to Products (Already exists in 08_serialization_schema.sql)
-- ALTER TABLE product_serials 
--     ADD CONSTRAINT fk_serial_product 
--     FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- Connection to Warehouses (Already exists)
-- ALTER TABLE product_serials 
--     ADD CONSTRAINT fk_serial_warehouse 
--     FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL;

-- Connection to Locations (Already exists)
-- ALTER TABLE product_serials 
--     ADD CONSTRAINT fk_serial_location 
--     FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;

-- Connection to Stock Movements for Inbound (Already exists)
-- ALTER TABLE product_serials 
--     ADD CONSTRAINT fk_serial_movement_in 
--     FOREIGN KEY (movement_in_id) REFERENCES stock_movements(id) ON DELETE SET NULL;

-- Connection to Stock Movements for Outbound (Already exists)
-- ALTER TABLE product_serials 
--     ADD CONSTRAINT fk_serial_movement_out 
--     FOREIGN KEY (movement_out_id) REFERENCES stock_movements(id) ON DELETE SET NULL;


-- ============================================
-- 2. ADD PERFORMANCE INDEXES
-- ============================================

-- Index on product_id for fast lookups by product
CREATE INDEX IF NOT EXISTS idx_serials_product_id 
    ON product_serials(product_id);

-- Index on warehouse_id for warehouse-specific queries
CREATE INDEX IF NOT EXISTS idx_serials_warehouse_id 
    ON product_serials(warehouse_id);

-- Index on location_id for location-specific queries
CREATE INDEX IF NOT EXISTS idx_serials_location_id 
    ON product_serials(location_id);

-- Index on serial_number for fast serial lookup
CREATE INDEX IF NOT EXISTS idx_serials_serial_number 
    ON product_serials(serial_number);

-- Index on status for filtering by availability
CREATE INDEX IF NOT EXISTS idx_serials_status 
    ON product_serials(status);

-- Composite index for active serials by product in warehouse
CREATE INDEX IF NOT EXISTS idx_serials_product_warehouse_status 
    ON product_serials(product_id, warehouse_id, status) 
    WHERE is_deleted = FALSE;

-- Index for movement tracking
CREATE INDEX IF NOT EXISTS idx_serials_movement_in 
    ON product_serials(movement_in_id);

CREATE INDEX IF NOT EXISTS idx_serials_movement_out 
    ON product_serials(movement_out_id);


-- ============================================
-- 3. ADD HELPFUL VIEWS FOR SERIAL QUERIES
-- ============================================

-- View: Available Serials with Product Details
CREATE OR REPLACE VIEW v_available_serials AS
SELECT 
    ps.id as serial_id,
    ps.serial_number,
    p.id as product_id,
    p.sku,
    p.name as product_name,
    p.type as product_type,
    w.id as warehouse_id,
    w.name as warehouse_name,
    l.id as location_id,
    l.bin_code as location_code,
    ps.status,
    ps.created_at,
    ps.updated_at
FROM product_serials ps
INNER JOIN products p ON ps.product_id = p.id
LEFT JOIN warehouses w ON ps.warehouse_id = w.id
LEFT JOIN locations l ON ps.location_id = l.id
WHERE ps.is_deleted = FALSE 
  AND ps.status = 'AVAILABLE';

-- View: Serial Movement History
CREATE OR REPLACE VIEW v_serial_movement_history AS
SELECT 
    ps.id as serial_id,
    ps.serial_number,
    p.sku,
    p.name as product_name,
    sm_in.id as movement_in_id,
    sm_in.transaction_date as received_date,
    sm_in.type as receive_type,
    w_in.name as received_warehouse,
    sm_out.id as movement_out_id,
    sm_out.transaction_date as dispatched_date,
    sm_out.type as dispatch_type,
    w_out.name as dispatched_to,
    ps.status as current_status
FROM product_serials ps
INNER JOIN products p ON ps.product_id = p.id
LEFT JOIN stock_movements sm_in ON ps.movement_in_id = sm_in.id
LEFT JOIN warehouses w_in ON sm_in.warehouse_to_id = w_in.id
LEFT JOIN stock_movements sm_out ON ps.movement_out_id = sm_out.id
LEFT JOIN warehouses w_out ON sm_out.warehouse_from_id = w_out.id
WHERE ps.is_deleted = FALSE;

-- View: Serial Inventory Count by Product and Warehouse
CREATE OR REPLACE VIEW v_serial_inventory_count AS
SELECT 
    p.id as product_id,
    p.sku,
    p.name as product_name,
    w.id as warehouse_id,
    w.name as warehouse_name,
    ps.status,
    COUNT(ps.id) as serial_count
FROM products p
INNER JOIN product_serials ps ON p.id = ps.product_id
LEFT JOIN warehouses w ON ps.warehouse_id = w.id
WHERE ps.is_deleted = FALSE
GROUP BY p.id, p.sku, p.name, w.id, w.name, ps.status
ORDER BY p.name, w.name, ps.status;


-- ============================================
-- 4. ADD TRIGGER FOR UPDATED_AT TIMESTAMP
-- ============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_serial_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on product_serials
DROP TRIGGER IF EXISTS trigger_update_serial_timestamp ON product_serials;
CREATE TRIGGER trigger_update_serial_timestamp
    BEFORE UPDATE ON product_serials
    FOR EACH ROW
    EXECUTE FUNCTION update_serial_timestamp();


-- ============================================
-- 5. ADD VALIDATION CONSTRAINTS
-- ============================================

-- Ensure serial numbers are not empty
ALTER TABLE product_serials 
    ADD CONSTRAINT chk_serial_number_not_empty 
    CHECK (LENGTH(TRIM(serial_number)) > 0);

-- Ensure valid status values
ALTER TABLE product_serials 
    ADD CONSTRAINT chk_serial_status_valid 
    CHECK (status IN ('AVAILABLE', 'SOLD', 'RESERVED', 'DAMAGED', 'RETURNED'));

-- Ensure product must be marked as serialized
-- Note: This is a soft check via application logic, not enforced at DB level to allow flexibility


-- ============================================
-- 6. ADD UTILITY FUNCTIONS
-- ============================================

-- Function: Get serial count by product
CREATE OR REPLACE FUNCTION get_serial_count(p_product_id UUID, p_status VARCHAR DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF p_status IS NULL THEN
        SELECT COUNT(*) INTO v_count
        FROM product_serials
        WHERE product_id = p_product_id
          AND is_deleted = FALSE;
    ELSE
        SELECT COUNT(*) INTO v_count
        FROM product_serials
        WHERE product_id = p_product_id
          AND status = p_status
          AND is_deleted = FALSE;
    END IF;
    
    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function: Check if serial exists
CREATE OR REPLACE FUNCTION serial_exists(p_product_id UUID, p_serial_number VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 
        FROM product_serials 
        WHERE product_id = p_product_id 
          AND serial_number = p_serial_number
          AND is_deleted = FALSE
    ) INTO v_exists;
    
    RETURN v_exists;
END;
$$ LANGUAGE plpgsql;

-- Function: Update serial status
CREATE OR REPLACE FUNCTION update_serial_status(
    p_serial_id UUID,
    p_new_status VARCHAR,
    p_movement_out_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE product_serials
    SET status = p_new_status,
        movement_out_id = COALESCE(p_movement_out_id, movement_out_id),
        updated_at = NOW()
    WHERE id = p_serial_id
      AND is_deleted = FALSE;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 7. GRANT PERMISSIONS (Matching existing pattern)
-- ============================================

-- Grant access to views
GRANT SELECT ON v_available_serials TO anon, authenticated;
GRANT SELECT ON v_serial_movement_history TO anon, authenticated;
GRANT SELECT ON v_serial_inventory_count TO anon, authenticated;


-- ============================================
-- 8. REFRESH SCHEMA CACHE
-- ============================================

NOTIFY pgrst, 'reload schema';

-- ============================================
-- SETUP COMPLETE
-- ============================================
-- The product_serials table is now fully connected with:
-- ✅ products (parent relationship)
-- ✅ warehouses (location tracking)
-- ✅ locations (bin-level tracking)
-- ✅ stock_movements (inbound & outbound tracking)
-- ✅ Performance indexes for fast queries
-- ✅ Helpful views for common queries
-- ✅ Utility functions for serial management
-- ============================================
