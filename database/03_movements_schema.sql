-- ================================================
-- 3. Stock Movements Schema
-- Source: Merged Logic
-- ================================================

-- Enums
CREATE TYPE movement_type_enum AS ENUM ('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'CONSUMPTION');

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

-- Indexes
CREATE INDEX idx_movement_product ON stock_movements(product_id);
CREATE INDEX idx_movement_date ON stock_movements(transaction_date);
CREATE INDEX idx_movement_type ON stock_movements(type);
