-- ================================================================
-- TAWSEEL STORE - COMPREHENSIVE SEED DATA
-- Covers all UI lists and test scenarios
-- Target schema: COMPLETE_DATABASE_SETUP.sql
-- ================================================================

BEGIN;

-- ================================================================
-- 0) CLEANUP (ordered to respect FK dependencies)
-- ================================================================

TRUNCATE TABLE stock_issue_requests CASCADE;
TRUNCATE TABLE inventory_beneficiaries CASCADE;

TRUNCATE TABLE user_permissions CASCADE;
TRUNCATE TABLE role_permissions CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE roles CASCADE;
TRUNCATE TABLE module_actions CASCADE;
TRUNCATE TABLE actions CASCADE;
TRUNCATE TABLE modules CASCADE;

TRUNCATE TABLE financial_ledger CASCADE;
TRUNCATE TABLE product_serials CASCADE;
TRUNCATE TABLE stock_movements CASCADE;
TRUNCATE TABLE purchase_order_items CASCADE;
TRUNCATE TABLE purchase_orders CASCADE;
TRUNCATE TABLE batches CASCADE;
TRUNCATE TABLE inventory_stock CASCADE;

TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE clients CASCADE;
TRUNCATE TABLE vendors CASCADE;
TRUNCATE TABLE locations CASCADE;
TRUNCATE TABLE warehouses CASCADE;
TRUNCATE TABLE departments CASCADE;
TRUNCATE TABLE product_categories CASCADE;
TRUNCATE TABLE uoms CASCADE;

-- ================================================================
-- 1) MASTER DATA
-- ================================================================

-- UOMs
INSERT INTO uoms (id, name, symbol, is_deleted) VALUES
('60000000-0000-0000-0000-000000000001', 'Piece', 'pc', FALSE),
('60000000-0000-0000-0000-000000000002', 'Carton', 'ctn', FALSE),
('60000000-0000-0000-0000-000000000003', 'Box', 'box', FALSE);

-- Product Categories
INSERT INTO product_categories (id, name, is_deleted) VALUES
('50000000-0000-0000-0000-000000000001', 'Smartphones', FALSE),
('50000000-0000-0000-0000-000000000002', 'Accessories', FALSE),
('50000000-0000-0000-0000-000000000003', 'Office Consumables', FALSE);

-- Departments
INSERT INTO departments (id, name, cost_center_code, budget_cap, is_deleted) VALUES
('10000000-0000-0000-0000-000000000001', 'Operations', 'OPS-001', 50000.00, FALSE),
('10000000-0000-0000-0000-000000000002', 'Sales', 'SAL-001', 20000.00, FALSE),
('10000000-0000-0000-0000-000000000003', 'Information Technology', 'IT-001', 15000.00, FALSE);

-- Warehouses
INSERT INTO warehouses (id, name, location_address, is_active, is_deleted) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Main Warehouse', 'Riyadh - Industrial Area', TRUE, FALSE),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'East Warehouse', 'Dammam - Port Road', TRUE, FALSE),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Qassim Warehouse', 'Buraidah - Ring Road', TRUE, FALSE);

