# 🔐 نظام إدارة الصلاحيات والأدوار - دليل الاستخدام

## 📋 **نظرة عامة**

تم تنفيذ نظام شامل لإدارة الصلاحيات (RBAC - Role-Based Access Control) يدعم:
- ✅ **الأدوار** (Roles) كمجموعات صلاحيات قابلة لإعادة الاستخدام
- ✅ **صلاحيات مباشرة** للمستخدمين تتجاوز صلاحيات الدور
- ✅ **صلاحيات دقيقة** على مستوى كل وحدة وإجراء
- ✅ **صلاحيات معطلة** للأزواج غير القابلة للتطبيق

---

## 🗂️ **الملفات المُنشأة**

### **1. قاعدة البيانات**
| الملف | الوصف |
|-------|--------|
| `database/10_permissions_schema.sql` | Schema كامل للجداول والدوال |
| `database/11_permissions_seed.sql` | البيانات الأولية (14 وحدة، 8 إجراءات، 5 أدوار) |

### **2. الملفات التي سيتم إنشاؤها لاحقاً**
- `types.ts` - تعريفات TypeScript
- `services/permissions-api.ts` - API للصلاحيات
- `components/UsersList.tsx` - قائمة المستخدمين
- `components/RolesList.tsx` - قائمة الأدوار
- `components/RolePermissionsEditor.tsx` - محرر صلاحيات الدور
- `components/UserPermissionsEditor.tsx` - محرر صلاحيات المستخدم

---

## 🏗️ **البنية الهيكلية**

### **الجداول الرئيسية**

```
modules (الوحدات)           actions (الإجراءات)
    ↓                            ↓
module_actions (الإجراءات المتاحة لكل وحدة)
    ↓
    ├─→ role_permissions (صلاحيات الأدوار)
    └─→ user_permissions (صلاحيات المستخدمين)
         ↑
    users (المستخدمون) → roles (الأدوار)
```

---

## 📊 **البيانات الأولية**

### **الوحدات (14 وحدة)**

| الرقم | الوحدة | الاسم العربي | الإجراءات المتاحة |
|-------|--------|--------------|-------------------|
| 1 | dashboard | لوحة المعلومات | view |
| 2 | products | المنتجات | view, create, update, delete, export, import |
| 3 | categories | الفئات | view, create, update, delete |
| 4 | warehouses | المستودعات | view, create, update, delete |
| 5 | vendors | الموردون | view, create, update, delete, export |
| 6 | clients | العملاء | view, create, update, delete, export |
| 7 | purchase_orders | أوامر الشراء | view, create, update, delete, approve, print |
| 8 | sales_orders | أوامر البيع | view, create, update, delete, approve, print |
| 9 | inventory | المخزون | view, update, export |
| 10 | stock_movements | حركات المخزون | view, create, export |
| 11 | reports | التقارير | view, export, print |
| 12 | users | المستخدمون | view, create, update, delete |
| 13 | roles | الأدوار والصلاحيات | view, create, update, delete |
| 14 | system_settings | إعدادات النظام | view, update |

### **الإجراءات (8 إجراءات)**

1. **view** - عرض
2. **create** - إنشاء
3. **update** - تعديل
4. **delete** - حذف
5. **approve** - اعتماد
6. **export** - تصدير
7. **import** - استيراد
8. **print** - طباعة

### **الأدوار (5 أدوار)**

#### 1️⃣ **مدير النظام** (Admin)
- ✅ صلاحيات كاملة على جميع الوحدات والإجراءات
- ✅ لا يمكن حذفه (is_system_role = true)

#### 2️⃣ **مدير المخزون** (Inventory Manager)
- ✅ صلاحيات كاملة: products, categories, warehouses, inventory, stock_movements
- ✅ عرض فقط: dashboard, vendors, clients, reports

#### 3️⃣ **مشرف المشتريات** (Purchase Supervisor)
- ✅ صلاحيات كاملة: vendors, purchase_orders
- ✅ عرض + إنشاء: products, inventory, stock_movements
- ✅ عرض فقط: dashboard, clients, reports

#### 4️⃣ **موظف مبيعات** (Sales Clerk)
- ✅ صلاحيات كاملة: clients, sales_orders
- ✅ عرض فقط: dashboard, products, inventory, reports

#### 5️⃣ **مستعرض** (Viewer)
- ✅ عرض فقط على جميع الوحدات

---

## 🚀 **خطوات التثبيت**

### **1. تشغيل Scripts قاعدة البيانات**

في **Supabase SQL Editor**، قم بتشغيل الملفات بالترتيب:

```sql
-- 1. إنشاء الجداول والدوال
-- نفذ محتوى: database/10_permissions_schema.sql

-- 2. إدخال البيانات الأولية
-- نفذ محتوى: database/11_permissions_seed.sql
```

### **2. التحقق من التثبيت**

