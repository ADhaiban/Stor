-- ================================================
-- 3. Stock Movements Schema
-- Source: Merged Logic
-- ================================================

-- Enums
CREATE TYPE movement_type_enum AS ENUM ('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'CONSUMPTION');
CREATE TYPE po_status_enum AS ENUM ('DRAFT', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- Stock Movements (The Ledger)
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    type movement_type_enum NOT NULL,
    
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL, -- Snapshot
    
    warehouse_from_id UUID REFERENCES warehouses(id),
    warehouse_to_id UUID REFERENCES warehouses(id),
    department_id UUID REFERENCES departments(id), -- For Internal Consumption
    
    quantity DECIMAL(15, 4) NOT NULL,
    unit_cost DECIMAL(15, 4) NOT NULL, -- Cost at time of movement
    total_amount DECIMAL(15, 2), -- Total financial value (quantity * unit_cost)

    -- Financial Links
    vendor_id UUID REFERENCES vendors(id), -- For IN movements
    client_id UUID REFERENCES clients(id), -- For OUT movements
    
    reference_doc_id UUID, -- Link to PO/SO
    user_id UUID, -- Link to Users table
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase Orders
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
    unit_cost DECIMAL(15, 4) NOT NULL CHECK (unit_cost >= 0),
    line_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_movement_product ON stock_movements(product_id);
CREATE INDEX idx_movement_date ON stock_movements(transaction_date);
CREATE INDEX idx_movement_type ON stock_movements(type);
CREATE INDEX idx_po_vendor ON purchase_orders(vendor_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_po_status ON purchase_orders(status) WHERE is_deleted = FALSE;
CREATE INDEX idx_po_items_po ON purchase_order_items(purchase_order_id);
