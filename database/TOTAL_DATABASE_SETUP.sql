-- ========================================================
-- TAWSEEL STORE - TOTAL DATABASE SETUP (SUPABASE)
-- Consolidates Core, Financial, Movements, Views, and Seed Data
-- Includes all recent fixes (unit, category_id, soft deletes)
-- ========================================================

-- CLEANUP (Ensures a fresh setup)
DROP VIEW IF EXISTS aging_report CASCADE;
DROP VIEW IF EXISTS collection_alerts CASCADE;
DROP VIEW IF EXISTS financial_summary CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS financial_ledger CASCADE;
DROP TABLE IF EXISTS inventory_stock CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS uoms CASCADE;
DROP TYPE IF EXISTS product_type_enum CASCADE;
DROP TYPE IF EXISTS payment_terms_enum CASCADE;
DROP TYPE IF EXISTS transaction_type_enum CASCADE;
DROP TYPE IF EXISTS entity_type_enum CASCADE;
DROP TYPE IF EXISTS movement_type_enum CASCADE;

-- ================================================
-- 1. ENUMS
-- ================================================

CREATE TYPE product_type_enum AS ENUM ('RESALE', 'RAW_MATERIAL', 'CONSUMABLE', 'ASSET');
CREATE TYPE payment_terms_enum AS ENUM ('CASH', 'CREDIT', 'HYBRID_SALES_LINKED');
CREATE TYPE transaction_type_enum AS ENUM ('INVOICE', 'PAYMENT', 'RETURN', 'CREDIT_NOTE', 'DEBIT_NOTE');
CREATE TYPE entity_type_enum AS ENUM ('VENDOR', 'CLIENT');
CREATE TYPE movement_type_enum AS ENUM ('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'CONSUMPTION');

-- ================================================
-- 2. CORE SCHEMA
-- ================================================

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cost_center_code VARCHAR(50) UNIQUE NOT NULL,
    budget_cap DECIMAL(15, 2) DEFAULT 0.00,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    location_address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES warehouses(id),
    zone VARCHAR(50),
    aisle VARCHAR(50),
    rack VARCHAR(50),
    bin_code VARCHAR(100) NOT NULL UNIQUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE uoms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    tax_id VARCHAR(50),
    payment_terms payment_terms_enum NOT NULL DEFAULT 'CREDIT',
    current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    credit_limit DECIMAL(15, 2),
    cash_percentage DECIMAL(5, 2),
    commission_per_unit DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    gps_location VARCHAR(255),
    category VARCHAR(50),
    collection_period_days INT NOT NULL DEFAULT 30,
    current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    credit_limit DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type product_type_enum NOT NULL DEFAULT 'RESALE',
    min_reorder_level INTEGER DEFAULT 0,
    is_serialized BOOLEAN DEFAULT FALSE,
    is_batch_tracked BOOLEAN DEFAULT FALSE,
    expense_account_code VARCHAR(100),
    current_wac_cost DECIMAL(15, 4) DEFAULT 0.0000,
    unit VARCHAR(50) DEFAULT 'unit',
    category_id UUID REFERENCES product_categories(id),
    preferred_vendor_id UUID REFERENCES vendors(id),
    default_warehouse_id UUID REFERENCES warehouses(id),
    default_department_id UUID REFERENCES departments(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE inventory_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES warehouses(id),
    location_id UUID REFERENCES locations(id),
    product_id UUID REFERENCES products(id),
    quantity_on_hand DECIMAL(15, 4) DEFAULT 0,
    quantity_reserved DECIMAL(15, 4) DEFAULT 0,
    CONSTRAINT unique_stock_loc UNIQUE (warehouse_id, location_id, product_id)
);

CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    batch_number VARCHAR(100) NOT NULL,
    expiry_date DATE,
    quantity DECIMAL(15, 4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 3. FINANCIAL & MOVEMENTS SCHEMA
-- ================================================

CREATE TABLE financial_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type entity_type_enum NOT NULL,
    entity_id UUID NOT NULL,
    entity_name VARCHAR(255) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    type transaction_type_enum NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,
    reference_doc_id UUID,
    due_date DATE,
    paid_date DATE,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    type movement_type_enum NOT NULL,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    warehouse_from_id UUID REFERENCES warehouses(id),
    warehouse_to_id UUID REFERENCES warehouses(id),
    department_id UUID REFERENCES departments(id),
    quantity DECIMAL(15, 4) NOT NULL,
    unit_cost DECIMAL(15, 4) NOT NULL,
    total_amount DECIMAL(15, 2),
    vendor_id UUID REFERENCES vendors(id),
    client_id UUID REFERENCES clients(id),
    reference_doc_id UUID,
    user_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 4. VIEWS
-- ================================================

CREATE OR REPLACE VIEW collection_alerts AS
SELECT fl.id AS alert_id, fl.entity_id AS client_id, fl.entity_name AS client_name, fl.reference_doc_id AS invoice_id, fl.transaction_date AS invoice_date, fl.due_date, fl.amount, CURRENT_DATE - fl.due_date AS days_overdue, c.current_balance, c.credit_limit, c.phone, c.gps_location
FROM financial_ledger fl JOIN clients c ON fl.entity_id = c.id
WHERE fl.entity_type = 'CLIENT' AND fl.type = 'INVOICE' AND fl.paid_date IS NULL AND fl.due_date < CURRENT_DATE;

CREATE OR REPLACE VIEW aging_report AS
SELECT fl.entity_id AS client_id, c.name AS client_name, c.category, c.phone, 
       SUM(CASE WHEN (CURRENT_DATE - fl.due_date) BETWEEN 0 AND 30 THEN fl.amount ELSE 0 END) AS aging_0_30, 
       SUM(CASE WHEN (CURRENT_DATE - fl.due_date) BETWEEN 31 AND 60 THEN fl.amount ELSE 0 END) AS aging_31_60, 
       SUM(CASE WHEN (CURRENT_DATE - fl.due_date) > 60 THEN fl.amount ELSE 0 END) AS aging_61_plus, 
       SUM(fl.amount) AS total_overdue, c.current_balance, c.credit_limit
FROM financial_ledger fl JOIN clients c ON fl.entity_id = c.id
WHERE fl.entity_type = 'CLIENT' AND fl.type = 'INVOICE' AND fl.paid_date IS NULL AND fl.due_date < CURRENT_DATE
GROUP BY fl.entity_id, c.name, c.category, c.phone, c.current_balance, c.credit_limit;

CREATE OR REPLACE VIEW financial_summary AS
SELECT 
    (SELECT COALESCE(SUM(current_balance), 0) FROM vendors) AS total_payables, 
    (SELECT COALESCE(SUM(current_balance), 0) FROM clients) AS total_receivables, 
    (SELECT COALESCE(SUM(current_balance), 0) FROM clients) - (SELECT COALESCE(SUM(current_balance), 0) FROM vendors) AS net_position, 
    (SELECT COUNT(*) FROM financial_ledger WHERE entity_type = 'CLIENT' AND type = 'INVOICE' AND paid_date IS NULL AND due_date < CURRENT_DATE) AS overdue_invoices_count, 
    (SELECT COALESCE(SUM(amount), 0) FROM financial_ledger WHERE entity_type = 'CLIENT' AND type = 'INVOICE' AND paid_date IS NULL AND due_date < CURRENT_DATE) AS overdue_amount;

-- ================================================
-- 5. SEED DATA (3 ROWS PER TABLE)
-- ================================================

-- Seed Product Categories (3 rows)
INSERT INTO product_categories (id, name, is_deleted) VALUES 
(gen_random_uuid(), 'Electronics', FALSE),
(gen_random_uuid(), 'Furniture', FALSE),
(gen_random_uuid(), 'Consumables', FALSE);

-- Seed UOMs (3 rows)
INSERT INTO uoms (id, name, symbol, is_deleted) VALUES 
(gen_random_uuid(), 'Piece', 'pc', FALSE),
(gen_random_uuid(), 'Box', 'bx', FALSE),
(gen_random_uuid(), 'Kilogram', 'kg', FALSE);

-- Seed Departments (3 rows)
INSERT INTO departments (id, name, cost_center_code, budget_cap, is_deleted) VALUES 
(gen_random_uuid(), 'العمليات', 'OPS-001', 50000.00, FALSE),
(gen_random_uuid(), 'المبيعات', 'SAL-001', 20000.00, FALSE),
(gen_random_uuid(), 'تقنية المعلومات', 'IT-001', 15000.00, FALSE);

-- Seed Warehouses (3 rows)
INSERT INTO warehouses (id, name, location_address, is_active, is_deleted) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'المستودع الرئيسي', 'الرياض - المنطقة الصناعية', TRUE, FALSE),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'مستودع الشرقية', 'الدمام - الميناء', TRUE, FALSE),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'مستودع جدة', 'جدة - المدينة الصناعية', TRUE, FALSE);

