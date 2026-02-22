-- ================================================================
-- TAWSEEL STORE - COMPLETE DATABASE SETUP
-- Includes: Core, Financial, Movements, Serialization, Permissions
-- Version: 4.0 - Clean & Organized
-- ================================================================

-- ============================================
-- PART 0: CLEANUP (Fresh Start)
-- ============================================

DROP VIEW IF EXISTS v_serial_inventory_count CASCADE;
DROP VIEW IF EXISTS v_serial_movement_history CASCADE;
DROP VIEW IF EXISTS v_available_serials CASCADE;
DROP VIEW IF EXISTS aging_report CASCADE;
DROP VIEW IF EXISTS collection_alerts CASCADE;
DROP VIEW IF EXISTS financial_summary CASCADE;

DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS module_actions CASCADE;
DROP TABLE IF EXISTS actions CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS product_serials CASCADE;
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS stock_issue_requests CASCADE;
DROP TABLE IF EXISTS financial_ledger CASCADE;
DROP TABLE IF EXISTS inventory_stock CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS inventory_beneficiaries CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS uoms CASCADE;

DROP FUNCTION IF EXISTS update_serial_status CASCADE;
DROP FUNCTION IF EXISTS serial_exists CASCADE;
DROP FUNCTION IF EXISTS get_serial_count CASCADE;
DROP FUNCTION IF EXISTS update_serial_timestamp CASCADE;
DROP FUNCTION IF EXISTS get_user_permissions CASCADE;
DROP FUNCTION IF EXISTS user_has_permission CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS generate_product_serials CASCADE;
DROP FUNCTION IF EXISTS process_purchase_receipt CASCADE;
DROP FUNCTION IF EXISTS process_issue_request CASCADE;

DROP TYPE IF EXISTS product_type_enum CASCADE;
DROP TYPE IF EXISTS payment_terms_enum CASCADE;
DROP TYPE IF EXISTS transaction_type_enum CASCADE;
DROP TYPE IF EXISTS entity_type_enum CASCADE;
DROP TYPE IF EXISTS movement_type_enum CASCADE;
DROP TYPE IF EXISTS beneficiary_type_enum CASCADE;
DROP TYPE IF EXISTS issue_purpose_enum CASCADE;
DROP TYPE IF EXISTS issue_status_enum CASCADE;
DROP TYPE IF EXISTS po_status_enum CASCADE;

