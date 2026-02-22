-- 29_comprehensive_bag_logic_fix.sql

-- ========================================================
-- 1. إصلاح هيكلي: حذف العرض القديم لتجنب تعارض الأسماء
-- ========================================================
DROP VIEW IF EXISTS delivery_bags_report_view CASCADE;

-- ========================================================
-- 2. التأكد من وجود عمود السيريال في جدول الحركات
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
-- 3. مزامنة البيانات (Sync Strategy)
-- Part A: سحب أرقام السيريالات من الملاحظات إذا كانت مفقودة (للحركات القديمة)
-- ========================================================
UPDATE stock_movements 
SET serial_number = substring(notes from '\d{3,10}')
WHERE (serial_number IS NULL OR serial_number = '') 
AND notes ~ '\d{3,10}'
AND (product_name LIKE '%شنط%' OR notes LIKE '%شنط%');

-- Part B: تحديث حالات الشنط بناءً على "آخر حركة مخزنية فعلية"
-- هذا سيحل مشكلة الشنطة 1064 وغيرها
WITH latest_mov AS (
    SELECT DISTINCT ON (serial_number, product_id)
        id, type, serial_number, product_id, beneficiary_id, transaction_date
    FROM stock_movements
    WHERE serial_number IS NOT NULL
    ORDER BY serial_number, product_id, transaction_date DESC
)
UPDATE product_serials ps
SET 
    status = CASE WHEN lm.type = 'OUT' THEN 'ISSUED' ELSE 'AVAILABLE' END,
    movement_out_id = CASE WHEN lm.type = 'OUT' THEN lm.id ELSE NULL END,
    updated_at = NOW()
FROM latest_mov lm
WHERE ps.serial_number = lm.serial_number 
AND ps.product_id = lm.product_id;

-- ========================================================
-- 4. إعادة بناء العرض بالمنطق الجديد والأسماء المطلوبة
-- ========================================================
CREATE VIEW delivery_bags_report_view AS
SELECT 
    ps.id AS serial_id,
    ps.serial_number AS bag_no,
    ps.created_at,
    m_in.transaction_date AS supplied_at,
    m_out.transaction_date AS issued_at,
    ps.status,
    m_out.beneficiary_id AS current_driver_id,
    -- منطق "العهدة حاليا لدى"
    CASE 
        WHEN ps.status = 'ISSUED' THEN COALESCE(ben.name, 'موصل غير معروف')
        ELSE 'في المخزن'
    END AS driver_name_display,
    ps.warehouse_id,
    w.name AS branch_name,
    p.name AS product_name,
    c.name AS category_name,
    (ps.status = 'ISSUED') AS is_issued
FROM product_serials ps
JOIN products p ON ps.product_id = p.id
LEFT JOIN product_categories c ON COALESCE(ps.category_id, p.category_id) = c.id
LEFT JOIN stock_movements m_in ON ps.movement_in_id = m_in.id
LEFT JOIN stock_movements m_out ON ps.movement_out_id = m_out.id
LEFT JOIN inventory_beneficiaries ben ON m_out.beneficiary_id = ben.id
LEFT JOIN warehouses w ON ps.warehouse_id = w.id;

-- إعادة تحميل المخطط للواجهة
NOTIFY pgrst, 'reload schema';
