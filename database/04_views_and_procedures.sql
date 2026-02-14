-- ================================================
-- 4. Views and Procedures
-- Source: financial_schema.sql
-- ================================================

-- 1. Collection Alerts View
CREATE OR REPLACE VIEW collection_alerts AS
SELECT 
    fl.id AS alert_id,
    fl.entity_id AS client_id,
    fl.entity_name AS client_name,
    fl.reference_doc_id AS invoice_id,
    fl.transaction_date AS invoice_date,
    fl.due_date,
    fl.amount,
    CURRENT_DATE - fl.due_date AS days_overdue,
    c.current_balance,
    c.credit_limit,
    c.phone,
    c.gps_location
FROM 
    financial_ledger fl
    JOIN clients c ON fl.entity_id = c.id
WHERE 
    fl.entity_type = 'CLIENT'
    AND fl.type = 'INVOICE'
    AND fl.paid_date IS NULL
    AND fl.due_date < CURRENT_DATE
ORDER BY 
    days_overdue DESC;

-- 2. Aging Report View
CREATE OR REPLACE VIEW aging_report AS
SELECT 
    fl.entity_id AS client_id,
    c.name AS client_name,
    c.category,
    c.phone,
    SUM(CASE 
        WHEN (CURRENT_DATE - fl.due_date) BETWEEN 0 AND 30 
        THEN fl.amount ELSE 0 
    END) AS aging_0_30,
    SUM(CASE 
        WHEN (CURRENT_DATE - fl.due_date) BETWEEN 31 AND 60 
        THEN fl.amount ELSE 0 
    END) AS aging_31_60,
    SUM(CASE 
        WHEN (CURRENT_DATE - fl.due_date) > 60 
        THEN fl.amount ELSE 0 
    END) AS aging_61_plus,
    SUM(fl.amount) AS total_overdue,
    c.current_balance,
    c.credit_limit
FROM 
    financial_ledger fl
    JOIN clients c ON fl.entity_id = c.id
WHERE 
    fl.entity_type = 'CLIENT'
    AND fl.type = 'INVOICE'
    AND fl.paid_date IS NULL
    AND fl.due_date < CURRENT_DATE
GROUP BY 
    fl.entity_id, c.name, c.category, c.phone, c.current_balance, c.credit_limit
ORDER BY 
    total_overdue DESC;

-- 3. Financial Summary View
CREATE OR REPLACE VIEW financial_summary AS
SELECT 
    (SELECT COALESCE(SUM(current_balance), 0) FROM vendors) AS total_payables,
    (SELECT COALESCE(SUM(current_balance), 0) FROM clients) AS total_receivables,
    (SELECT COALESCE(SUM(current_balance), 0) FROM clients) - 
    (SELECT COALESCE(SUM(current_balance), 0) FROM vendors) AS net_position,
    (SELECT COUNT(*) FROM financial_ledger 
     WHERE entity_type = 'CLIENT' 
     AND type = 'INVOICE' 
     AND paid_date IS NULL 
     AND due_date < CURRENT_DATE) AS overdue_invoices_count,
    (SELECT COALESCE(SUM(amount), 0) FROM financial_ledger 
     WHERE entity_type = 'CLIENT' 
     AND type = 'INVOICE' 
     AND paid_date IS NULL 
     AND due_date < CURRENT_DATE) AS overdue_amount;

-- 4. Payment Procedures (Optimized for PostgreSQL)

-- Record Vendor Payment
CREATE OR REPLACE FUNCTION record_vendor_payment(
    p_vendor_id UUID,
    p_amount DECIMAL(15,2),
    p_reference UUID,
    p_notes TEXT,
    p_user_id UUID
) RETURNS TABLE(message TEXT, new_balance DECIMAL(15,2)) AS $$
DECLARE
    v_current_balance DECIMAL(15,2);
    v_new_balance DECIMAL(15,2);
    v_vendor_name VARCHAR(255);
BEGIN
    -- Get current vendor info
    SELECT current_balance, name 
    INTO v_current_balance, v_vendor_name
    FROM vendors 
    WHERE id = p_vendor_id;
    
    -- Calculate new balance
    v_new_balance := v_current_balance - p_amount;
    
    -- Insert payment transaction
    INSERT INTO financial_ledger (
        entity_type, entity_id, entity_name,
        transaction_date, type, amount, balance_after,
        reference_doc_id, paid_date, notes, created_by
    ) VALUES (
        'VENDOR', p_vendor_id, v_vendor_name,
        NOW(), 'PAYMENT', p_amount, v_new_balance,
        p_reference, CURRENT_DATE, p_notes, p_user_id
    );
    
    -- Update vendor balance
    UPDATE vendors 
    SET current_balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_vendor_id;
    
    RETURN QUERY SELECT 'Payment recorded successfully'::TEXT, v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- Record Client Payment
CREATE OR REPLACE FUNCTION record_client_payment(
    p_client_id UUID,
    p_amount DECIMAL(15,2),
    p_invoice_id UUID,
    p_notes TEXT,
    p_user_id UUID
) RETURNS TABLE(message TEXT, new_balance DECIMAL(15,2)) AS $$
DECLARE
    v_current_balance DECIMAL(15,2);
    v_new_balance DECIMAL(15,2);
    v_client_name VARCHAR(255);
BEGIN
    -- Get current client info
    SELECT current_balance, name 
    INTO v_current_balance, v_client_name
    FROM clients 
    WHERE id = p_client_id;
    
    -- Calculate new balance
    v_new_balance := v_current_balance - p_amount;
    
    -- Insert payment transaction
    INSERT INTO financial_ledger (
        entity_type, entity_id, entity_name,
        transaction_date, type, amount, balance_after,
        reference_doc_id, paid_date, notes, created_by
    ) VALUES (
        'CLIENT', p_client_id, v_client_name,
        NOW(), 'PAYMENT', p_amount, v_new_balance,
        p_invoice_id, CURRENT_DATE, p_notes, p_user_id
    );
    
    -- Mark invoice as paid
    UPDATE financial_ledger
    SET paid_date = CURRENT_DATE
    WHERE reference_doc_id = p_invoice_id AND type = 'INVOICE';
    
    -- Update client balance
    UPDATE clients 
    SET current_balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_client_id;
    
    RETURN QUERY SELECT 'Payment received successfully'::TEXT, v_new_balance;
END;
$$ LANGUAGE plpgsql;
