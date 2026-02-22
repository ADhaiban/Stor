-- ================================================================
-- نظام الصلاحيات - البيانات الأولية (Seed Data)
-- Initial Modules, Actions, Roles, and Permissions
-- ================================================================

-- ============================================
-- 1. الوحدات (Modules)
-- ============================================
INSERT INTO modules (id, name, display_name, display_name_en, icon, sort_order) VALUES
('10000001-0000-0000-0000-000000000001', 'dashboard', 'لوحة المعلومات', 'Dashboard', 'LayoutDashboard', 1),
('10000001-0000-0000-0000-000000000002', 'products', 'المنتجات', 'Products', 'Package', 2),
('10000001-0000-0000-0000-000000000003', 'categories', 'الفئات', 'Categories', 'FolderTree', 3),
('10000001-0000-0000-0000-000000000004', 'warehouses', 'المستودعات', 'Warehouses', 'Warehouse', 4),
('10000001-0000-0000-0000-000000000005', 'vendors', 'الموردون', 'Vendors', 'Truck', 5),
('10000001-0000-0000-0000-000000000006', 'clients', 'العملاء', 'Clients', 'Users', 6),
('10000001-0000-0000-0000-000000000007', 'purchase_orders', 'أوامر الشراء', 'Purchase Orders', 'ShoppingCart', 7),
('10000001-0000-0000-0000-000000000008', 'sales_orders', 'أوامر البيع', 'Sales Orders', 'ShoppingBag', 8),
('10000001-0000-0000-0000-000000000009', 'inventory', 'المخزون', 'Inventory', 'Archive', 9),
('10000001-0000-0000-0000-000000000010', 'stock_movements', 'حركات المخزون', 'Stock Movements', 'TrendingUp', 10),
('10000001-0000-0000-0000-000000000011', 'reports', 'التقارير', 'Reports', 'FileText', 11),
('10000001-0000-0000-0000-000000000012', 'users', 'المستخدمون', 'Users', 'UserCog', 12),
('10000001-0000-0000-0000-000000000013', 'roles', 'الأدوار والصلاحيات', 'Roles & Permissions', 'Shield', 13),
('10000001-0000-0000-0000-000000000014', 'system_settings', 'إعدادات النظام', 'System Settings', 'Settings', 14)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. الإجراءات (Actions)
-- ============================================
INSERT INTO actions (id, name, display_name, display_name_en, sort_order) VALUES
('20000001-0000-0000-0000-000000000001', 'view', 'عرض', 'View', 1),
('20000001-0000-0000-0000-000000000002', 'create', 'إنشاء', 'Create', 2),
('20000001-0000-0000-0000-000000000003', 'update', 'تعديل', 'Update', 3),
('20000001-0000-0000-0000-000000000004', 'delete', 'حذف', 'Delete', 4),
('20000001-0000-0000-0000-000000000005', 'approve', 'اعتماد', 'Approve', 5),
('20000001-0000-0000-0000-000000000006', 'export', 'تصدير', 'Export', 6),
('20000001-0000-0000-0000-000000000007', 'import', 'استيراد', 'Import', 7),
('20000001-0000-0000-0000-000000000008', 'print', 'طباعة', 'Print', 8)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 3. الإجراءات المتاحة لكل وحدة (Module Actions)
-- ============================================
-- Enable ALL actions for ALL modules for maximum flexibility in the permissions editor
INSERT INTO module_actions (module_id, action_id)
SELECT m.id, a.id
FROM modules m
CROSS JOIN actions a
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. الأدوار (Roles)
-- ============================================
INSERT INTO roles (id, name, display_name, description, is_system_role) VALUES
('30000001-0000-0000-0000-000000000001', 'admin', 'مدير النظام', 'صلاحيات كاملة على جميع أجزاء النظام', TRUE),
('30000001-0000-0000-0000-000000000002', 'inventory_manager', 'مدير المخزون', 'إدارة المنتجات والمخزون والحركات', FALSE),
('30000001-0000-0000-0000-000000000003', 'purchase_supervisor', 'مشرف المشتريات', 'إدارة الموردين وأوامر الشراء', FALSE),
('30000001-0000-0000-0000-000000000004', 'sales_clerk', 'موظف مبيعات', 'إدارة العملاء وأوامر البيع', FALSE),
('30000001-0000-0000-0000-000000000005', 'viewer', 'مستعرض', 'صلاحيات عرض فقط', FALSE)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 5. صلاحيات دور المدير (Admin - Full Access)
-- ============================================
-- Grant ALL permissions to Admin role
INSERT INTO role_permissions (role_id, module_id, action_id, has_permission)
SELECT 
    '30000001-0000-0000-0000-000000000001',  -- admin role
    ma.module_id,
    ma.action_id,
    TRUE
