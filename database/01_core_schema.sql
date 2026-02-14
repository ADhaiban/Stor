-- ================================================
-- 1. Core WMS Schema (Warehouses, Products, Inventory)
-- Source: backend_deliverables.md
-- ================================================

-- Enums
CREATE TYPE product_type_enum AS ENUM ('RESALE', 'RAW_MATERIAL', 'CONSUMABLE', 'ASSET');

-- 1. Departments (Cost Centers)
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cost_center_code VARCHAR(50) UNIQUE NOT NULL,
    budget_cap DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Warehouses & Locations
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    location_address TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES warehouses(id),
    zone VARCHAR(50),
    aisle VARCHAR(50),
    rack VARCHAR(50),
    bin_code VARCHAR(100) NOT NULL UNIQUE, -- Generated unique string
    CONSTRAINT fk_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

-- 3. Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type product_type_enum NOT NULL DEFAULT 'RESALE',
    min_reorder_level INTEGER DEFAULT 0,
    is_serialized BOOLEAN DEFAULT FALSE,
    is_batch_tracked BOOLEAN DEFAULT FALSE,
    expense_account_code VARCHAR(100), -- Linked to General Ledger for CONSUMABLES
    current_wac_cost DECIMAL(15, 4) DEFAULT 0.0000, -- Weighted Average Cost
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Inventory (Current State)
CREATE TABLE inventory_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES warehouses(id),
    location_id UUID REFERENCES locations(id),
    product_id UUID REFERENCES products(id),
    quantity_on_hand DECIMAL(15, 4) DEFAULT 0,
    quantity_reserved DECIMAL(15, 4) DEFAULT 0,
    CONSTRAINT unique_stock_loc UNIQUE (warehouse_id, location_id, product_id)
);

-- 5. Batches (Expiry Tracking)
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    batch_number VARCHAR(100) NOT NULL,
    expiry_date DATE,
    quantity DECIMAL(15, 4) DEFAULT 0
);