-- Seed Locations (3 rows)
INSERT INTO locations (id, warehouse_id, zone, aisle, rack, bin_code, is_deleted) VALUES 
(gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'A', '1', '1', 'A-1-1-01', FALSE),
(gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'A', '1', '2', 'A-1-2-01', FALSE),
(gen_random_uuid(), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'B', '1', '1', 'B-1-1-01', FALSE);

-- Seed Vendors (3 rows)
-- IDs changed to valid hexadecimal UUIDs (h->8, i->9 etc)
INSERT INTO vendors (id, vendor_code, name, contact_person, phone, address, tax_id, payment_terms, current_balance, credit_limit, cash_percentage, commission_per_unit, is_active, is_deleted) VALUES 
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'VEN-001', 'شركة التوريدات المتحدة', 'أحمد محمد', '+966501234567', 'الرياض - شارع الملك فهد', '1234567890', 'HYBRID_SALES_LINKED', 150000.00, 500000.00, 30.00, 5.00, TRUE, FALSE),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'VEN-002', 'مؤسسة الإلكترونيات الحديثة', 'سعد العنزي', '+966502345678', 'الرياض - طريق الملك عبدالله', '2345678901', 'CREDIT', 75000.00, 300000.00, NULL, 3.50, TRUE, FALSE),
(gen_random_uuid(), 'VEN-003', 'شركة القرطاسية المتكاملة', 'خالد العتيبي', '+966503456789', 'جدة - شارع التحلية', '3456789012', 'CASH', 25000.00, 100000.00, NULL, NULL, TRUE, FALSE);

