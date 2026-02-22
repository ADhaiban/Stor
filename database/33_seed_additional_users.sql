-- 33_seed_additional_users.sql

-- ========================================================
-- 1. التأكد من وجود الأدوار (Roles)
-- ========================================================
INSERT INTO roles (id, name, display_name, description, is_system_role, is_active) VALUES
('30000001-0000-0000-0000-000000000002', 'inventory_manager', 'مدير المخزون', 'إدارة المنتجات والمخزون والحركات', FALSE, TRUE),
('30000001-0000-0000-0000-000000000003', 'viewer', 'مستعرض', 'صلاحيات عرض فقط للتقارير', FALSE, TRUE)
ON CONFLICT (id) DO UPDATE SET is_active = TRUE;

-- ========================================================
-- 2. إدراج المستخدمين الإضافيين
-- ========================================================
INSERT INTO users (id, name, email, password_hash, role_id, is_active) VALUES
('40000001-0000-0000-0000-000000000002', 'مدير المخزن', 'manager@tawseel.com', 'manager123', '30000001-0000-0000-0000-000000000002', TRUE),
('40000001-0000-0000-0000-000000000003', 'مستخدم للقراءة', 'viewer@tawseel.com', 'viewer123', '30000001-0000-0000-0000-000000000003', TRUE)
ON CONFLICT (email) DO UPDATE SET 
    is_active = TRUE,
    password_hash = EXCLUDED.password_hash;

-- ========================================================
-- 3. ربط الصلاحيات الأساسية (إعطاء مدير المخزن صلاحيات كاملة مؤقتاً للتجربة)
-- ========================================================
INSERT INTO role_permissions (role_id, module_id, action_id, has_permission)
SELECT '30000001-0000-0000-0000-000000000002', module_id, action_id, TRUE
FROM module_actions
ON CONFLICT DO NOTHING;

-- تحديث المنظومة
NOTIFY pgrst, 'reload schema';
