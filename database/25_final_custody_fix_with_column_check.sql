-- 25_final_custody_fix_with_column_check.sql

-- ========================================================
-- 1. التأكد من وجود عمود serial_number في جدول الحركات
-- ========================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'stock_movements' AND column_name = 'serial_number') THEN
        ALTER TABLE stock_movements ADD COLUMN serial_number VARCHAR(100);
        CREATE INDEX idx_stock_movements_serial ON stock_movements(serial_number);
    END IF;
END $$;

-- ========================================================
-- 2. مُعالج مزامنة البيانات (Data Synchronization)
-- يقوم بتصحيح الحالات بناءً على آخر حركة مخزنية لكل سيريال
-- ========================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- لكل سيريال، نجد آخر حركة (IN أو OUT)
    FOR r IN (SELECT id, serial_number, product_id FROM product_serials) LOOP
        UPDATE product_serials ps
        SET 
            status = CASE 
                WHEN (SELECT type FROM stock_movements sm 
                      WHERE sm.serial_number = ps.serial_number 
                      AND sm.product_id = ps.product_id 
                      ORDER BY transaction_date DESC LIMIT 1) = 'OUT' 
                THEN 'ISSUED' 
                ELSE 'AVAILABLE' 
            END,
            movement_out_id = (
                SELECT id FROM stock_movements sm 
                WHERE sm.serial_number = ps.serial_number 
                AND sm.product_id = ps.product_id 
                AND sm.type = 'OUT'
                ORDER BY transaction_date DESC LIMIT 1
            ),
            updated_at = NOW()
        WHERE ps.id = r.id;
    END LOOP;
END $$;

-- ========================================================
-- 3. تحديث التقرير لضمان دقة عرض "العهدة الحالية" وتاريخ الصرف
-- ========================================================

CREATE OR REPLACE VIEW delivery_bags_report_view AS
SELECT 
    ps.id AS serial_id,
    ps.serial_number AS bag_no,
    ps.created_at,
    m_in.transaction_date AS supplied_at,
    m_out.transaction_date AS issued_at,
    ps.status,
    m_out.beneficiary_id AS current_driver_id,
    ben.name AS driver_name,
    ps.warehouse_id,
    w.name AS branch_name,
    p.name AS product_name,
    c.name AS category_name,
    (ps.status = 'ISSUED') AS is_issued
FROM product_serials ps
LEFT JOIN products p ON ps.product_id = p.id
LEFT JOIN product_categories c ON COALESCE(ps.category_id, p.category_id) = c.id
LEFT JOIN stock_movements m_in ON ps.movement_in_id = m_in.id
LEFT JOIN stock_movements m_out ON ps.movement_out_id = m_out.id
LEFT JOIN inventory_beneficiaries ben ON m_out.beneficiary_id = ben.id
LEFT JOIN warehouses w ON ps.warehouse_id = w.id;

-- إعادة تحميل المخطط
NOTIFY pgrst, 'reload schema';