-- ============================================
-- PART 1: ENUMS (With existence checks)
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_type_enum') THEN
        CREATE TYPE product_type_enum AS ENUM ('RESALE', 'RAW_MATERIAL', 'CONSUMABLE', 'ASSET');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_terms_enum') THEN
        CREATE TYPE payment_terms_enum AS ENUM ('CASH', 'CREDIT', 'HYBRID_SALES_LINKED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type_enum') THEN
        CREATE TYPE transaction_type_enum AS ENUM ('INVOICE', 'PAYMENT', 'RETURN', 'CREDIT_NOTE', 'DEBIT_NOTE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_type_enum') THEN
        CREATE TYPE entity_type_enum AS ENUM ('VENDOR', 'CLIENT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_type_enum') THEN
        CREATE TYPE movement_type_enum AS ENUM ('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'CONSUMPTION');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'beneficiary_type_enum') THEN
        CREATE TYPE beneficiary_type_enum AS ENUM ('EXTERNAL_CLIENT', 'DELIVERY_DRIVER', 'COMPANY_EMPLOYEE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'issue_purpose_enum') THEN
        CREATE TYPE issue_purpose_enum AS ENUM ('UNIFORM', 'DELIVERY_BAG', 'CONSUMABLE_CUSTODY');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'issue_status_enum') THEN
        CREATE TYPE issue_status_enum AS ENUM ('PENDING', 'APPROVED', 'ISSUED', 'REJECTED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'po_status_enum') THEN
        CREATE TYPE po_status_enum AS ENUM ('DRAFT', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');
    END IF;
END $$;

-- ============================================
-- PART 2: CORE SCHEMA
-- ============================================

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
    name VARCHAR(255) NOT NULL UNIQUE,
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

CREATE TABLE inventory_beneficiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    beneficiary_code VARCHAR(50) UNIQUE NOT NULL,
    type beneficiary_type_enum NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    department_id UUID REFERENCES departments(id),
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
    uom_id UUID REFERENCES uoms(id),
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

-- ============================================
-- PART 3: FINANCIAL SCHEMA
-- ============================================

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
    -- Polymorphic-like links (FK added via ALTER TABLE later)
    purchase_order_id UUID,
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
    beneficiary_id UUID REFERENCES inventory_beneficiaries(id),
    reference_doc_id VARCHAR(100),
    uom_id UUID REFERENCES uoms(id),
    user_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_date DATE,
    status po_status_enum NOT NULL DEFAULT 'DRAFT',
    notes TEXT,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    warehouse_id UUID REFERENCES warehouses(id),
    quantity_ordered DECIMAL(15, 4) NOT NULL CHECK (quantity_ordered > 0),
    quantity_received DECIMAL(15, 4) NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
    uom_id UUID REFERENCES uoms(id),
    unit_cost DECIMAL(15, 4) NOT NULL CHECK (unit_cost >= 0),
    line_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE stock_issue_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_code VARCHAR(50) UNIQUE NOT NULL,
    beneficiary_id UUID NOT NULL REFERENCES inventory_beneficiaries(id),
    beneficiary_type beneficiary_type_enum NOT NULL,
    department_id UUID REFERENCES departments(id),
    product_id UUID NOT NULL REFERENCES products(id),
    quantity DECIMAL(15, 4) NOT NULL CHECK (quantity > 0),
    uom_id UUID REFERENCES uoms(id),
    purpose issue_purpose_enum NOT NULL,
    status issue_status_enum NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    requested_by VARCHAR(100),
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    issued_at TIMESTAMP WITH TIME ZONE,
    receiver_employee_name VARCHAR(255),
    issued_movement_id UUID REFERENCES stock_movements(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART 4: SERIALIZATION SCHEMA
-- ============================================

CREATE TABLE product_serials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    serial_number VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'AVAILABLE',
    warehouse_id UUID REFERENCES warehouses(id),
    location_id UUID REFERENCES locations(id),
    movement_in_id UUID REFERENCES stock_movements(id),
    movement_out_id UUID REFERENCES stock_movements(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_product_serial UNIQUE(product_id, serial_number),
    CONSTRAINT chk_serial_number_not_empty CHECK (LENGTH(TRIM(serial_number)) > 0),
    CONSTRAINT chk_serial_status_valid CHECK (status IN ('AVAILABLE', 'SOLD', 'RESERVED', 'DAMAGED', 'RETURNED'))
);

ALTER TABLE financial_ledger
ADD CONSTRAINT fk_financial_ledger_po
FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id);

-- ============================================
-- PART 5: PERMISSIONS SCHEMA
-- ============================================

CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    display_name_en VARCHAR(100),
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(20) UNIQUE NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    display_name_en VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE module_actions (
    module_id UUID NOT NULL,
    action_id UUID NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (module_id, action_id),
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL,
    module_id UUID NOT NULL,
    action_id UUID NOT NULL,
    has_permission BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (role_id, module_id, action_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id, action_id) REFERENCES module_actions(module_id, action_id) ON DELETE CASCADE
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role_id UUID NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE user_permissions (
    user_id UUID NOT NULL,
    module_id UUID NOT NULL,
    action_id UUID NOT NULL,
    has_permission BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, module_id, action_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id, action_id) REFERENCES module_actions(module_id, action_id) ON DELETE CASCADE
);

-- ============================================
-- PART 6: INDEXES
-- ============================================

-- Serialization Indexes
CREATE INDEX idx_serials_product_id ON product_serials(product_id);
CREATE INDEX idx_serials_warehouse_id ON product_serials(warehouse_id);
CREATE INDEX idx_serials_location_id ON product_serials(location_id);
CREATE INDEX idx_serials_serial_number ON product_serials(serial_number);
CREATE INDEX idx_serials_status ON product_serials(status);
CREATE INDEX idx_serials_product_warehouse_status ON product_serials(product_id, warehouse_id, status) WHERE is_deleted = FALSE;
CREATE INDEX idx_serials_movement_in ON product_serials(movement_in_id);
CREATE INDEX idx_serials_movement_out ON product_serials(movement_out_id);

-- Permissions Indexes
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX idx_beneficiaries_type ON inventory_beneficiaries(type) WHERE is_deleted = FALSE;
CREATE INDEX idx_beneficiaries_department ON inventory_beneficiaries(department_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_issue_requests_status ON stock_issue_requests(status) WHERE is_deleted = FALSE;
CREATE INDEX idx_issue_requests_beneficiary ON stock_issue_requests(beneficiary_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_stock_movements_beneficiary ON stock_movements(beneficiary_id);
CREATE INDEX idx_purchase_orders_vendor ON purchase_orders(vendor_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status) WHERE is_deleted = FALSE;
CREATE INDEX idx_purchase_orders_order_date ON purchase_orders(order_date);
CREATE INDEX idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_purchase_order_items_product ON purchase_order_items(product_id);

-- ============================================
-- PART 7: VIEWS
-- ============================================

-- Financial Views
CREATE OR REPLACE VIEW collection_alerts AS
SELECT fl.id AS alert_id, fl.entity_id AS client_id, fl.entity_name AS client_name, 
       fl.reference_doc_id AS invoice_id, fl.transaction_date AS invoice_date, fl.due_date, 
       fl.amount, CURRENT_DATE - fl.due_date AS days_overdue, c.current_balance, 
       c.credit_limit, c.phone, c.gps_location
FROM financial_ledger fl 
JOIN clients c ON fl.entity_id = c.id
WHERE fl.entity_type = 'CLIENT' AND fl.type = 'INVOICE' AND fl.paid_date IS NULL AND fl.due_date < CURRENT_DATE;

CREATE OR REPLACE VIEW aging_report AS
SELECT fl.entity_id AS client_id, c.name AS client_name, c.category, c.phone, 
       SUM(CASE WHEN (CURRENT_DATE - fl.due_date) BETWEEN 0 AND 30 THEN fl.amount ELSE 0 END) AS aging_0_30, 
       SUM(CASE WHEN (CURRENT_DATE - fl.due_date) BETWEEN 31 AND 60 THEN fl.amount ELSE 0 END) AS aging_31_60, 
       SUM(CASE WHEN (CURRENT_DATE - fl.due_date) > 60 THEN fl.amount ELSE 0 END) AS aging_61_plus, 
       SUM(fl.amount) AS total_overdue, c.current_balance, c.credit_limit
FROM financial_ledger fl 
JOIN clients c ON fl.entity_id = c.id
WHERE fl.entity_type = 'CLIENT' AND fl.type = 'INVOICE' AND fl.paid_date IS NULL AND fl.due_date < CURRENT_DATE
GROUP BY fl.entity_id, c.name, c.category, c.phone, c.current_balance, c.credit_limit;

CREATE OR REPLACE VIEW financial_summary AS
SELECT 
    (SELECT COALESCE(SUM(current_balance), 0) FROM vendors) AS total_payables, 
    (SELECT COALESCE(SUM(current_balance), 0) FROM clients) AS total_receivables, 
    (SELECT COALESCE(SUM(current_balance), 0) FROM clients) - (SELECT COALESCE(SUM(current_balance), 0) FROM vendors) AS net_position, 
    (SELECT COUNT(*) FROM financial_ledger WHERE entity_type = 'CLIENT' AND type = 'INVOICE' AND paid_date IS NULL AND due_date < CURRENT_DATE) AS overdue_invoices_count, 
    (SELECT COALESCE(SUM(amount), 0) FROM financial_ledger WHERE entity_type = 'CLIENT' AND type = 'INVOICE' AND paid_date IS NULL AND due_date < CURRENT_DATE) AS overdue_amount;

-- Serialization Views
CREATE OR REPLACE VIEW v_available_serials AS
SELECT 
    ps.id as serial_id, ps.serial_number,
    p.id as product_id, p.sku, p.name as product_name, p.type as product_type,
    w.id as warehouse_id, w.name as warehouse_name,
    l.id as location_id, l.bin_code as location_code,
    ps.status, ps.created_at, ps.updated_at
FROM product_serials ps
INNER JOIN products p ON ps.product_id = p.id
LEFT JOIN warehouses w ON ps.warehouse_id = w.id
LEFT JOIN locations l ON ps.location_id = l.id
WHERE ps.is_deleted = FALSE AND ps.status = 'AVAILABLE';

CREATE OR REPLACE VIEW v_serial_movement_history AS
SELECT 
    ps.id as serial_id, ps.serial_number, p.sku, p.name as product_name,
    sm_in.id as movement_in_id, sm_in.transaction_date as received_date, sm_in.type as receive_type, w_in.name as received_warehouse,
    sm_out.id as movement_out_id, sm_out.transaction_date as dispatched_date, sm_out.type as dispatch_type, w_out.name as dispatched_to,
    ps.status as current_status
FROM product_serials ps
INNER JOIN products p ON ps.product_id = p.id
LEFT JOIN stock_movements sm_in ON ps.movement_in_id = sm_in.id
LEFT JOIN warehouses w_in ON sm_in.warehouse_to_id = w_in.id
LEFT JOIN stock_movements sm_out ON ps.movement_out_id = sm_out.id
LEFT JOIN warehouses w_out ON sm_out.warehouse_from_id = w_out.id
WHERE ps.is_deleted = FALSE;

CREATE OR REPLACE VIEW v_serial_inventory_count AS
SELECT 
    p.id as product_id, p.sku, p.name as product_name,
    w.id as warehouse_id, w.name as warehouse_name,
    ps.status, COUNT(ps.id) as serial_count
FROM products p
INNER JOIN product_serials ps ON p.id = ps.product_id
LEFT JOIN warehouses w ON ps.warehouse_id = w.id
WHERE ps.is_deleted = FALSE
GROUP BY p.id, p.sku, p.name, w.id, w.name, ps.status
ORDER BY p.name, w.name, ps.status;

-- ============================================
-- PART 8: FUNCTIONS
-- ============================================

-- Generic timestamp updater
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Serialization function
CREATE OR REPLACE FUNCTION generate_product_serials(
    p_product_id UUID,
    p_warehouse_id UUID,
    p_movement_id UUID,
    p_start_number BIGINT,
    p_prefix VARCHAR(50),
    p_suffix VARCHAR(50),
    p_quantity INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_i INTEGER;
    v_serial_text VARCHAR(100);
BEGIN
    FOR v_i IN 0..(p_quantity - 1) LOOP
        v_serial_text := COALESCE(p_prefix, '') || (p_start_number + v_i)::VARCHAR || COALESCE(p_suffix, '');
        
        INSERT INTO product_serials (product_id, serial_number, warehouse_id, movement_in_id) 
        VALUES (p_product_id, v_serial_text, p_warehouse_id, p_movement_id) 
        ON CONFLICT (product_id, serial_number) DO NOTHING;
        
        IF FOUND THEN
            v_count := v_count + 1;
        END IF;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Purchase order receipt function
CREATE OR REPLACE FUNCTION process_purchase_receipt(
    p_po_id UUID,
    p_receipt_items JSONB,
    p_user_name VARCHAR DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_item RECORD;
    v_receive_qty DECIMAL(15, 4);
    v_processed_count INTEGER := 0;
    v_total_ordered DECIMAL(15, 4);
    v_total_received DECIMAL(15, 4);
    v_po_number VARCHAR(50);
    v_vendor_id UUID;
    v_movement_id UUID;
BEGIN
    SELECT po_number, vendor_id
    INTO v_po_number, v_vendor_id
    FROM purchase_orders
    WHERE id = p_po_id AND is_deleted = FALSE;

    IF v_po_number IS NULL THEN
        RAISE EXCEPTION 'Purchase order not found or deleted: %', p_po_id;
    END IF;

    IF p_receipt_items IS NULL OR jsonb_typeof(p_receipt_items) <> 'array' THEN
        RAISE EXCEPTION 'Receipt items must be a JSON array';
    END IF;

    FOR v_item IN
        SELECT *
        FROM jsonb_to_recordset(p_receipt_items) AS x(
            purchase_order_item_id UUID,
            quantity_received DECIMAL,
            warehouse_id UUID
        )
    LOOP
        IF v_item.quantity_received IS NULL OR v_item.quantity_received <= 0 THEN
            CONTINUE;
        END IF;

        SELECT (poi.quantity_ordered - poi.quantity_received)
        INTO v_receive_qty
        FROM purchase_order_items poi
        WHERE poi.id = v_item.purchase_order_item_id
          AND poi.purchase_order_id = p_po_id;

        IF v_receive_qty IS NULL THEN
            RAISE EXCEPTION 'PO item % does not belong to PO %', v_item.purchase_order_item_id, p_po_id;
        END IF;

        IF v_item.quantity_received > v_receive_qty THEN
            RAISE EXCEPTION 'Received quantity (%.4f) exceeds remaining quantity (%.4f) for item %',
                v_item.quantity_received, v_receive_qty, v_item.purchase_order_item_id;
        END IF;

        INSERT INTO stock_movements (
            type,
            product_id,
            product_name,
            warehouse_to_id,
            quantity,
            unit_cost,
            total_amount,
            vendor_id,
            reference_doc_id,
            user_id,
            notes
        )
        SELECT
            'IN',
            poi.product_id,
            p.name,
            COALESCE(v_item.warehouse_id, poi.warehouse_id, p.default_warehouse_id),
            v_item.quantity_received,
            poi.unit_cost,
            (v_item.quantity_received * poi.unit_cost),
            v_vendor_id,
            p_po_id,
            NULL,
            COALESCE(p_notes, 'PO Receipt - ' || v_po_number)
        FROM purchase_order_items poi
        JOIN products p ON p.id = poi.product_id
        WHERE poi.id = v_item.purchase_order_item_id
        RETURNING id INTO v_movement_id;

        INSERT INTO inventory_stock (
            warehouse_id,
            location_id,
            product_id,
            quantity_on_hand,
            quantity_reserved
        )
        SELECT
            COALESCE(v_item.warehouse_id, poi.warehouse_id, p.default_warehouse_id),
            NULL,
            poi.product_id,
            v_item.quantity_received,
            0
        FROM purchase_order_items poi
        JOIN products p ON p.id = poi.product_id
        WHERE poi.id = v_item.purchase_order_item_id
        ON CONFLICT ON CONSTRAINT unique_stock_loc
        DO UPDATE SET quantity_on_hand = inventory_stock.quantity_on_hand + EXCLUDED.quantity_on_hand;

        UPDATE purchase_order_items
        SET quantity_received = quantity_received + v_item.quantity_received,
            updated_at = NOW()
        WHERE id = v_item.purchase_order_item_id;

        v_processed_count := v_processed_count + 1;
    END LOOP;

    IF v_processed_count = 0 THEN
        RAISE EXCEPTION 'No valid receipt lines were provided';
    END IF;

    SELECT
        COALESCE(SUM(quantity_ordered), 0),
        COALESCE(SUM(quantity_received), 0)
    INTO v_total_ordered, v_total_received
    FROM purchase_order_items
    WHERE purchase_order_id = p_po_id;

    UPDATE purchase_orders
    SET status = CASE
            WHEN v_total_received = 0 THEN status
            WHEN v_total_received < v_total_ordered THEN 'PARTIALLY_RECEIVED'::po_status_enum
            ELSE 'RECEIVED'::po_status_enum
        END,
        received_at = CASE WHEN v_total_received >= v_total_ordered THEN NOW() ELSE received_at END,
        updated_at = NOW()
    WHERE id = p_po_id;

    RETURN v_processed_count;
END;
$$ LANGUAGE plpgsql;

-- Issue request processing function
CREATE OR REPLACE FUNCTION process_issue_request(
    p_request_id UUID,
    p_receiver_employee_name VARCHAR DEFAULT NULL,
    p_issued_by VARCHAR DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_req RECORD;
    v_default_warehouse_id UUID;
    v_available_qty DECIMAL(15, 4);
    v_movement_id UUID;
BEGIN
    SELECT *
    INTO v_req
    FROM stock_issue_requests
    WHERE id = p_request_id
      AND is_deleted = FALSE
      AND status = 'APPROVED';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Issue request must exist and be APPROVED: %', p_request_id;
    END IF;

    SELECT default_warehouse_id
    INTO v_default_warehouse_id
    FROM products
    WHERE id = v_req.product_id;

    IF v_default_warehouse_id IS NULL THEN
        RAISE EXCEPTION 'No default warehouse configured for product %', v_req.product_id;
    END IF;

    SELECT COALESCE(quantity_on_hand, 0)
    INTO v_available_qty
    FROM inventory_stock
    WHERE warehouse_id = v_default_warehouse_id
      AND product_id = v_req.product_id
      AND location_id IS NULL
    LIMIT 1;

    IF COALESCE(v_available_qty, 0) < v_req.quantity THEN
        RAISE EXCEPTION 'Insufficient stock: available %.4f required %.4f', COALESCE(v_available_qty, 0), v_req.quantity;
    END IF;

    INSERT INTO stock_movements (
        type,
        product_id,
        product_name,
        warehouse_from_id,
        department_id,
        quantity,
        unit_cost,
        total_amount,
        beneficiary_id,
        reference_doc_id,
        notes
    )
    SELECT
        'CONSUMPTION',
        p.id,
        p.name,
        v_default_warehouse_id,
        v_req.department_id,
        v_req.quantity,
        p.current_wac_cost,
        (v_req.quantity * p.current_wac_cost),
        v_req.beneficiary_id,
        v_req.id,
        COALESCE(p_notes, 'Issue request execution: ' || v_req.request_code)
    FROM products p
    WHERE p.id = v_req.product_id
    RETURNING id INTO v_movement_id;

    UPDATE inventory_stock
    SET quantity_on_hand = quantity_on_hand - v_req.quantity
    WHERE warehouse_id = v_default_warehouse_id
      AND product_id = v_req.product_id
      AND location_id IS NULL;

    UPDATE stock_issue_requests
    SET status = 'ISSUED',
        issued_at = NOW(),
        approved_by = COALESCE(approved_by, p_issued_by),
        approved_at = COALESCE(approved_at, NOW()),
        receiver_employee_name = p_receiver_employee_name,
        issued_movement_id = v_movement_id,
        notes = COALESCE(notes, '') || CASE WHEN p_notes IS NOT NULL THEN E'\nIssue Notes: ' || p_notes ELSE '' END,
        updated_at = NOW()
    WHERE id = p_request_id;

    RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

-- Serial management functions
CREATE OR REPLACE FUNCTION get_serial_count(p_product_id UUID, p_status VARCHAR DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE v_count INTEGER;
BEGIN
    IF p_status IS NULL THEN
        SELECT COUNT(*) INTO v_count FROM product_serials WHERE product_id = p_product_id AND is_deleted = FALSE;
    ELSE
        SELECT COUNT(*) INTO v_count FROM product_serials WHERE product_id = p_product_id AND status = p_status AND is_deleted = FALSE;
    END IF;
    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION serial_exists(p_product_id UUID, p_serial_number VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM product_serials WHERE product_id = p_product_id AND serial_number = p_serial_number AND is_deleted = FALSE) INTO v_exists;
    RETURN v_exists;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_serial_status(p_serial_id UUID, p_new_status VARCHAR, p_movement_out_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE product_serials SET status = p_new_status, movement_out_id = COALESCE(p_movement_out_id, movement_out_id), updated_at = NOW()
    WHERE id = p_serial_id AND is_deleted = FALSE;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Permissions functions
CREATE OR REPLACE FUNCTION user_has_permission(p_user_id UUID, p_module_name VARCHAR, p_action_name VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN;
    v_module_id UUID;
    v_action_id UUID;
    v_role_id UUID;
BEGIN
    SELECT id INTO v_module_id FROM modules WHERE name = p_module_name AND is_active = TRUE;
    SELECT id INTO v_action_id FROM actions WHERE name = p_action_name;
    
    IF v_module_id IS NULL OR v_action_id IS NULL THEN RETURN FALSE; END IF;
    
    IF NOT EXISTS (SELECT 1 FROM module_actions WHERE module_id = v_module_id AND action_id = v_action_id AND is_available = TRUE) THEN
        RETURN FALSE;
    END IF;
    
    SELECT has_permission INTO v_has_permission FROM user_permissions
    WHERE user_id = p_user_id AND module_id = v_module_id AND action_id = v_action_id;
    
    IF FOUND THEN RETURN v_has_permission; END IF;
    
    SELECT role_id INTO v_role_id FROM users WHERE id = p_user_id;
    SELECT COALESCE(has_permission, FALSE) INTO v_has_permission FROM role_permissions
    WHERE role_id = v_role_id AND module_id = v_module_id AND action_id = v_action_id;
    
    RETURN COALESCE(v_has_permission, FALSE);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE(module_name VARCHAR, module_display_name VARCHAR, action_name VARCHAR, action_display_name VARCHAR, has_permission BOOLEAN, source VARCHAR) AS $$
BEGIN
    RETURN QUERY
    WITH user_role AS (SELECT role_id FROM users WHERE id = p_user_id)
    SELECT m.name, m.display_name, a.name, a.display_name,
           COALESCE(up.has_permission, rp.has_permission, FALSE) as has_permission,
           CASE WHEN up.has_permission IS NOT NULL THEN 'user' ELSE 'role' END as source
    FROM modules m
    CROSS JOIN actions a
    INNER JOIN module_actions ma ON m.id = ma.module_id AND a.id = ma.action_id
    LEFT JOIN user_permissions up ON up.user_id = p_user_id AND up.module_id = m.id AND up.action_id = a.id
    LEFT JOIN role_permissions rp ON rp.role_id = (SELECT role_id FROM user_role) AND rp.module_id = m.id AND rp.action_id = a.id
    WHERE m.is_active = TRUE AND ma.is_available = TRUE
    ORDER BY m.sort_order, m.display_name, a.sort_order, a.display_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 9: TRIGGERS
-- ============================================

CREATE TRIGGER trigger_update_serial_timestamp BEFORE UPDATE ON product_serials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_beneficiaries_updated_at BEFORE UPDATE ON inventory_beneficiaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_issue_requests_updated_at BEFORE UPDATE ON stock_issue_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_order_items_updated_at BEFORE UPDATE ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 10: ROW LEVEL SECURITY (Disabled)
-- ============================================

ALTER TABLE product_serials DISABLE ROW LEVEL SECURITY;
ALTER TABLE modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE module_actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_beneficiaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_issue_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 11: SEED DATA
-- ============================================

-- Departments
INSERT INTO departments (id, name, cost_center_code, budget_cap) VALUES
(gen_random_uuid(), 'العمليات', 'OPS-001', 50000.00),
(gen_random_uuid(), 'المبيعات', 'SAL-001', 20000.00),
(gen_random_uuid(), 'تقنية المعلومات', 'IT-001', 15000.00);

-- Warehouses
INSERT INTO warehouses (id, name, location_address, is_active) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'المستودع الرئيسي', 'الرياض - المنطقة الصناعية', TRUE),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'مستودع الشرقية', 'الدمام - الميناء', TRUE);

-- Product Categories
INSERT INTO product_categories (id, name) VALUES
('50000001-0000-0000-0000-000000000001', 'الهواتف الذكية'),
('50000001-0000-0000-0000-000000000002', 'الأجهزة اللوحية'),
('50000001-0000-0000-0000-000000000003', 'الملحقات والإكسسوارات'),
('50000001-0000-0000-0000-000000000004', 'القرطاسية والأدوات المكتبية')
ON CONFLICT (name) DO NOTHING;

-- Units of Measure (UOM)
INSERT INTO uoms (id, name, symbol) VALUES
('60000001-0000-0000-0000-000000000001', 'حبة', 'pc'),
('60000001-0000-0000-0000-000000000002', 'كرتون', 'ctn'),
('60000001-0000-0000-0000-000000000003', 'متر', 'm'),
('60000001-0000-0000-0000-000000000004', 'كيلوجرام', 'kg'),
('60000001-0000-0000-0000-000000000005', 'طقم', 'set')
ON CONFLICT (name) DO NOTHING;

-- Locations
INSERT INTO locations (id, warehouse_id, zone, aisle, rack, bin_code) VALUES
(gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'A', '1', '1', 'A-1-1-01'),
(gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'A', '1', '2', 'A-1-2-01'),
(gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'B', '1', '1', 'B-1-1-01');

-- Products
INSERT INTO products (id, sku, name, description, type, min_reorder_level, current_wac_cost, is_serialized, uom_id, category_id) VALUES
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'iphone-15-pro', 'iPhone 15 Pro 256GB', 'Apple Smartphone', 'RESALE', 10, 4200.00, TRUE, '60000001-0000-0000-0000-000000000001', '50000001-0000-0000-0000-000000000001'),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'samsung-s24', 'Samsung S24 Ultra', 'Samsung Smartphone', 'RESALE', 5, 3800.00, TRUE, '60000001-0000-0000-0000-000000000001', '50000001-0000-0000-0000-000000000001'),
(gen_random_uuid(), 'paper-a4', 'ورق طباعة A4', 'كرتون 500 ورقة', 'CONSUMABLE', 20, 15.00, FALSE, '60000001-0000-0000-0000-000000000002', '50000001-0000-0000-0000-000000000004');

-- Operational issue products (uniforms, delivery bags, consumable custody)
INSERT INTO products (id, sku, name, description, type, min_reorder_level, current_wac_cost, is_serialized, uom_id, category_id) VALUES
(gen_random_uuid(), 'uniform-kit', 'Uniform Kit', 'Driver uniform issuance kit', 'CONSUMABLE', 30, 120.00, FALSE, '60000001-0000-0000-0000-000000000005', '50000001-0000-0000-0000-000000000003'),
(gen_random_uuid(), 'delivery-bag', 'Delivery Bag', 'Bag issued to delivery drivers', 'ASSET', 20, 180.00, TRUE, '60000001-0000-0000-0000-000000000001', '50000001-0000-0000-0000-000000000003'),
(gen_random_uuid(), 'employee-custody-pack', 'Employee Consumable Custody Pack', 'Consumables issued to internal employees', 'CONSUMABLE', 40, 75.00, FALSE, '60000001-0000-0000-0000-000000000001', '50000001-0000-0000-0000-000000000004')
ON CONFLICT (sku) DO NOTHING;
-- Vendors
INSERT INTO vendors (id, vendor_code, name, contact_person, phone, payment_terms, cash_percentage, commission_per_unit) VALUES
(gen_random_uuid(), 'VEN-001', 'شركة التوريدات المتحدة', 'أحمد محمد', '+966501234567', 'HYBRID_SALES_LINKED', 30.00, 5.00),
(gen_random_uuid(), 'VEN-002', 'مؤسسة الإمدادات الحديثة', 'خالد عبدالله', '+966502345678', 'CREDIT', NULL, NULL);

-- Clients
INSERT INTO clients (id, client_code, name, contact_person, phone, gps_location, category, collection_period_days, credit_limit) VALUES
(gen_random_uuid(), 'CLI-001', 'سوبر ماركت النخيل', 'فهد السعيد', '+966504567890', '24.7136,46.6753', 'Retail', 15, 50000.00),
(gen_random_uuid(), 'CLI-002', 'مجموعة الرياض التجارية', 'سعد المطيري', '+966505678901', '24.7500,46.7000', 'Wholesale', 30, 150000.00);
-- Beneficiaries: external clients, drivers, and company employees
INSERT INTO inventory_beneficiaries (beneficiary_code, type, name, phone, department_id) VALUES
('BEN-EXT-001', 'EXTERNAL_CLIENT', 'External Client - Al Nakheel', '+966504567890', NULL),
('BEN-DRV-001', 'DELIVERY_DRIVER', 'Driver - Abdulrahman Saleh', '+966500111222', (SELECT id FROM departments WHERE cost_center_code = 'OPS-001' LIMIT 1)),
('BEN-EMP-001', 'COMPANY_EMPLOYEE', 'Employee - IT Support', '+966500333444', (SELECT id FROM departments WHERE cost_center_code = 'IT-001' LIMIT 1))
ON CONFLICT (beneficiary_code) DO NOTHING;
-- Initial Inventory
INSERT INTO inventory_stock (id, warehouse_id, product_id, quantity_on_hand, quantity_reserved) VALUES
(gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 50, 0),
(gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 30, 0);

-- Purchase Orders (real test orders)
INSERT INTO purchase_orders (id, po_number, vendor_id, order_date, expected_date, status, notes, total_amount, created_by)
SELECT
    '91000001-0000-0000-0000-000000000001',
    'PO-2026-0001',
    v.id,
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE + INTERVAL '2 days',
    'APPROVED',
    'Weekly smartphone replenishment order',
    122000.00,
    'SYSTEM'
FROM vendors v
WHERE v.vendor_code = 'VEN-001'
ON CONFLICT (po_number) DO NOTHING;

INSERT INTO purchase_order_items (id, purchase_order_id, product_id, warehouse_id, quantity_ordered, quantity_received, uom_id, unit_cost, line_total, notes)
VALUES
('92000001-0000-0000-0000-000000000001', '91000001-0000-0000-0000-000000000001', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 15, 0, '60000001-0000-0000-0000-000000000001', 4100.00, 61500.00, 'Main branch demand'),
('92000001-0000-0000-0000-000000000002', '91000001-0000-0000-0000-000000000001', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 15, 0, '60000001-0000-0000-0000-000000000001', 4033.3333, 60500.00, 'Bundle campaign support')
ON CONFLICT (id) DO NOTHING;

INSERT INTO purchase_orders (id, po_number, vendor_id, order_date, expected_date, status, notes, total_amount, created_by, approved_by, approved_at)
SELECT
    '91000001-0000-0000-0000-000000000002',
    'PO-2026-0002',
    v.id,
    CURRENT_DATE - INTERVAL '10 days',
    CURRENT_DATE - INTERVAL '3 days',
    'PARTIALLY_RECEIVED',
    'Mixed order with partial vendor delivery',
    68400.00,
    'SYSTEM',
    'SYSTEM',
    NOW() - INTERVAL '8 days'
FROM vendors v
WHERE v.vendor_code = 'VEN-002'
ON CONFLICT (po_number) DO NOTHING;

INSERT INTO purchase_order_items (id, purchase_order_id, product_id, warehouse_id, quantity_ordered, quantity_received, uom_id, unit_cost, line_total, notes)
VALUES
('92000001-0000-0000-0000-000000000003', '91000001-0000-0000-0000-000000000002', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 12, 4, '60000001-0000-0000-0000-000000000001', 3900.00, 46800.00, '4 units already received'),
('92000001-0000-0000-0000-000000000004', '91000001-0000-0000-0000-000000000002', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 5, 0, '60000001-0000-0000-0000-000000000001', 4320.00, 21600.00, 'Pending from vendor')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stock_movements (
    id, type, product_id, product_name, warehouse_to_id, quantity, uom_id, unit_cost, total_amount, vendor_id, reference_doc_id, notes
)
SELECT
    '93000001-0000-0000-0000-000000000001',
    'IN',
    p.id,
    p.name,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    4,
    p.uom_id,
    3900.00,
    15600.00,
    po.vendor_id,
    po.id,
    'Seed partial receipt for PO-2026-0002'
FROM purchase_orders po
JOIN products p ON p.id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44'
WHERE po.id = '91000001-0000-0000-0000-000000000002'
ON CONFLICT (id) DO NOTHING;

UPDATE inventory_stock
SET quantity_on_hand = quantity_on_hand + 4
WHERE warehouse_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND product_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

-- Financial Ledger Seed (Link Transactions to Vendors/Clients/Orders)
INSERT INTO financial_ledger (entity_type, entity_id, entity_name, type, amount, balance_after, reference_doc_id, purchase_order_id, due_date, notes)
SELECT 
    'VENDOR', v.id, v.name, 'INVOICE', 122000.00, 122000.00, po.id, po.id, CURRENT_DATE + 30, 'Initial balance for PO-2026-0001'
FROM vendors v, purchase_orders po
WHERE v.vendor_code = 'VEN-001' AND po.po_number = 'PO-2026-0001'
ON CONFLICT (id) DO NOTHING;

INSERT INTO financial_ledger (entity_type, entity_id, entity_name, type, amount, balance_after, notes)
SELECT 
    'CLIENT', c.id, c.name, 'INVOICE', 5000.00, 5000.00, 'Opening balance'
FROM clients c
WHERE c.client_code = 'CLI-001'
ON CONFLICT (id) DO NOTHING;

-- Issue requests seed (driver uniform/bag + employee consumable custody)
INSERT INTO stock_issue_requests (request_code, beneficiary_id, beneficiary_type, department_id, product_id, quantity, uom_id, purpose, status, notes, requested_by)
SELECT
    'ISS-DRV-001',
    b.id,
    b.type,
    b.department_id,
    p.id,
    2,
    p.uom_id,
    'UNIFORM',
    'PENDING',
    'Initial driver uniform request',
    'SYSTEM'
FROM inventory_beneficiaries b
JOIN products p ON p.sku = 'uniform-kit'
WHERE b.beneficiary_code = 'BEN-DRV-001'
ON CONFLICT (request_code) DO NOTHING;

INSERT INTO stock_issue_requests (request_code, beneficiary_id, beneficiary_type, department_id, product_id, quantity, uom_id, purpose, status, notes, requested_by)
SELECT
    'ISS-EMP-001',
    b.id,
    b.type,
    b.department_id,
    p.id,
    5,
    p.uom_id,
    'CONSUMABLE_CUSTODY',
    'PENDING',
    'Initial employee consumable custody',
    'SYSTEM'
FROM inventory_beneficiaries b
JOIN products p ON p.sku = 'employee-custody-pack'
WHERE b.beneficiary_code = 'BEN-EMP-001'
ON CONFLICT (request_code) DO NOTHING;
-- Modules
INSERT INTO modules (id, name, display_name, display_name_en, icon, sort_order) VALUES
('10000001-0000-0000-0000-000000000001', 'dashboard', 'لوحة المعلومات', 'Dashboard', 'LayoutDashboard', 1),
('10000001-0000-0000-0000-000000000002', 'products', 'المنتجات', 'Products', 'Package', 2),
('10000001-0000-0000-0000-000000000003', 'categories', 'الفئات', 'Categories', 'FolderTree', 3),
('10000001-0000-0000-0000-000000000004', 'warehouses', 'المستودعات', 'Warehouses', 'Warehouse', 4),
('10000001-0000-0000-0000-000000000005', 'vendors', 'الموردون', 'Vendors', 'Truck', 5),
('10000001-0000-0000-0000-000000000006', 'clients', 'العملاء', 'Clients', 'Users', 6),
('10000001-0000-0000-0000-000000000007', 'purchase_orders', 'أوامر الشراء', 'Purchase Orders', 'ShoppingCart', 7),
('10000001-0000-0000-0000-000000000008', 'sales_orders', 'أوامر البيع', 'Sales Orders', 'ShoppingBag', 8),
('10000001-0000-0000-0000-000000000009', 'inventory', 'المخزون', 'Inventory', 'Archive', 9),
('10000001-0000-0000-0000-000000000010', 'stock_movements', 'حركات المخزون', 'Stock Movements', 'TrendingUp', 10),
('10000001-0000-0000-0000-000000000011', 'reports', 'التقارير', 'Reports', 'FileText', 11),
('10000001-0000-0000-0000-000000000012', 'users', 'المستخدمون', 'Users', 'UserCog', 12),
('10000001-0000-0000-0000-000000000013', 'roles', 'الأدوار والصلاحيات', 'Roles & Permissions', 'Shield', 13),
('10000001-0000-0000-0000-000000000014', 'system_settings', 'إعدادات النظام', 'System Settings', 'Settings', 14),
('10000001-0000-0000-0000-000000000015', 'beneficiaries', 'المستفيدون', 'Beneficiaries', 'Users', 15),
('10000001-0000-0000-0000-000000000016', 'issue_requests', 'طلبات الصرف', 'Issue Requests', 'ClipboardList', 16)
ON CONFLICT (name) DO NOTHING;

-- Actions
INSERT INTO actions (id, name, display_name, display_name_en, sort_order) VALUES
('20000001-0000-0000-0000-000000000001', 'view', 'عرض', 'View', 1),
('20000001-0000-0000-0000-000000000002', 'create', 'إنشاء', 'Create', 2),
('20000001-0000-0000-0000-000000000003', 'update', 'تعديل', 'Update', 3),
('20000001-0000-0000-0000-000000000004', 'delete', 'حذف', 'Delete', 4),
('20000001-0000-0000-0000-000000000005', 'approve', 'اعتماد', 'Approve', 5),
('20000001-0000-0000-0000-000000000006', 'export', 'تصدير', 'Export', 6),
('20000001-0000-0000-0000-000000000007', 'import', 'استيراد', 'Import', 7),
('20000001-0000-0000-0000-000000000008', 'print', 'طباعة', 'Print', 8)
ON CONFLICT (name) DO NOTHING;

-- Module Actions (Enabled for ALL modules and ALL actions for flexibility)
INSERT INTO module_actions (module_id, action_id)
SELECT m.id, a.id
FROM modules m
CROSS JOIN actions a
ON CONFLICT DO NOTHING;

-- Roles
INSERT INTO roles (id, name, display_name, description, is_system_role) VALUES
('30000001-0000-0000-0000-000000000001', 'admin', 'مدير النظام', 'صلاحيات كاملة على جميع أجزاء النظام', TRUE),
('30000001-0000-0000-0000-000000000002', 'inventory_manager', 'مدير المخزون', 'إدارة المنتجات والمخزون والحركات', FALSE),
('30000001-0000-0000-0000-000000000005', 'viewer', 'مستعرض', 'صلاحيات عرض فقط', FALSE)
ON CONFLICT (name) DO NOTHING;

-- Admin role: all permissions
INSERT INTO role_permissions (role_id, module_id, action_id, has_permission)
SELECT '30000001-0000-0000-0000-000000000001', ma.module_id, ma.action_id, TRUE
FROM module_actions ma
ON CONFLICT (role_id, module_id, action_id) DO UPDATE SET has_permission = TRUE;

-- Default admin user
INSERT INTO users (id, name, email, password_hash, role_id) VALUES
('40000001-0000-0000-0000-000000000001', 'مدير النظام', 'admin@tawseel.com', 'CHANGE_ME', '30000001-0000-0000-0000-000000000001')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- PART 12: FINALIZE
-- ============================================

NOTIFY pgrst, 'reload schema';

-- ================================================================
-- âœ… SETUP COMPLETE
-- ================================================================
-- Summary:
-- âœ“ Core tables (departments, warehouses, products, etc.)
-- âœ“ Financial tables (vendors, clients, ledger)
-- âœ“ Movements table
-- âœ“ Serialization table + functions
-- âœ“ Permissions system (modules, roles, users)
-- âœ“ All indexes, views, triggers  
-- âœ“ Seed data for testing
-- ================================================================




