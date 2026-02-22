-- 20_final_serial_fix_and_security.sql

-- ========================================================
-- 1. تصحيح تكرار الأرقام التسلسلية حسب الفئة (Category)
-- ========================================================

-- أ. استرجاع الفئة الصحيحة لكل منتج في جدول السيريالات
UPDATE product_serials ps
SET category_id = p.category_id
FROM products p
WHERE ps.product_id = p.id;

-- ب. معالجة التكرارات (حذف القديم إذا وجد نفس السيريال في نفس الفئة لمنتجات مختلفة)
WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY category_id, serial_number ORDER BY created_at DESC) as r
    FROM product_serials
)
DELETE FROM product_serials WHERE id IN (SELECT id FROM duplicates WHERE r > 1);

-- ج. تحديث قيد الفرادة (Unique Constraint) ليكون على مستوى الفئة والسيريال معاً
-- هذا يسمح بتكرار نفس السيريال إذا كانت الفئة مختلفة، ويمنعه إذا كانت الفئة متطابقة.
ALTER TABLE product_serials DROP CONSTRAINT IF EXISTS unique_product_serial;
ALTER TABLE product_serials DROP CONSTRAINT IF EXISTS unique_category_serial;
ALTER TABLE product_serials ADD CONSTRAINT unique_category_serial UNIQUE(category_id, serial_number);

-- ========================================================
-- 2. تحديث شاشة "تقرير الشنط" لتشمل كل العهد (صرف للموصل)
-- ========================================================

-- تحديث الـ View ليشمل كل الفئات وليس "شنط" فقط
CREATE OR REPLACE VIEW delivery_bags_report_view AS
SELECT 
    ps.id AS serial_id,
    ps.serial_number AS bag_no, -- الاسم البرمجي يبقى bag_no للتوافق مع الواجهة
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
JOIN products p ON ps.product_id = p.id
JOIN product_categories c ON p.category_id = c.id
LEFT JOIN stock_movements m_in ON ps.movement_in_id = m_in.id
LEFT JOIN stock_movements m_out ON ps.movement_out_id = m_out.id
LEFT JOIN inventory_beneficiaries ben ON m_out.beneficiary_id = ben.id
LEFT JOIN warehouses w ON ps.warehouse_id = w.id;
-- ملاحظة: تم حذف شرط WHERE c.name = 'شنط' ليعرض كل العهد المتسلسلة

-- ========================================================
-- 3. تحديث كلمة مرور المشرف (admin@tawseel.com)
-- ========================================================

-- تحديث كلمة المرور لـ 123 (لاحظ: يتم تخزين الهاش أو النص حسب إعداد النظام، هنا سنضعها 123)
UPDATE users 
SET password_hash = '123' 
WHERE email = 'admin@tawseel.com';
