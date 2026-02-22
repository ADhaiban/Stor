-- ========================================================
-- TAWSEEL STORE - TOTAL DATABASE SETUP V3 (SUPABASE)
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
SELECT fl.entity_id AS client_id, c.name AS client_name, c.category, c.phone, SUM(CASE WHEN (CURRENT_DATE - fl.due_date) BETWEEN 0 AND 30 THEN fl.amount ELSE 0 END) AS aging_0_30, SUM(CASE WHEN (CURRENT_DATE - fl.due_date) BETWEEN 31 AND 60 THEN fl.amount ELSE 0 END) AS aging_31_60, SUM(CASE WHEN (CURRENT_DATE - fl.due_date) > 60 THEN fl.amount ELSE 0 END) AS aging_61_plus, SUM(fl.amount) AS total_overdue, c.current_balance, c.credit_limit
FROM financial_ledger fl JOIN clients c ON fl.entity_id = c.id
WHERE fl.entity_type = 'CLIENT' AND fl.type = 'INVOICE' AND fl.paid_date IS NULL AND fl.due_date < CURRENT_DATE
GROUP BY fl.entity_id, c.name, c.category, c.phone, c.current_balance, c.credit_limit;

CREATE OR REPLACE VIEW financial_summary AS
SELECT (SELECT COALESCE(SUM(current_balance), 0) FROM vendors) AS total_payables, (SELECT COALESCE(SUM(current_balance), 0) FROM clients) AS total_receivables, (SELECT COALESCE(SUM(current_balance), 0) FROM clients) - (SELECT COALESCE(SUM(current_balance), 0) FROM vendors) AS net_position, (SELECT COUNT(*) FROM financial_ledger WHERE entity_type = 'CLIENT' AND type = 'INVOICE' AND paid_date IS NULL AND due_date < CURRENT_DATE) AS overdue_invoices_count, (SELECT COALESCE(SUM(amount), 0) FROM financial_ledger WHERE entity_type = 'CLIENT' AND type = 'INVOICE' AND paid_date IS NULL AND due_date < CURRENT_DATE) AS overdue_amount;

-- ================================================
-- 5. SEED DATA (3 rows per table)
-- ================================================

-- 1. Departments
INSERT INTO departments (name, cost_center_code, budget_cap) VALUES
('العمليات', 'OPS-001', 50000.00),
('المبيعات', 'SAL-001', 20000.00),
('تقنية المعلومات', 'IT-001', 15000.00);

-- 2. Warehouses
INSERT INTO warehouses (id, name, location_address, is_active) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'المستودع الرئيسي', 'الرياض - المنطقة الصناعية', TRUE),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'مستودع الشرقية', 'الدمام - الميناء', TRUE),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'مستودع الغربية', 'جدة - حي الجوهرة', TRUE);

-- 3. Locations
INSERT INTO locations (warehouse_id, zone, aisle, rack, bin_code) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'A', '1', '1', 'A-1-1-01'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'B', '1', '1', 'B-1-1-01'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'C', '1', '1', 'C-1-1-01');

-- 4. Product Categories
INSERT INTO product_categories (name) VALUES 
('Electronics'), ('Furniture'), ('Consumables')
ON CONFLICT (name) DO NOTHING;

-- 5. UOMs
INSERT INTO uoms (name, symbol) VALUES 
('Kilogram', 'kg'), ('Unit', 'unit'), ('Box', 'box');

-- 6. Vendors
INSERT INTO vendors (vendor_code, name, contact_person, phone, payment_terms) VALUES
('VEN-001', 'شركة التوريدات المتحدة', 'أحمد محمد', '+966501234567', 'HYBRID_SALES_LINKED'),
('VEN-002', 'الأمل للخدمات اللوجستية', 'سعد الشهري', '+966501112223', 'CREDIT'),
('VEN-003', 'التقنية المتقدمة', 'خالد علي', '+966509998887', 'CASH');

