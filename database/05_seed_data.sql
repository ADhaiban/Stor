-- ================================================
-- 5. Seed Data (Mock Data for Testing)
-- ================================================

-- 1. Departments
INSERT INTO departments (id, name, cost_center_code, budget_cap) VALUES
(gen_random_uuid(), 'العمليات', 'OPS-001', 50000.00),
(gen_random_uuid(), 'المبيعات', 'SAL-001', 20000.00),
(gen_random_uuid(), 'تقنية المعلومات', 'IT-001', 15000.00);

-- 2. Warehouses
INSERT INTO warehouses (id, name, location_address, is_active) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'المستودع الرئيسي', 'الرياض - المنطقة الصناعية', TRUE),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'مستودع الشرقية', 'الدمام - الميناء', TRUE);

-- 3. Locations (Zones)
INSERT INTO locations (id, warehouse_id, zone, aisle, rack, bin_code) VALUES
(gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'A', '1', '1', 'A-1-1-01'),
(gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'A', '1', '2', 'A-1-2-01'),
(gen_random_uuid(), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'B', '1', '1', 'B-1-1-01');

-- 4. Products
INSERT INTO products (id, sku, name, description, type, min_reorder_level, current_wac_cost) VALUES
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'iphone-15-pro', 'iPhone 15 Pro 256GB', 'Apple Smartphone', 'RESALE', 10, 4200.00),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'samsung-s24', 'Samsung S24 Ultra', 'Samsung Smartphone', 'RESALE', 5, 3800.00),
(gen_random_uuid(), 'paper-a4', 'ورق طباعة A4', 'كرتون 500 ورقة', 'CONSUMABLE', 20, 15.00);

-- 5. Vendors
INSERT INTO vendors (id, vendor_code, name, contact_person, phone, payment_terms, cash_percentage, commission_per_unit) VALUES
(gen_random_uuid(), 'VEN-001', 'شركة التوريدات المتحدة', 'أحمد محمد', '+966501234567', 'HYBRID_SALES_LINKED', 30.00, 5.00),
(gen_random_uuid(), 'VEN-002', 'مؤسسة الإمدادات الحديثة', 'خالد عبدالله', '+966502345678', 'CREDIT', NULL, NULL);

-- 6. Clients
INSERT INTO clients (id, client_code, name, contact_person, phone, gps_location, category, collection_period_days, credit_limit) VALUES
(gen_random_uuid(), 'CLI-001', 'سوبر ماركت النخيل', 'فهد السعيد', '+966504567890', '24.7136,46.6753', 'Retail', 15, 50000.00),
(gen_random_uuid(), 'CLI-002', 'مجموعة الرياض التجارية', 'سعد المطيري', '+966505678901', '24.7500,46.7000', 'Wholesale', 30, 150000.00);

-- 7. Initial Inventory (Stock-In)
-- Adding stock for iPhone in Main Warehouse
INSERT INTO inventory_stock (id, warehouse_id, product_id, quantity_on_hand, quantity_reserved) VALUES
(gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 50, 0),
(gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 30, 0);