-- Locations
INSERT INTO locations (id, warehouse_id, zone, aisle, rack, bin_code, is_deleted) VALUES
('20000000-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'A', '1', '1', 'A-1-1-01', FALSE),
('20000000-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'A', '1', '2', 'A-1-2-01', FALSE),
('20000000-0000-0000-0000-000000000003', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'B', '1', '1', 'B-1-1-01', FALSE),
('20000000-0000-0000-0000-000000000004', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'B', '1', '2', 'B-1-2-01', FALSE),
('20000000-0000-0000-0000-000000000005', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'C', '1', '1', 'C-1-1-01', FALSE),
('20000000-0000-0000-0000-000000000006', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'C', '1', '2', 'C-1-2-01', FALSE);

-- Vendors
INSERT INTO vendors (
    id, vendor_code, name, contact_person, phone, address, tax_id,
    payment_terms, current_balance, credit_limit, cash_percentage, commission_per_unit,
    is_active, is_deleted
) VALUES
('30000000-0000-0000-0000-000000000001', 'VEN-001', 'United Supplies Co.', 'Ahmed Ali', '+966501234567', 'Riyadh', '300123456789', 'HYBRID_SALES_LINKED', 210000.00, 500000.00, 30.00, 5.00, TRUE, FALSE),
('30000000-0000-0000-0000-000000000002', 'VEN-002', 'Modern Logistics Est.', 'Khalid Saeed', '+966502345678', 'Jeddah', '300987654321', 'CREDIT', 114000.00, 300000.00, NULL, NULL, TRUE, FALSE),
('30000000-0000-0000-0000-000000000003', 'VEN-003', 'Fast Import Hub', 'Mohammed Fahad', '+966503456789', 'Dammam', '300456789123', 'CASH', 0.00, NULL, NULL, NULL, TRUE, FALSE);

-- Clients
INSERT INTO clients (
    id, client_code, name, contact_person, phone, gps_location, category,
    collection_period_days, current_balance, credit_limit, is_active, is_deleted
) VALUES
('40000000-0000-0000-0000-000000000001', 'CLI-001', 'Al Nakheel Supermarket', 'Fahad Saeed', '+966504567890', '24.7136,46.6753', 'Retail', 15, 42000.00, 50000.00, TRUE, FALSE),
('40000000-0000-0000-0000-000000000002', 'CLI-002', 'Riyadh Trading Group', 'Saad Motairi', '+966505678901', '24.7500,46.7000', 'Wholesale', 30, 0.00, 150000.00, TRUE, FALSE),
('40000000-0000-0000-0000-000000000003', 'CLI-003', 'Madinah Grocery', 'Abdulrahman Qahtani', '+966506789012', '24.4672,39.6116', 'Retail', 10, 15000.00, 30000.00, TRUE, FALSE);

-- Products (includes operational items for drivers/employees)
INSERT INTO products (
    id, sku, name, description, type, min_reorder_level, is_serialized, is_batch_tracked,
    current_wac_cost, unit, category_id, preferred_vendor_id, default_warehouse_id, default_department_id, is_deleted
) VALUES
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'iphone-15-pro', 'iPhone 15 Pro 256GB', 'Apple Smartphone', 'RESALE', 10, TRUE, FALSE, 4200.00, 'pc', '50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '10000000-0000-0000-0000-000000000002', FALSE),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'samsung-s24', 'Samsung S24 Ultra', 'Samsung Smartphone', 'RESALE', 5, TRUE, FALSE, 3800.00, 'pc', '50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '10000000-0000-0000-0000-000000000002', FALSE),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'paper-a4-box', 'A4 Paper Box', 'Carton of 5000 sheets', 'CONSUMABLE', 20, FALSE, TRUE, 150.00, 'box', '50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', '10000000-0000-0000-0000-000000000001', FALSE),
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'uniform-kit', 'Uniform Kit', 'Driver uniform set', 'CONSUMABLE', 30, FALSE, FALSE, 120.00, 'set', '50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '10000000-0000-0000-0000-000000000001', FALSE),
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'delivery-bag', 'Delivery Bag', 'Bag for delivery riders', 'ASSET', 20, TRUE, FALSE, 180.00, 'pc', '50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '10000000-0000-0000-0000-000000000001', FALSE),
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'employee-custody-pack', 'Employee Consumable Pack', 'Internal consumable custody package', 'CONSUMABLE', 40, FALSE, FALSE, 75.00, 'set', '50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', '10000000-0000-0000-0000-000000000003', FALSE);

