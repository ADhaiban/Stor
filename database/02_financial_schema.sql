-- ================================================
-- 2. Financial Schema (Vendors, Clients, Ledger)
-- Source: database/financial_schema.sql (Adapted to UUID)
-- ================================================

-- Enums
CREATE TYPE payment_terms_enum AS ENUM ('CASH', 'CREDIT', 'HYBRID_SALES_LINKED');
CREATE TYPE transaction_type_enum AS ENUM ('INVOICE', 'PAYMENT', 'RETURN', 'CREDIT_NOTE', 'DEBIT_NOTE');
CREATE TYPE entity_type_enum AS ENUM ('VENDOR', 'CLIENT');

-- 1. Vendors
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_code VARCHAR(50) UNIQUE, -- Optional Short Code (e.g. VEN-001) for human reference
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    tax_id VARCHAR(50),
    payment_terms payment_terms_enum NOT NULL DEFAULT 'CREDIT',
    current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    credit_limit DECIMAL(15, 2),
    
    -- For HYBRID_SALES_LINKED payment terms
    cash_percentage DECIMAL(5, 2),  -- e.g., 30.00 for 30%
    commission_per_unit DECIMAL(10, 2),  -- e.g., 5.00 SAR per unit sold
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. Clients
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_code VARCHAR(50) UNIQUE, -- Optional Short Code
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    gps_location VARCHAR(255),  -- "lat,lng" or address
    category VARCHAR(50),  -- e.g., 'Retail', 'Wholesale'
    collection_period_days INT NOT NULL DEFAULT 30,
    current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    credit_limit DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Financial Ledger
CREATE TABLE financial_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type entity_type_enum NOT NULL,
    entity_id UUID NOT NULL, -- Logical Link to Vendor or Client UUID
    entity_name VARCHAR(255) NOT NULL, -- Snapshot of name
    
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    type transaction_type_enum NOT NULL,
    
    amount DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,
    
    reference_doc_id UUID,  -- Link to Stock_Movement UUID or Invoice UUID
    due_date DATE,
    paid_date DATE,
    notes TEXT,
    
    created_by UUID, -- Link to User
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vendor_name ON vendors(name);
CREATE INDEX idx_client_name ON clients(name);
CREATE INDEX idx_ledger_entity ON financial_ledger(entity_type, entity_id);
CREATE INDEX idx_ledger_date ON financial_ledger(transaction_date);
