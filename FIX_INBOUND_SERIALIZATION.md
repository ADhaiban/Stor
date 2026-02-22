# 🎯 إصلاح مشكلة الأرقام التسلسلية عند استلام البضاعة

## ❌ المشكلة
عند استلام بضاعة لمنتج مُفعّل له "تتبع بالأرقام المتسلسلة"، يظهر الخطأ:
```
Failed to process inbound. See console.
```

## 🔍 السبب
عدم تطابق أسماء المعاملات بين:

### **في services/api.ts:**
```typescript
{
  product_id: string,
  warehouse_id: string,
  movement_id: string,
  start_number: number,
  prefix?: string,
  suffix?: string,
  quantity: number
}
```

### **في database/08_serialization_schema.sql:**
```sql
p_product_id UUID,
p_warehouse_id UUID,
p_movement_id UUID,
p_start_number BIGINT,
p_prefix VARCHAR(50),
p_suffix VARCHAR(50),
p_quantity INTEGER
```

الفرق: الدالة في قاعدة البيانات تتوقع معاملات بصيغة `p_parameter_name` ولكن الكود يرسل `parameter_name` فقط!

## ✅ الحل
تم تعديل دالة `generateProductSerials` في `services/api.ts` لتحويل أسماء المعاملات:

```typescript
async generateProductSerials(params: {...}) {
    // تحويل أسماء المعاملات لتتطابق مع PostgreSQL
    const dbParams = {
        p_product_id: params.product_id,
        p_warehouse_id: params.warehouse_id,
        p_movement_id: params.movement_id,
        p_start_number: params.start_number,
        p_prefix: params.prefix || null,
        p_suffix: params.suffix || null,
        p_quantity: params.quantity
    };
    
    const { data, error } = await supabase.rpc('generate_product_serials', dbParams);
    if (error) throw error;
    return data;
}
```

## 📋 التحقق من الإصلاح

### 1. تأكد من وجود الدالة في قاعدة البيانات
قم بتشغيل ملف: `database/08_serialization_schema.sql`

### 2. اختبر العملية الكاملة
1. **أضف منتج مُسلسل:**
   - انتقل إلى: البيانات الأساسية > تعريف الأصناف
   - أضف منتج جديد
   - فعّل ✅ "تتبع بالأرقام المتسلسلة"
   - احفظ

2. **استلم بضاعة:**
   - اضغط زر "استلام" في الأعلى
   - اختر المورد
   - أدخل رقم PO
   - اختر المستودع
   - اختر المنتج المُسلسل
   - أدخل الكمية والتكلفة
   - **ستظهر خانات الأرقام التسلسلية:**
     - البادئة (مثال: `SN-`)
     - الرقم الأول (مثال: `1001`)
     - اللاحقة (مثال: `-2026`)
   - اضغط "تأكيد الاستلام"

3. **تحقق من البيانات:**
   - افتح قاعدة البيانات
   - استعلم: `SELECT * FROM product_serials;`
   - يجب أن تشاهد الأرقام التسلسلية المُولدة

## 🎯 النتيجة
الآن عند استلام بضاعة لمنتج مُسلسل، سيتم:
1. ✅ إنشاء حركة مخزون (stock_movement)
2. ✅ تحديث المخزون (inventory_stock)
3. ✅ توليد الأرقام التسلسلية تلقائيًا (product_serials)

## 🔗 الملفات المعدلة
- ✅ `services/api.ts` - تحويل أسماء المعاملات

## 🎓 الدروس المستفادة
عند استخدام Supabase RPC مع PostgreSQL functions:
- **المعاملات يجب أن تتطابق بالضبط** مع أسماء المعاملات في الدالة
- PostgreSQL يستخدم naming convention مع بادئة `p_` للمعاملات
- يجب تحويل `null` بدلاً من `undefined` لحقول اختيارية

---
**التاريخ**: 2026-02-14  
**الحالة**: ✅ تم الإصلاح
