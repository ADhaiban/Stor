-- ========================================================
-- TAWSEEL STORE - IMPROVED DATABASE SETUP (SUPABASE)
-- Includes:
-- 1. All previous tables and views
-- 2. Soft Delete columns (is_deleted)
-- 3. Categories and UOM tables
-- 4. Corrected Inventory Logic
-- ========================================================

-- CLEANUP (Ensures a fresh setup)
-- Drop Views
DROP VIEW IF EXISTS aging_report CASCADE;
DROP VIEW IF EXISTS collection_alerts CASCADE;
DROP VIEW IF EXISTS financial_summary CASCADE;

-- Drop Tables (Order matters because of Foreign Keys)
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

-- Drop Types
DROP TYPE IF EXISTS product_type_enum CASCADE;
DROP TYPE IF EXISTS payment_terms_enum CASCADE;
DROP TYPE IF EXISTS transaction_type_enum CASCADE;
DROP TYPE IF EXISTS entity_type_enum CASCADE;
DROP TYPE IF EXISTS movement_type_enum CASCADE;

-- ================================================
-- 1. UTILITY TYPES & TABLES
-- ================================================

CREATE TYPE product_type_enum AS ENUM ('RESALE', 'RAW_MATERIAL', 'CONSUMABLE', 'ASSET');
CREATE TYPE payment_terms_enum AS ENUM ('CASH', 'CREDIT', 'HYBRID_SALES_LINKED');
CREATE TYPE transaction_type_enum AS ENUM ('INVOICE', 'PAYMENT', 'RETURN', 'CREDIT_NOTE', 'DEBIT_NOTE');
CREATE TYPE entity_type_enum AS ENUM ('VENDOR', 'CLIENT');
CREATE TYPE movement_type_enum AS ENUM ('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'CONSUMPTION');

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
    CONSTRAINT fk_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
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
    category_id UUID REFERENCES product_categories(id),
    preferred_vendor_id UUID REFERENCES vendors(id),
    default_warehouse_id UUID REFERENCES warehouses(id),
    default_department_id UUID REFERENCES departments(id),
    unit VARCHAR(50) DEFAULT 'unit',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE inventory_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES warehouses(id),
    location_id UUID REFERENCES locations(id), -- Optional, can be NULL if generic loc
    product_id UUID REFERENCES products(id),
    quantity_on_hand DECIMAL(15, 4) DEFAULT 0,
    quantity_reserved DECIMAL(15, 4) DEFAULT 0,
    CONSTRAINT unique_stock_loc UNIQUE (warehouse_id, product_id, location_id)
);

CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    batch_number VARCHAR(100) NOT NULL,
    expiry_date DATE,
    quantity DECIMAL(15, 4) DEFAULT 0
);

-- ================================================
-- 3. FINANCIAL & MOVEMENTS
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
WHERE fl.entity_type = 'CLIENT' AND fl.type = 'INVOICE' AND fl.paid_date IS NULL AND fl.due_date < CURRENT_DATE AND c.is_deleted = FALSE;

CREATE OR REPLACE VIEW aging_report AS
SELECT fl.entity_id AS client_id, c.name AS client_name, c.category, c.phone, SUM(CASE WHEN (CURRENT_DATE - fl.due_date) BETWEEN 0 AND 30 THEN fl.amount ELSE 0 END) AS aging_0_30, SUM(CASE WHEN (CURRENT_DATE - fl.due_date) BETWEEN 31 AND 60 THEN fl.amount ELSE 0 END) AS aging_31_60, SUM(CASE WHEN (CURRENT_DATE - fl.due_date) > 60 THEN fl.amount ELSE 0 END) AS aging_61_plus, SUM(fl.amount) AS total_overdue, c.current_balance, c.credit_limit
FROM financial_ledger fl JOIN clients c ON fl.entity_id = c.id
WHERE fl.entity_type = 'CLIENT' AND fl.type = 'INVOICE' AND fl.paid_date IS NULL AND fl.due_date < CURRENT_DATE AND c.is_deleted = FALSE
GROUP BY fl.entity_id, c.name, c.category, c.phone, c.current_balance, c.credit_limit;

CREATE OR REPLACE VIEW financial_summary AS
SELECT 
    (SELECT COALESCE(SUM(current_balance), 0) FROM vendors WHERE is_deleted = FALSE) AS total_payables, 
    (SELECT COALESCE(SUM(current_balance), 0) FROM clients WHERE is_deleted = FALSE) AS total_receivables, 
    (SELECT COALESCE(SUM(current_balance), 0) FROM clients WHERE is_deleted = FALSE) - (SELECT COALESCE(SUM(current_balance), 0) FROM vendors WHERE is_deleted = FALSE) AS net_position, 
    (SELECT COUNT(*) FROM financial_ledger WHERE entity_type = 'CLIENT' AND type = 'INVOICE' AND paid_date IS NULL AND due_date < CURRENT_DATE) AS overdue_invoices_count, 
    (SELECT COALESCE(SUM(amount), 0) FROM financial_ledger WHERE entity_type = 'CLIENT' AND type = 'INVOICE' AND paid_date IS NULL AND due_date < CURRENT_DATE) AS overdue_amount;

-- ================================================
-- 5. SEED DATA
-- ================================================

INSERT INTO product_categories (name) VALUES 
('Electronics'), ('Furniture'), ('Stationery'), ('Services') ON CONFLICT DO NOTHING;

INSERT INTO uoms (name, symbol) VALUES 
('Piece', 'pcs'), ('Box', 'box'), ('Kilogram', 'kg') ON CONFLICT DO NOTHING;

INSERT INTO departments (id, name, cost_center_code, budget_cap) VALUES
(gen_random_uuid(), 'العمليات', 'OPS-001', 50000.00),
(gen_random_uuid(), 'المبيعات', 'SAL-001', 20000.00),
(gen_random_uuid(), 'تقنية المعلومات', 'IT-001', 15000.00);

INSERT INTO warehouses (name, location_address) VALUES
('المستودع الرئيسي', 'الرياض - المنطقة الصناعية'),
('مستودع الشرقية', 'الدمام - الميناء');

-- Note: We can't guarantee IDs in seed data easily with UUIDs unless we force them, 
-- but for a fresh setup, letting DB generate them is safer to avoid conflicts.
-- The previous hardcoded IDs might fail if we re-run.