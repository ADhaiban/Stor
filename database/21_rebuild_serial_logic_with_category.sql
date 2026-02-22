-- 21_rebuild_serial_logic_with_category.sql

-- ========================================================
-- 1. إصلاح هيكل الجدول (إضافة عمود الفئة)
-- ========================================================

-- أ. إضافة العمود إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='product_serials' AND column_name='category_id') THEN
        ALTER TABLE product_serials ADD COLUMN category_id UUID REFERENCES product_categories(id);
    END IF;
END $$;

-- ب. ملء البيانات المفقودة في عمود الفئة بناءً على المنتج
UPDATE product_serials ps
SET category_id = p.category_id
FROM products p
WHERE ps.product_id = p.id AND (ps.category_id IS NULL);

-- ج. تنظيف التكرارات قبل إضافة القيد (Constraints)
-- نبقي على الأحدث ونحذف الأقدم إذا تكرر السيريال داخل نفس الفئة
WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY category_id, serial_number ORDER BY created_at DESC) as r
    FROM product_serials
    WHERE category_id IS NOT NULL
)
DELETE FROM product_serials WHERE id IN (SELECT id FROM duplicates WHERE r > 1);

-- د. إضافة قيد الفرادة على مستوى (الفئة + الرقم التسلسلي)
ALTER TABLE product_serials DROP CONSTRAINT IF EXISTS unique_product_serial;
ALTER TABLE product_serials DROP CONSTRAINT IF EXISTS unique_category_serial;
ALTER TABLE product_serials ADD CONSTRAINT unique_category_serial UNIQUE(category_id, serial_number);

-- ========================================================
-- 2. تحديث التقرير ليشمل كل الأصناف (صرف للموصل)
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
JOIN products p ON ps.product_id = p.id
JOIN product_categories c ON p.category_id = c.id
LEFT JOIN stock_movements m_in ON ps.movement_in_id = m_in.id
LEFT JOIN stock_movements m_out ON ps.movement_out_id = m_out.id
LEFT JOIN inventory_beneficiaries ben ON m_out.beneficiary_id = ben.id
LEFT JOIN warehouses w ON ps.warehouse_id = w.id;

-- ========================================================
-- 3. تحديث كلمة المرور لـ 123
-- ========================================================
UPDATE users 
SET password_hash = '123' 
WHERE email = 'admin@tawseel.com';

-- ========================================================
-- 4. تحديث دالة التوليد التلقائي لتدعم العمود الجديد
-- ========================================================
CREATE OR REPLACE FUNCTION generate_product_serials(
    p_product_id UUID, p_warehouse_id UUID, p_movement_id UUID,
    p_start_number BIGINT, p_prefix VARCHAR(50), p_suffix VARCHAR(50), p_quantity INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0; v_i INTEGER; v_serial_text VARCHAR(100); v_category_id UUID;
BEGIN
    SELECT category_id INTO v_category_id FROM products WHERE id = p_product_id;
    FOR v_i IN 0..(p_quantity - 1) LOOP
        v_serial_text := (p_start_number + v_i)::VARCHAR;
        INSERT INTO product_serials (product_id, category_id, serial_number, status, warehouse_id, movement_in_id)
        VALUES (p_product_id, v_category_id, v_serial_text, 'AVAILABLE', p_warehouse_id, p_movement_id)
        ON CONFLICT (category_id, serial_number) DO NOTHING;
        IF FOUND THEN v_count := v_count + 1; END IF;
    END LOOP;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;
