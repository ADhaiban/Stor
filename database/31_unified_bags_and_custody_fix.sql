-- 31_unified_bags_and_custody_fix.sql

-- ========================================================
-- 1. إصلاح الهيكل وحل مشكلة التعارض في العروض (Views)
-- ========================================================
DROP VIEW IF EXISTS delivery_bags_report_view CASCADE;
DROP VIEW IF EXISTS v_bags_report CASCADE;

-- ========================================================
-- 2. إغلاق العهد المفتوحة للشنط الموجودة فعلياً في المخزن
-- هذا يحل مشكلة "الموصل لديه عهدة بالفعل" للشنطة 1065
-- ========================================================
UPDATE public.bag_custody bc
SET received_at = NOW(),
    notes = COALESCE(notes, '') || ' (إغلاق تلقائي بسبب توفر الشنطة في المخزن)'
WHERE bc.received_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.product_serials ps 
    WHERE ps.id = bc.serial_id 
    AND ps.status = 'AVAILABLE'
  );

-- ========================================================
-- 3. مزامنة حالة السيريالات بناءً على الحركات (التأكد من دقة 1064 و 1065)
-- ========================================================
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

-- ========================================================
-- 4. إصلاح وتطوير دالة صرف الشنطة (issue_bag_serial)
-- ========================================================
CREATE OR REPLACE FUNCTION public.issue_bag_serial(
  p_serial_id uuid,
  p_driver_id uuid,
  p_user_id uuid,
  p_notes text
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_serial RECORD;
  v_active_bag_no text;
  v_occupant_name text;
  v_movement_id uuid;
BEGIN
  -- 1) جلب بيانات الشنطة مع القفل لمنع التعارض
  SELECT ps.*, pc.name as cat_name, p.name as prod_name, p.current_wac_cost
  INTO v_serial
  FROM public.product_serials ps
  JOIN public.products p ON p.id = ps.product_id
  JOIN public.product_categories pc ON pc.id = p.category_id
  WHERE ps.id = p_serial_id AND ps.is_deleted = false FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'الشنطة غير موجودة أو محذوفة');
  END IF;

  -- 2) التحقق من الفئة (اختياري)
  IF v_serial.cat_name <> 'شنط' THEN
    -- لا نمنع الصرف ولكن نعطي تنبيهاً إذا لزم الأمر، هنا سنسمح بالاستمرار
  END IF;

  -- 3) هل الموصل لديه شنطة أخرى حالياً؟
  SELECT ps.serial_number INTO v_active_bag_no
  FROM public.bag_custody bc
  JOIN public.product_serials ps ON ps.id = bc.serial_id
  WHERE bc.driver_id = p_driver_id AND bc.received_at IS NULL AND bc.serial_id <> p_serial_id
  LIMIT 1;

  IF v_active_bag_no IS NOT NULL THEN
    RETURN json_build_object('success', false, 'message', format('الموصل لديه عهدة شنطة رقم (%s) بالفعل', v_active_bag_no));
  END IF;

  -- 4) هل الشنطة تتبع موصلاً آخر حالياً؟
  SELECT ib.name INTO v_occupant_name
  FROM public.bag_custody bc
  JOIN public.inventory_beneficiaries ib ON ib.id = bc.driver_id
  WHERE bc.serial_id = p_serial_id AND bc.received_at IS NULL AND bc.driver_id <> p_driver_id
  LIMIT 1;

  IF v_occupant_name IS NOT NULL THEN
    RETURN json_build_object('success', false, 'message', format('الشنطة بعهدة موصل آخر حالياً: (%s)', v_occupant_name));
  END IF;

  -- 5) إذا كان الموصل لديه "هذه" الشنطة كعهدة مفتوحة، نكتفي بالتحديث إذا كانت الحالة AVAILABLE
  -- وإلا نقوم بالإجراء الطبيعي:
  
  -- تسجيل حركة مخزنية (OUT)
  INSERT INTO stock_movements (
    type, product_id, product_name, warehouse_from_id, quantity, unit_cost,
    user_id, beneficiary_id, notes, transaction_date, serial_number
  ) VALUES (
    'OUT', v_serial.product_id, v_serial.prod_name, v_serial.warehouse_id, 1, v_serial.current_wac_cost,
    p_user_id, p_driver_id, p_notes, NOW(), v_serial.serial_number
  ) RETURNING id INTO v_movement_id;

  -- تحديث حالة السيريال
  UPDATE public.product_serials
  SET status = 'ISSUED',
      movement_out_id = v_movement_id,
      updated_at = NOW()
  WHERE id = p_serial_id;

  -- تسجيل في جدول العهد (Bag Custody)
  -- نغلق أي عهدة قديمة "تائهة" لنفس الشنطة قبل الفتح
  UPDATE public.bag_custody SET received_at = NOW() WHERE serial_id = p_serial_id AND received_at IS NULL;
  
  INSERT INTO public.bag_custody(serial_id, driver_id, issued_by, issued_at, notes)
  VALUES (p_serial_id, p_driver_id, p_user_id, NOW(), p_notes);

  -- تسجيل حدث
  INSERT INTO public.bag_custody_events(serial_id, event_type, to_driver_id, performed_by, notes)
  VALUES (p_serial_id, 'ISSUE', p_driver_id, p_user_id, p_notes);

  RETURN json_build_object('success', true, 'message', 'تم الصرف بنجاح');
END;
$$;

-- ========================================================
-- 5. إعادة إنشاء العرض الموحد (Source of Truth)
-- ========================================================
CREATE VIEW delivery_bags_report_view AS
SELECT 
    ps.id AS serial_id, ps.serial_number AS bag_no, ps.created_at, 
    m_in.transaction_date AS supplied_at, m_out.transaction_date AS issued_at, 
    ps.status, m_out.beneficiary_id AS current_driver_id,
    CASE 
        WHEN ps.status = 'ISSUED' THEN COALESCE(ben.name, 'موصل') 
        ELSE 'في المخزن' 
    END AS driver_name_display,
    ps.warehouse_id, w.name AS branch_name, p.name AS product_name, c.name AS category_name, 
    (ps.status = 'ISSUED') AS is_issued
FROM product_serials ps
JOIN products p ON ps.product_id = p.id
LEFT JOIN product_categories c ON COALESCE(ps.category_id, p.category_id) = c.id
LEFT JOIN stock_movements m_in ON ps.movement_in_id = m_in.id
LEFT JOIN stock_movements m_out ON ps.movement_out_id = m_out.id
LEFT JOIN inventory_beneficiaries ben ON m_out.beneficiary_id = ben.id
LEFT JOIN warehouses w ON ps.warehouse_id = w.id;

NOTIFY pgrst, 'reload schema';
