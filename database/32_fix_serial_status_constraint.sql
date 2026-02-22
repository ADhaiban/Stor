-- 32_fix_serial_status_constraint.sql

-- ========================================================
-- إصلاح قيد الحالة (Constraint Fix)
-- نقوم بإضافة 'ISSUED' إلى قائمة الحالات المسموح بها في جدول السيريالات
-- ========================================================

-- 1. حذف القيد القديم (الذي كان يمنع حالة ISSUED)
ALTER TABLE product_serials DROP CONSTRAINT IF EXISTS chk_serial_status_valid;

-- 2. إضافة القيد الجديد ليشمل جميع الحالات المطلوبة لنظام العهد
ALTER TABLE product_serials ADD CONSTRAINT chk_serial_status_valid 
CHECK (status IN ('AVAILABLE', 'ISSUED', 'SOLD', 'RESERVED', 'DAMAGED', 'RETURNED'));

-- 3. مزامنة البيانات مجدداً لضمان عدم وجود تضارب
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT id, serial_number, product_id FROM product_serials) LOOP
        UPDATE product_serials ps SET 
            status = CASE 
                WHEN (SELECT type FROM stock_movements sm WHERE sm.serial_number = ps.serial_number AND sm.product_id = ps.product_id ORDER BY transaction_date DESC LIMIT 1) = 'OUT' 
                THEN 'ISSUED' ELSE 'AVAILABLE' END,
            movement_out_id = (SELECT id FROM stock_movements sm WHERE sm.serial_number = ps.serial_number AND sm.product_id = ps.product_id AND sm.type = 'OUT' ORDER BY transaction_date DESC LIMIT 1),
            updated_at = NOW()
        WHERE ps.id = r.id;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