```sql
-- عرض جميع الوحدات
SELECT * FROM modules ORDER BY sort_order;

-- عرض جميع الإجراءات
SELECT * FROM actions ORDER BY sort_order;

-- عرض الأدوار
SELECT * FROM roles;

-- عدد الصلاحيات لكل دور
SELECT r.display_name, COUNT(*) as permissions_count
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
WHERE rp.has_permission = TRUE
GROUP BY r.id, r.display_name;
```

---

## 🎯 **استخدام الدوال المساعدة**

### **التحقق من صلاحية مستخدم**

```sql
-- هل يستطيع المستخدم حذف المنتجات؟
SELECT user_has_permission(
    'user-uuid',       -- معرف المستخدم
    'products',        -- الوحدة
    'delete'           -- الإجراء
);
```

### **عرض جميع صلاحيات مستخدم**

```sql
-- عرض كل صلاحيات المستخدم مع المصدر (role/user)
SELECT * FROM get_user_permissions('user-uuid');
```

---

## 📐 **منطق حساب الصلاحيات**

### **الأولوية:**
```
user_permissions > role_permissions > false
```

### **مثال:**

```
دور: مدير مخزون
  ✅ products.delete = TRUE (موروث من الدور)

صلاحيات مباشرة للمستخدم "أحمد":
  ❌ purchase_orders.delete = TRUE (تجاوز صلاحية الدور)

النتيجة النهائية لـ "أحمد":
  ✅ products.delete = TRUE (من الدور)
  ✅ purchase_orders.delete = TRUE (صلاحية مباشرة)
```

---

## 🔧 **إدارة الصلاحيات**

### **إضافة دور جديد**

```sql
INSERT INTO roles (name, display_name, description) 
VALUES ('accountant', 'محاسب', 'إدارة المعاملات المالية');
```

### **منح صلاحيات لدور**

```sql
-- منح دور المحاسب صلاحية عرض التقارير
INSERT INTO role_permissions (role_id, module_id, action_id, has_permission)
SELECT 
    r.id,
    m.id,
    a.id,
    TRUE
FROM roles r, modules m, actions a
WHERE r.name = 'accountant'
  AND m.name = 'reports'
  AND a.name = 'view';
```

### **منح صلاحية مباشرة لمستخدم**

```sql
-- منح مستخدم صلاحية استثنائية لحذف أوامر الشراء
INSERT INTO user_permissions (user_id, module_id, action_id, has_permission)
SELECT 
    'user-uuid',
    m.id,
    a.id,
    TRUE
FROM modules m, actions a
WHERE m.name = 'purchase_orders'
  AND a.name = 'delete'
ON CONFLICT (user_id, module_id, action_id) 
DO UPDATE SET has_permission = EXCLUDED.has_permission;
```

### **إلغاء صلاحية مباشرة**

```sql
-- حذف صلاحية مباشرة (العودة لصلاحيات الدور)
DELETE FROM user_permissions
WHERE user_id = 'user-uuid'
  AND module_id = (SELECT id FROM modules WHERE name = 'purchase_orders')
  AND action_id = (SELECT id FROM actions WHERE name = 'delete');
```

---

## 🛡️ **الأمان**

### **كلمات المرور**
- ⚠️ المستخدم الافتراضي (admin@tawseel.com) له كلمة مرور `CHANGE_ME`
- 🔒 **يجب تغييرها فوراً!**
- 🔐 استخدم bcrypt أو argon2 لتشفير كلمات المرور

### **Row Level Security (RLS)**
- حالياً: **معطل** للتطوير
- للإنتاج: **يجب تفعيله** مع سياسات مناسبة

```sql
-- مثال لتفعيل RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_policy ON users
FOR SELECT
USING (
    id = current_user_id() OR
    user_has_permission(current_user_id(), 'users', 'view')
);
```

---

## 📝 **الخطوات التالية**

### **المرحلة القادمة: تطوير الواجهات**

سأقوم الآن بإنشاء:
1. ✅ TypeScript Types
2. ✅ API Services
3. ✅ React Components:
   - قائمة المستخدمين
   - قائمة الأدوار
   - محرر صلاحيات الدور
   - محرر صلاحيات المستخدم

---

## 🎓 **ملاحظات تطويرية**

### **تحسينات مستقبلية:**
- 🔄 Audit Log لتتبع تغييرات الصلاحيات
- 📧 إشعارات عند تغيير صلاحيات المستخدمين
- 🕐 صلاحيات مؤقتة (Temporary Permissions)
- 🏢 صلاحيات على مستوى الفروع (Branch-Level Permissions)
- 📱 واجهة موبايل لإدارة الصلاحيات

---

**التاريخ**: 2026-02-16  
**الحالة**: ✅ الجزء الأول مكتمل (قاعدة البيانات)  
**التالي**: تطوير الواجهات البرمجية والمكونات