-- Inventory Stock
INSERT INTO inventory_stock (id, warehouse_id, location_id, product_id, quantity_on_hand, quantity_reserved) VALUES
('60000000-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '20000000-0000-0000-0000-000000000001', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 40, 5),
('60000000-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '20000000-0000-0000-0000-000000000002', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 30, 0),
('60000000-0000-0000-0000-000000000003', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', '20000000-0000-0000-0000-000000000003', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 100, 10),
('60000000-0000-0000-0000-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '20000000-0000-0000-0000-000000000001', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 60, 0),
('60000000-0000-0000-0000-000000000005', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '20000000-0000-0000-0000-000000000002', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 25, 2),
('60000000-0000-0000-0000-000000000006', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', '20000000-0000-0000-0000-000000000005', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 80, 4);

-- Batches
INSERT INTO batches (id, product_id, batch_number, expiry_date, quantity, created_at) VALUES
('70000000-0000-0000-0000-000000000001', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'BATCH-2026-001', '2027-12-31', 100, NOW() - INTERVAL '10 days'),
('70000000-0000-0000-0000-000000000002', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'BATCH-2026-002', '2028-01-15', 50, NOW() - INTERVAL '7 days'),
('70000000-0000-0000-0000-000000000003', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'BATCH-2026-003', '2028-02-28', 75, NOW() - INTERVAL '3 days');

-- Purchase Orders (for inbound purchasing flow)
INSERT INTO purchase_orders (
    id, po_number, vendor_id, order_date, expected_date, status, notes, total_amount, created_by, approved_by, approved_at
) VALUES
('91000000-0000-0000-0000-000000000001', 'PO-2026-1001', '30000000-0000-0000-0000-000000000001', CURRENT_DATE - 5, CURRENT_DATE + 3, 'APPROVED', 'Smartphone replenishment for main warehouse', 123000.00, 'SYSTEM', 'SYSTEM', NOW() - INTERVAL '4 days'),
('91000000-0000-0000-0000-000000000002', 'PO-2026-1002', '30000000-0000-0000-0000-000000000002', CURRENT_DATE - 9, CURRENT_DATE - 2, 'PARTIALLY_RECEIVED', 'Partial delivery test order', 46800.00, 'SYSTEM', 'SYSTEM', NOW() - INTERVAL '8 days'),
('91000000-0000-0000-0000-000000000003', 'PO-2026-1003', '30000000-0000-0000-0000-000000000003', CURRENT_DATE - 1, CURRENT_DATE + 6, 'DRAFT', 'Draft order for office consumables', 15000.00, 'SYSTEM', NULL, NULL);

INSERT INTO purchase_order_items (
    id, purchase_order_id, product_id, warehouse_id, quantity_ordered, quantity_received, unit_cost, line_total, notes
) VALUES
('92000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 15, 0, 4200.00, 63000.00, 'iPhone batch'),
('92000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000001', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 15, 0, 4000.00, 60000.00, 'Samsung batch'),
('92000000-0000-0000-0000-000000000003', '91000000-0000-0000-0000-000000000002', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 12, 4, 3900.00, 46800.00, '4 already received'),
('92000000-0000-0000-0000-000000000004', '91000000-0000-0000-0000-000000000003', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 100, 0, 150.00, 15000.00, 'Office paper restock');

-- ================================================================
-- 2) MOVEMENTS + SERIALIZATION + FINANCIAL
-- ================================================================

INSERT INTO stock_movements (
    id, transaction_date, type, product_id, product_name,
    warehouse_from_id, warehouse_to_id, department_id,
    quantity, unit_cost, total_amount, vendor_id, client_id, reference_doc_id, notes
) VALUES
('50000000-0000-0000-0000-000000000001', NOW() - INTERVAL '5 days', 'IN', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'iPhone 15 Pro 256GB', NULL, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 50, 4200.00, 210000.00, '30000000-0000-0000-0000-000000000001', NULL, NULL, 'Inbound PO receipt'),
('50000000-0000-0000-0000-000000000002', NOW() - INTERVAL '3 days', 'IN', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Samsung S24 Ultra', NULL, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 30, 3800.00, 114000.00, '30000000-0000-0000-0000-000000000002', NULL, NULL, 'Inbound stock'),
('50000000-0000-0000-0000-000000000003', NOW() - INTERVAL '1 day', 'OUT', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'iPhone 15 Pro 256GB', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, NULL, 10, 4200.00, 42000.00, NULL, '40000000-0000-0000-0000-000000000001', NULL, 'Sales dispatch'),
('50000000-0000-0000-0000-000000000004', NOW() - INTERVAL '12 hours', 'CONSUMPTION', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'Uniform Kit', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, '10000000-0000-0000-0000-000000000001', 6, 120.00, 720.00, NULL, NULL, NULL, 'Driver uniforms issued'),
('50000000-0000-0000-0000-000000000005', NOW() - INTERVAL '4 hours', 'CONSUMPTION', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'Employee Consumable Pack', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', NULL, '10000000-0000-0000-0000-000000000003', 5, 75.00, 375.00, NULL, NULL, NULL, 'Employee consumables issued');

INSERT INTO product_serials (
    id, product_id, serial_number, status, warehouse_id, location_id, movement_in_id, movement_out_id, is_deleted, created_at, updated_at
) VALUES
('80000000-0000-0000-0000-000000000001', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'IP15P-2026-00001', 'AVAILABLE', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', NULL, FALSE, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
('80000000-0000-0000-0000-000000000002', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'IP15P-2026-00002', 'SOLD', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', FALSE, NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'),
('80000000-0000-0000-0000-000000000003', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'S24U-2026-00001', 'RESERVED', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '20000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', NULL, FALSE, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 hours'),
('80000000-0000-0000-0000-000000000004', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'DBG-2026-00001', 'AVAILABLE', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '20000000-0000-0000-0000-000000000002', NULL, NULL, FALSE, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
('80000000-0000-0000-0000-000000000005', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'DBG-2026-00002', 'AVAILABLE', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '20000000-0000-0000-0000-000000000002', NULL, NULL, FALSE, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
('80000000-0000-0000-0000-000000000006', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'DBG-2026-00003', 'AVAILABLE', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '20000000-0000-0000-0000-000000000002', NULL, NULL, FALSE, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');

INSERT INTO financial_ledger (
    id, entity_type, entity_id, entity_name, transaction_date, type, amount, balance_after,
    reference_doc_id, due_date, paid_date, notes
) VALUES
('90000000-0000-0000-0000-000000000001', 'VENDOR', '30000000-0000-0000-0000-000000000001', 'United Supplies Co.', NOW() - INTERVAL '5 days', 'INVOICE', 210000.00, 210000.00, '50000000-0000-0000-0000-000000000001', CURRENT_DATE + 30, NULL, 'Vendor invoice for iPhone batch'),
('90000000-0000-0000-0000-000000000002', 'VENDOR', '30000000-0000-0000-0000-000000000002', 'Modern Logistics Est.', NOW() - INTERVAL '3 days', 'INVOICE', 114000.00, 114000.00, '50000000-0000-0000-0000-000000000002', CURRENT_DATE + 30, NULL, 'Vendor invoice for Samsung batch'),
('90000000-0000-0000-0000-000000000003', 'CLIENT', '40000000-0000-0000-0000-000000000001', 'Al Nakheel Supermarket', NOW() - INTERVAL '1 day', 'INVOICE', 42000.00, 42000.00, '50000000-0000-0000-0000-000000000003', CURRENT_DATE + 15, NULL, 'Sales invoice to client'),
('90000000-0000-0000-0000-000000000004', 'CLIENT', '40000000-0000-0000-0000-000000000003', 'Madinah Grocery', NOW() - INTERVAL '20 days', 'INVOICE', 15000.00, 15000.00, NULL, CURRENT_DATE - 5, NULL, 'Overdue receivable sample'),
('90000000-0000-0000-0000-000000000005', 'CLIENT', '40000000-0000-0000-0000-000000000002', 'Riyadh Trading Group', NOW() - INTERVAL '2 days', 'PAYMENT', 10000.00, 0.00, NULL, NULL, CURRENT_DATE - 1, 'Partial payment sample');

-- ================================================================
-- 3) BENEFICIARIES + ISSUE REQUESTS
-- ================================================================

INSERT INTO inventory_beneficiaries (
    id, beneficiary_code, type, name, phone, department_id, is_active, is_deleted
) VALUES
('b1000000-0000-0000-0000-000000000001', 'BEN-EXT-001', 'EXTERNAL_CLIENT', 'External Client - Al Nakheel', '+966504567890', NULL, TRUE, FALSE),
('b1000000-0000-0000-0000-000000000002', 'BEN-DRV-001', 'DELIVERY_DRIVER', 'Driver - Abdulrahman Saleh', '+966500111222', '10000000-0000-0000-0000-000000000001', TRUE, FALSE),
('b1000000-0000-0000-0000-000000000003', 'BEN-EMP-001', 'COMPANY_EMPLOYEE', 'Employee - IT Support', '+966500333444', '10000000-0000-0000-0000-000000000003', TRUE, FALSE);

INSERT INTO stock_issue_requests (
    id, request_code, beneficiary_id, beneficiary_type, department_id, product_id, quantity, purpose, status, notes, requested_by, approved_by, approved_at, issued_at, is_deleted
) VALUES
('i1000000-0000-0000-0000-000000000001', 'ISS-DRV-001', 'b1000000-0000-0000-0000-000000000002', 'DELIVERY_DRIVER', '10000000-0000-0000-0000-000000000001', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 2, 'UNIFORM', 'APPROVED', 'Initial driver uniform request', 'ADMIN', 'MANAGER', NOW() - INTERVAL '1 day', NULL, FALSE),
('i1000000-0000-0000-0000-000000000002', 'ISS-DRV-002', 'b1000000-0000-0000-0000-000000000002', 'DELIVERY_DRIVER', '10000000-0000-0000-0000-000000000001', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 1, 'DELIVERY_BAG', 'ISSUED', 'Delivery bag issued', 'ADMIN', 'MANAGER', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', FALSE),
('i1000000-0000-0000-0000-000000000003', 'ISS-EMP-001', 'b1000000-0000-0000-0000-000000000003', 'COMPANY_EMPLOYEE', '10000000-0000-0000-0000-000000000003', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 5, 'CONSUMABLE_CUSTODY', 'PENDING', 'Internal consumables request', 'ADMIN', NULL, NULL, NULL, FALSE);

-- ================================================================
-- 4) PERMISSIONS (for admin + manager + viewer)
-- ================================================================

INSERT INTO modules (id, name, display_name, display_name_en, icon, sort_order, is_active) VALUES
('10000001-0000-0000-0000-000000000001', 'dashboard', 'لوحة المعلومات', 'Dashboard', 'LayoutDashboard', 1, TRUE),
('10000001-0000-0000-0000-000000000002', 'products', 'المنتجات', 'Products', 'Package', 2, TRUE),
('10000001-0000-0000-0000-000000000003', 'categories', 'الفئات', 'Categories', 'FolderTree', 3, TRUE),
('10000001-0000-0000-0000-000000000004', 'warehouses', 'المستودعات', 'Warehouses', 'Warehouse', 4, TRUE),
('10000001-0000-0000-0000-000000000005', 'vendors', 'الموردون', 'Vendors', 'Truck', 5, TRUE),
('10000001-0000-0000-0000-000000000006', 'clients', 'العملاء', 'Clients', 'Users', 6, TRUE),
('10000001-0000-0000-0000-000000000007', 'purchase_orders', 'أوامر الشراء', 'Purchase Orders', 'ShoppingCart', 7, TRUE),
('10000001-0000-0000-0000-000000000008', 'sales_orders', 'أوامر البيع', 'Sales Orders', 'ShoppingBag', 8, TRUE),
('10000001-0000-0000-0000-000000000009', 'inventory', 'المخزون', 'Inventory', 'Archive', 9, TRUE),
('10000001-0000-0000-0000-000000000010', 'stock_movements', 'حركات المخزون', 'Stock Movements', 'TrendingUp', 10, TRUE),
('10000001-0000-0000-0000-000000000011', 'reports', 'التقارير', 'Reports', 'FileText', 11, TRUE),
('10000001-0000-0000-0000-000000000012', 'users', 'المستخدمون', 'Users', 'UserCog', 12, TRUE),
('10000001-0000-0000-0000-000000000013', 'roles', 'الأدوار والصلاحيات', 'Roles & Permissions', 'Shield', 13, TRUE),
('10000001-0000-0000-0000-000000000014', 'system_settings', 'إعدادات النظام', 'System Settings', 'Settings', 14, TRUE),
('10000001-0000-0000-0000-000000000015', 'beneficiaries', 'المستفيدون', 'Beneficiaries', 'Users', 15, TRUE),
('10000001-0000-0000-0000-000000000016', 'issue_requests', 'طلبات الصرف', 'Issue Requests', 'ClipboardList', 16, TRUE);

INSERT INTO actions (id, name, display_name, display_name_en, sort_order) VALUES
('20000001-0000-0000-0000-000000000001', 'view', 'عرض', 'View', 1),
('20000001-0000-0000-0000-000000000002', 'create', 'إنشاء', 'Create', 2),
('20000001-0000-0000-0000-000000000003', 'update', 'تعديل', 'Update', 3),
('20000001-0000-0000-0000-000000000004', 'delete', 'حذف', 'Delete', 4),
('20000001-0000-0000-0000-000000000005', 'approve', 'اعتماد', 'Approve', 5),
('20000001-0000-0000-0000-000000000006', 'export', 'تصدير', 'Export', 6),
('20000001-0000-0000-0000-000000000007', 'import', 'استيراد', 'Import', 7),
('20000001-0000-0000-0000-000000000008', 'print', 'طباعة', 'Print', 8);

INSERT INTO module_actions (module_id, action_id, is_available)
SELECT m.id, a.id, TRUE
FROM modules m
CROSS JOIN actions a;

INSERT INTO roles (id, name, display_name, description, is_system_role, is_active) VALUES
('30000001-0000-0000-0000-000000000001', 'admin', 'مدير النظام', 'Full access to all modules', TRUE, TRUE),
('30000001-0000-0000-0000-000000000002', 'inventory_manager', 'مدير المخزون', 'Inventory and operations manager', FALSE, TRUE),
('30000001-0000-0000-0000-000000000003', 'viewer', 'مستعرض', 'Read-only access', FALSE, TRUE);

INSERT INTO users (id, name, email, password_hash, role_id, is_active) VALUES
('40000001-0000-0000-0000-000000000001', 'مدير النظام', 'admin@tawseel.com', 'CHANGE_ME', '30000001-0000-0000-0000-000000000001', TRUE),
('40000001-0000-0000-0000-000000000002', 'مدير المخزن', 'manager@tawseel.com', 'CHANGE_ME', '30000001-0000-0000-0000-000000000002', TRUE),
('40000001-0000-0000-0000-000000000003', 'مستخدم للقراءة', 'viewer@tawseel.com', 'CHANGE_ME', '30000001-0000-0000-0000-000000000003', TRUE);

-- Admin: all permissions
INSERT INTO role_permissions (role_id, module_id, action_id, has_permission)
SELECT '30000001-0000-0000-0000-000000000001', ma.module_id, ma.action_id, TRUE
FROM module_actions ma;

-- Inventory manager: focused permissions
INSERT INTO role_permissions (role_id, module_id, action_id, has_permission)
SELECT
  '30000001-0000-0000-0000-000000000002',
  ma.module_id,
  ma.action_id,
  CASE
    WHEN m.name IN ('products', 'categories', 'warehouses', 'inventory', 'stock_movements', 'beneficiaries', 'issue_requests') THEN TRUE
    WHEN m.name IN ('dashboard', 'vendors', 'clients', 'reports') AND a.name IN ('view', 'export', 'print') THEN TRUE
    ELSE FALSE
  END
FROM module_actions ma
JOIN modules m ON m.id = ma.module_id
JOIN actions a ON a.id = ma.action_id;

-- Viewer: view only
INSERT INTO role_permissions (role_id, module_id, action_id, has_permission)
SELECT
  '30000001-0000-0000-0000-000000000003',
  ma.module_id,
  ma.action_id,
  CASE WHEN a.name = 'view' THEN TRUE ELSE FALSE END
FROM module_actions ma
JOIN actions a ON a.id = ma.action_id;

-- One direct user override example (manager can approve issue_requests)
INSERT INTO user_permissions (user_id, module_id, action_id, has_permission)
SELECT
  '40000001-0000-0000-0000-000000000002',
  m.id,
  a.id,
  TRUE
FROM modules m
JOIN actions a ON a.name = 'approve'
WHERE m.name = 'issue_requests';

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ================================================================
-- Seed completed successfully
-- ================================================================
