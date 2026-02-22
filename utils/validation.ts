
// Postgres Error Codes
export const PG_ERRORS = {
    UNIQUE_VIOLATION: '23505',
    NOT_NULL_VIOLATION: '23502',
    FOREIGN_KEY_VIOLATION: '23503',
    CHECK_VIOLATION: '23514'
};

export interface ValidationResponse {
    isValid: boolean;
    errors: Record<string, string>;
}

// 1. Generic Supabase Error Parser (Backend-like Logic)
export const parseSupabaseError = (error: any): { field?: string; message: string } => {
    if (!error) return { message: 'حدث خطأ غير معروف' };

    // Log the full error for debugging (internal logs)
    console.error('Database Error:', error);

    // Handle Postgres Error Codes
    if (error.code === PG_ERRORS.UNIQUE_VIOLATION) {
        // Extract field name from details if possible "Key (vendor_code)=(VEN-001) already exists."
        if (error.details && error.details.includes('vendor_code')) {
            return { field: 'vendorCode', message: 'كود المورد مستخدم مسبقاً، يرجى اختيار كود آخر.' };
        }
        if (error.details && error.details.includes('email')) {
            return { field: 'email', message: 'البريد الإلكتروني مسجل مسبقاً.' };
        }
        if (error.details && error.details.includes('sku')) {
            return { field: 'sku', message: 'الرقم التسلسلي (SKU) موجود بالفعل.' };
        }
        return { message: 'هذا السجل موجود مسبقاً (قيمة مكررة).' };
    }

    if (error.code === PG_ERRORS.NOT_NULL_VIOLATION) {
        return { message: 'يرجى ملء جميع الحقول الإلزامية.' };
    }

    if (error.code === PG_ERRORS.FOREIGN_KEY_VIOLATION) {
        return { message: 'لا يمكن حذف أو تعديل هذا السجل لارتباطه ببيانات أخرى.' };
    }

    // Network Errors
    if (error.message === 'Failed to fetch') {
        return { message: 'فشل الاتصال بالخادم، يرجى التحقق من الإنترنت.' };
    }

    // Default Fallback
    return { message: error.message || 'حدث خطأ أثناء الحفظ.' };
};

// 2. Frontend Validation Logic (Zod-like simulation)
export const validateVendorForm = (data: { name?: string; vendorCode?: string; phone?: string }): ValidationResponse => {
    const errors: Record<string, string> = {};

    if (!data.name || data.name.trim().length < 3) {
        errors.name = 'اسم المورد يجب أن يكون 3 أحرف على الأقل.';
    }

    if (!data.vendorCode || !/^[A-Z0-9-]+$/.test(data.vendorCode)) {
        errors.vendorCode = 'كود المورد يجب أن يحتوي على أحرف إنجليزية وأرقام فقط (مثال: VEN-001).';
    }

    if (data.phone && !/^\+?[0-9]{9,15}$/.test(data.phone)) {
        errors.phone = 'رقم الهاتف غير صحيح (يجب أن يكون 9 أرقام على الأقل).';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};
