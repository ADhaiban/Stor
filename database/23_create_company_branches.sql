-- 23_create_company_branches.sql

-- ========================================================
-- 1. إنشاء جدول الفروع (Company Branches)
-- ========================================================

CREATE TABLE IF NOT EXISTS company_branches (
    id SERIAL PRIMARY KEY,
    name_ar VARCHAR(255) NOT NULL UNIQUE,
    name_en VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================================
-- 2. إضافة البيانات الأولية للفروع
-- ========================================================

INSERT INTO company_branches (name_ar, name_en) VALUES
('صنعاء', 'Sana''a'),
('عدن', 'Aden'),
('إب', 'Ibb'),
('ذمار', 'Dhamar'),
('المكلا', 'Al Mukalla'),
('تعز_المدينة', 'Taiz_City'),
('تعز_الحوبان', 'Taiz_Al_Houban'),
('مأرب', 'Marib')
ON CONFLICT (name_ar) DO NOTHING;

-- ========================================================
-- 3. إضافة ميزة التحديث التلقائي لتاريخ التحديث
-- ========================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_company_branches_updated_at ON company_branches;
CREATE TRIGGER tr_company_branches_updated_at
    BEFORE UPDATE ON company_branches
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