-- 7. Clients
INSERT INTO clients (client_code, name, contact_person, phone, gps_location, category, collection_period_days, credit_limit) VALUES
('CLI-001', 'سوبر ماركت النخيل', 'فهد السعيد', '+966504567890', '24.7136,46.6753', 'Retail', 15, 50000.00),
('CLI-002', 'بقالة السعادة', 'صالح الحربي', '+966503334445', '24.7742,46.7385', 'Retail', 30, 20000.00),
('CLI-003', 'مطاعم الضيافة', 'ياسر القحطاني', '+966505556667', '21.4858,39.1925', 'Horeca', 7, 10000.00);

-- 8. Products
INSERT INTO products (sku, name, description, type, min_reorder_level, current_wac_cost, unit, category_id, preferred_vendor_id, default_warehouse_id) VALUES
('iphone-15-pro', 'iPhone 15 Pro 256GB', 'Apple Smartphone', 'RESALE', 10, 4200.00, 'unit', (SELECT id FROM product_categories WHERE name='Electronics' LIMIT 1), (SELECT id FROM vendors WHERE vendor_code='VEN-001' LIMIT 1), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
('samsung-s24', 'Samsung S24 Ultra', 'Samsung Smartphone', 'RESALE', 5, 3800.00, 'unit', (SELECT id FROM product_categories WHERE name='Electronics' LIMIT 1), (SELECT id FROM vendors WHERE vendor_code='VEN-003' LIMIT 1), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),
('paper-a4', 'ورق طباعة A4', 'كرتون 500 ورقة', 'CONSUMABLE', 20, 15.00, 'box', (SELECT id FROM product_categories WHERE name='Consumables' LIMIT 1), (SELECT id FROM vendors WHERE vendor_code='VEN-002' LIMIT 1), 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33');

-- 9. Inventory Stock
INSERT INTO inventory_stock (warehouse_id, product_id, quantity_on_hand, quantity_reserved) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', (SELECT id FROM products WHERE sku='iphone-15-pro' LIMIT 1), 50, 0),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', (SELECT id FROM products WHERE sku='samsung-s24' LIMIT 1), 30, 0),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', (SELECT id FROM products WHERE sku='paper-a4' LIMIT 1), 100, 0);

-- 10. Batches
INSERT INTO batches (product_id, batch_number, expiry_date, quantity) VALUES
((SELECT id FROM products WHERE sku='iphone-15-pro' LIMIT 1), 'B-I15-001', '2026-12-31', 50),
((SELECT id FROM products WHERE sku='samsung-s24' LIMIT 1), 'B-S24-001', '2026-12-31', 30),
((SELECT id FROM products WHERE sku='paper-a4' LIMIT 1), 'B-P4-001', '2025-06-30', 100);

-- 11. Financial Ledger
INSERT INTO financial_ledger (entity_type, entity_id, entity_name, type, amount, balance_after) VALUES
('VENDOR', (SELECT id FROM vendors WHERE vendor_code='VEN-001' LIMIT 1), 'شركة التوريدات المتحدة', 'INVOICE', 10000.00, 10000.00),
('CLIENT', (SELECT id FROM clients WHERE client_code='CLI-001' LIMIT 1), 'سوبر ماركت النخيل', 'INVOICE', 5000.00, 5000.00),
('VENDOR', (SELECT id FROM vendors WHERE vendor_code='VEN-002' LIMIT 1), 'الأمل للخدمات اللوجستية', 'INVOICE', 2000.00, 2000.00);

-- 12. Stock Movements
INSERT INTO stock_movements (type, product_id, product_name, quantity, unit_cost, total_amount, warehouse_to_id) VALUES
('IN', (SELECT id FROM products WHERE sku='iphone-15-pro' LIMIT 1), 'iPhone 15 Pro 256GB', 50, 4200.00, 210000.00, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
('IN', (SELECT id FROM products WHERE sku='samsung-s24' LIMIT 1), 'Samsung S24 Ultra', 30, 3800.00, 114000.00, 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),
('IN', (SELECT id FROM products WHERE sku='paper-a4' LIMIT 1), 'ورق طباعة A4', 100, 15.00, 1500.00, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33');

-- ========================================================
-- PERMISSIONS (DISABLE RLS FOR DEVELOPMENT)
-- ========================================================

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

NOTIFY pgrst, 'reload schema';
