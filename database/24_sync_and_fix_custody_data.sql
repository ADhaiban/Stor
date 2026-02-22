-- 24_sync_and_fix_custody_data.sql

-- ========================================================
-- 1. مُعالج مزامنة البيانات (Data Synchronization)
-- يقوم هذا الجزء بتصحيح الحالات بناءً على آخر حركة مخزنية لكل سيريال
-- ========================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- لكل سيريال، نجد آخر حركة (IN أو OUT)
    FOR r IN (
        SELECT DISTINCT ON (serial_number, category_id) 
            id as serial_id, 
            serial_number, 
            category_id
        FROM product_serials
    ) LOOP
        -- تحديث الحالة وربط آخر حركة صرف
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
            movement_in_id = COALESCE(ps.movement_in_id, (
                SELECT id FROM stock_movements sm 
                WHERE sm.serial_number = ps.serial_number 
                AND sm.product_id = ps.product_id 
                AND sm.type = 'IN'
                ORDER BY transaction_date DESC LIMIT 1
            )),
            updated_at = NOW()
        WHERE ps.id = r.serial_id;
    END LOOP;
END $$;

-- ========================================================
-- 2. تحسين العرض (View Enhancement)
-- نضمن ظهور المنتج والموصل بشكل صحيح حتى لو اختلفت الحالة يدوياً
-- ========================================================

CREATE OR REPLACE VIEW delivery_bags_report_view AS
SELECT 
    ps.id AS serial_id,
    ps.serial_number AS bag_no,
    ps.created_at,
    m_in.transaction_date AS supplied_at,
    m_out.transaction_date AS issued_at,
    ps.status,
    -- الحماية: إذا كانت مخرجة نأخذ الموصل من حركة الصرف
    m_out.beneficiary_id AS current_driver_id,
    ben.name AS driver_name,
    ps.warehouse_id,
    w.name AS branch_name,
    p.name AS product_name,
    c.name AS category_name,
    -- الحالة الفعلية: إذا وجدنا حركة صرف لم يتم إغلاقها بحركة إرجاع بعدها
    (ps.status = 'ISSUED' OR (m_out.id IS NOT NULL AND (m_in.transaction_date IS NULL OR m_out.transaction_date > m_in.transaction_date))) AS is_issued
FROM product_serials ps
LEFT JOIN products p ON ps.product_id = p.id
LEFT JOIN product_categories c ON COALESCE(ps.category_id, p.category_id) = c.id
LEFT JOIN stock_movements m_in ON ps.movement_in_id = m_in.id
LEFT JOIN stock_movements m_out ON ps.movement_out_id = m_out.id
LEFT JOIN inventory_beneficiaries ben ON m_out.beneficiary_id = ben.id
LEFT JOIN warehouses w ON ps.warehouse_id = w.id;

-- إعادة تحميل المخطط
NOTIFY pgrst, 'reload schema';
