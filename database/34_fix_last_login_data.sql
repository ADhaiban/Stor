-- 34_fix_last_login_data.sql

-- تحديث تاريخ آخر دخول للمدير ليعكس الواقع الحالي
UPDATE users 
SET last_login = NOW() - INTERVAL '5 minutes'
WHERE email = 'admin@tawseel.com';

-- تحديث تاريخ الدخول للمدير ليكون قبل 20 دقيقة
UPDATE users 
SET last_login = NOW() - INTERVAL '20 minutes'
WHERE email = 'manager@tawseel.com';