-- Seed Clients (3 rows)
-- Fixed invalid UUIDs (h->8, i->9)
INSERT INTO clients (id, client_code, name, contact_person, phone, gps_location, category, collection_period_days, current_balance, credit_limit, is_active, is_deleted) VALUES 
('80eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'CLI-001', 'سوبر ماركت النخيل', 'فهر السعيد', '+966504567890', '24.7136,46.6753', 'Retail', 15, 45000.00, 50000.00, TRUE, FALSE),
('90eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', 'CLI-002', 'مطاعم الضيافة', 'محمد الغامدي', '+966505678901', '24.7215,46.6867', 'Restaurant', 7, 15000.00, 25000.00, TRUE, FALSE),
(gen_random_uuid(), 'CLI-003', 'مؤسسة البناء الحديث', 'عبدالله القحطاني', '+966506789012', '24.7142,46.6891', 'Construction', 30, 85000.00, 100000.00, TRUE, FALSE);

-- Seed Products (3 rows)
-- Fixed invalid UUID (g->7)
INSERT INTO products (id, sku, name, description, type, min_reorder_level, is_serialized, is_batch_tracked, current_wac_cost, unit, category_id, preferred_vendor_id, default_warehouse_id, default_department_id, is_deleted) VALUES 
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'iphone-15-pro', 'iPhone 15 Pro 256GB', 'Apple iPhone 15 Pro - 256GB - الجيل الخامس', 'RESALE', 10, TRUE, TRUE, 4200.00, 'pc', 
 (SELECT id FROM product_categories WHERE name='Electronics' LIMIT 1), 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', (SELECT id FROM departments WHERE cost_center_code='SAL-001' LIMIT 1), FALSE),
('70eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'samsung-s24', 'Samsung S24 Ultra', 'Samsung Galaxy S24 Ultra - 512GB - الجيل الخامس', 'RESALE', 5, TRUE, TRUE, 3800.00, 'pc',
 (SELECT id FROM product_categories WHERE name='Electronics' LIMIT 1), 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', (SELECT id FROM departments WHERE cost_center_code='SAL-001' LIMIT 1), FALSE),
(gen_random_uuid(), 'paper-a4', 'ورق طباعة A4', 'كرتون ورق طباعة A4 - 500 ورقة', 'CONSUMABLE', 20, FALSE, TRUE, 15.00, 'bx',
 (SELECT id FROM product_categories WHERE name='Consumables' LIMIT 1), (SELECT id FROM vendors WHERE vendor_code='VEN-003' LIMIT 1), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', (SELECT id FROM departments WHERE cost_center_code='OPS-001' LIMIT 1), FALSE);

-- Seed Inventory Stock (3 rows)
INSERT INTO inventory_stock (id, warehouse_id, location_id, product_id, quantity_on_hand, quantity_reserved) VALUES 
(gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', (SELECT id FROM locations WHERE bin_code='A-1-1-01' LIMIT 1), 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 50, 5),
(gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', (SELECT id FROM locations WHERE bin_code='A-1-2-01' LIMIT 1), '70eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 30, 3),
(gen_random_uuid(), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', (SELECT id FROM locations WHERE bin_code='B-1-1-01' LIMIT 1), (SELECT id FROM products WHERE sku='paper-a4' LIMIT 1), 200, 20);

-- Seed Batches (3 rows)
INSERT INTO batches (id, product_id, batch_number, expiry_date, quantity) VALUES 
(gen_random_uuid(), 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'IP15-2024-001', '2025-12-31', 25),
(gen_random_uuid(), 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'IP15-2024-002', '2025-12-31', 25),
(gen_random_uuid(), (SELECT id FROM products WHERE sku='paper-a4' LIMIT 1), 'PAPER-2024-001', '2026-01-15', 200);

-- Seed Financial Ledger (6 rows - 3 for clients, 3 for vendors)
-- Client transactions
INSERT INTO financial_ledger (id, entity_type, entity_id, entity_name, transaction_date, type, amount, balance_after, due_date, paid_date, notes) VALUES 
(gen_random_uuid(), 'CLIENT', '80eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'سوبر ماركت النخيل', NOW() - INTERVAL '20 days', 'INVOICE', 15000.00, 15000.00, NOW() - INTERVAL '5 days', NULL, 'فاتورة مبيعات رقم 1001'),
(gen_random_uuid(), 'CLIENT', '80eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'سوبر ماركت النخيل', NOW() - INTERVAL '10 days', 'PAYMENT', -5000.00, 10000.00, NULL, NOW() - INTERVAL '10 days', 'دفعة على حساب الفاتورة 1001'),
(gen_random_uuid(), 'CLIENT', '90eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', 'مطاعم الضيافة', NOW() - INTERVAL '10 days', 'INVOICE', 5000.00, 5000.00, NOW() - INTERVAL '3 days', NULL, 'فاتورة مبيعات رقم 1002');

-- Vendor transactions
INSERT INTO financial_ledger (id, entity_type, entity_id, entity_name, transaction_date, type, amount, balance_after, due_date, paid_date, notes) VALUES 
(gen_random_uuid(), 'VENDOR', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'شركة التوريدات المتحدة', NOW() - INTERVAL '15 days', 'INVOICE', 200000.00, 200000.00, NOW() + INTERVAL '15 days', NULL, 'فاتورة مشتريات رقم 5001'),
(gen_random_uuid(), 'VENDOR', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'مؤسسة الإلكترونيات الحديثة', NOW() - INTERVAL '12 days', 'INVOICE', 114000.00, 114000.00, NOW() + INTERVAL '18 days', NULL, 'فاتورة مشتريات رقم 5002'),
(gen_random_uuid(), 'VENDOR', (SELECT id FROM vendors WHERE vendor_code='VEN-003' LIMIT 1), 'شركة القرطاسية المتكاملة', NOW() - INTERVAL '5 days', 'INVOICE', 3000.00, 3000.00, NOW() + INTERVAL '25 days', NULL, 'فاتورة مشتريات رقم 5003');

-- Seed Stock Movements (3 rows)
INSERT INTO stock_movements (id, transaction_date, type, product_id, product_name, warehouse_from_id, warehouse_to_id, quantity, unit_cost, total_amount, vendor_id, client_id, notes) VALUES 
(gen_random_uuid(), NOW() - INTERVAL '15 days', 'IN', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'iPhone 15 Pro 256GB', NULL, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 50, 4000.00, 200000.00, 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', NULL, 'استلام بضاعة من المورد'),
(gen_random_uuid(), NOW() - INTERVAL '10 days', 'OUT', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'iPhone 15 Pro 256GB', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 5, 4200.00, 21000.00, NULL, '80eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'بيع للعميل CLI-001'),
(gen_random_uuid(), NOW() - INTERVAL '5 days', 'TRANSFER', '70eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'Samsung S24 Ultra', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 10, 3800.00, 38000.00, NULL, NULL, 'تحويل مخزون للمستودع الشرقي');

-- ================================================
-- 6. DISABLE RLS FOR DEVELOPMENT
-- ================================================

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
ALTER TABLE product_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE uoms DISABLE ROW LEVEL SECURITY;

-- Refresh the API schema cache
NOTIFY pgrst, 'reload schema';