FROM module_actions ma
ON CONFLICT (role_id, module_id, action_id) DO UPDATE SET has_permission = TRUE;

-- ============================================
-- 6. صلاحيات مدير المخزون (Inventory Manager)
-- ============================================
-- Full access to: products, categories, warehouses, inventory, stock_movements
-- View only: dashboard, vendors, clients, reports
INSERT INTO role_permissions (role_id, module_id, action_id, has_permission)
SELECT 
    '30000001-0000-0000-0000-000000000002',  -- inventory_manager role
    ma.module_id,
    ma.action_id,
    CASE 
        WHEN m.name IN ('products', 'categories', 'warehouses', 'inventory', 'stock_movements') THEN TRUE
        WHEN m.name IN ('dashboard', 'vendors', 'clients', 'reports') AND a.name = 'view' THEN TRUE
        ELSE FALSE
    END
FROM module_actions ma
JOIN modules m ON ma.module_id = m.id
JOIN actions a ON ma.action_id = a.id
ON CONFLICT (role_id, module_id, action_id) DO UPDATE SET has_permission = EXCLUDED.has_permission;

-- ============================================
-- 7. صلاحيات مشرف المشتريات (Purchase Supervisor)
-- ============================================
-- Full access to: vendors, purchase_orders
-- View + Create: products, inventory, stock_movements
-- View only: dashboard, clients, reports
INSERT INTO role_permissions (role_id, module_id, action_id, has_permission)
SELECT 
    '30000001-0000-0000-0000-000000000003',  -- purchase_supervisor role
    ma.module_id,
    ma.action_id,
    CASE 
        WHEN m.name IN ('vendors', 'purchase_orders') THEN TRUE
        WHEN m.name IN ('products', 'inventory', 'stock_movements') AND a.name IN ('view', 'create') THEN TRUE
        WHEN m.name IN ('dashboard', 'clients', 'reports') AND a.name = 'view' THEN TRUE
        ELSE FALSE
    END
FROM module_actions ma
JOIN modules m ON ma.module_id = m.id
JOIN actions a ON ma.action_id = a.id
ON CONFLICT (role_id, module_id, action_id) DO UPDATE SET has_permission = EXCLUDED.has_permission;

-- ============================================
-- 8. صلاحيات موظف المبيعات (Sales Clerk)
-- ============================================
-- Full access to: clients, sales_orders
-- View: products, inventory, reports
INSERT INTO role_permissions (role_id, module_id, action_id, has_permission)
SELECT 
    '30000001-0000-0000-0000-000000000004',  -- sales_clerk role
    ma.module_id,
    ma.action_id,
    CASE 
        WHEN m.name IN ('clients', 'sales_orders') THEN TRUE
        WHEN m.name IN ('dashboard', 'products', 'inventory', 'reports') AND a.name = 'view' THEN TRUE
        ELSE FALSE
    END
FROM module_actions ma
JOIN modules m ON ma.module_id = m.id
JOIN actions a ON ma.action_id = a.id
ON CONFLICT (role_id, module_id, action_id) DO UPDATE SET has_permission = EXCLUDED.has_permission;

-- ============================================
-- 9. صلاحيات المستعرض (Viewer - Read Only)
-- ============================================
-- View only access to all modules
INSERT INTO role_permissions (role_id, module_id, action_id, has_permission)
SELECT 
    '30000001-0000-0000-0000-000000000005',  -- viewer role
    ma.module_id,
    ma.action_id,
    CASE WHEN a.name = 'view' THEN TRUE ELSE FALSE END
FROM module_actions ma
JOIN actions a ON ma.action_id = a.id
ON CONFLICT (role_id, module_id, action_id) DO UPDATE SET has_permission = EXCLUDED.has_permission;

-- ============================================
-- 10. مستخدم مدير النظام الافتراضي (Default Admin User)
-- ============================================
INSERT INTO users (id, name, email, password_hash, role_id) VALUES
('40000001-0000-0000-0000-000000000001', 'مدير النظام', 'admin@tawseel.com', 'CHANGE_ME', '30000001-0000-0000-0000-000000000001')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- Refresh Schema Cache
-- ============================================
NOTIFY pgrst, 'reload schema';

-- ================================================================
-- ✅ Permissions Seed Data Created Successfully
-- ================================================================
-- Summary:
-- ✓ 14 وحدة (Modules)
-- ✓ 8 إجراءات (Actions)
-- ✓ 56 علاقة وحدة-إجراء (Module-Action pairs)
-- ✓ 5 أدوار (Roles)
-- ✓ جميع صلاحيات الأدوار (Role Permissions)
-- ✓ 1 مستخدم مدير افتراضي
-- ================================================================
