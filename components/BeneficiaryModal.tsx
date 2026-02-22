import React, { useState } from 'react';
import { X, UserPlus, Save, AlertCircle } from 'lucide-react';
import { BeneficiaryType, Department } from '../types';

interface BeneficiaryModalProps {
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    departments: Department[];
    initialType?: BeneficiaryType;
}

const BeneficiaryModal: React.FC<BeneficiaryModalProps> = ({ onClose, onSubmit, departments, initialType }) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [type, setType] = useState<BeneficiaryType>(initialType || 'INTERNAL');
    const [departmentId, setDepartmentId] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const beneficiaryData = {
                name,
                beneficiary_code: code,
                type,
                department_id: (type === 'INTERNAL' || type === 'COMPANY_EMPLOYEE') ? departmentId : null,
                phone: phone || null,
                is_active: true
            };

            await onSubmit(beneficiaryData);
            onClose();
        } catch (err: any) {
            setError(err.message || 'حدث خطأ أثناء حفظ المستفيد');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <UserPlus size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">إضافة مستفيد جديد</h3>
                            <p className="text-xs text-slate-500">إضافة بيانات المستفيد للنظام</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">اسم المستفيد <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="مثال: أحمد محمد"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">كود المستفيد (فريد) <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            placeholder="مثال: EMP-1234"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">فئة المستفيد <span className="text-red-500">*</span></label>
                        <select
                            required
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={type}
                            onChange={e => setType(e.target.value as BeneficiaryType)}
                        >
                            <option value="EXTERNAL_CLIENT">عميل خارجي</option>
                            <option value="DELIVERY_DRIVER">موصل (سائق)</option>
                            <option value="COMPANY_EMPLOYEE">موظف شركة</option>
                            <option value="INTERNAL">مستفيد داخلي</option>
                        </select>
                    </div>

                    {(type === 'INTERNAL' || type === 'COMPANY_EMPLOYEE') && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">الإدارة / القسم <span className="text-red-500">*</span></label>
                            <select
                                required
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={departmentId}
                                onChange={e => setDepartmentId(e.target.value)}
                            >
                                <option value="">اختر القسم...</option>
                                {departments.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">رقم الهاتف (اختياري)</label>
                        <input
                            type="tel"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="05xxxxxxxx"
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-md flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={18} />
                            {loading ? 'جاري الحفظ...' : 'حفظ المستفيد'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BeneficiaryModal;
