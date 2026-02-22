import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { CompanyBranch } from '../types';

interface BranchModalProps {
    onClose: () => void;
    onSubmit: (branch: Partial<CompanyBranch>) => void;
    existingBranch?: CompanyBranch;
}

const BranchModal: React.FC<BranchModalProps> = ({ onClose, onSubmit, existingBranch }) => {
    const [formData, setFormData] = useState({
        nameAr: existingBranch?.nameAr || '',
        nameEn: existingBranch?.nameEn || '',
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            nameAr: formData.nameAr,
            nameEn: formData.nameEn,
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">
                            {existingBranch ? 'تعديل بيانات الفرع' : 'إضافة فرع جديد'}
                        </h3>
                        <p className="text-sm text-slate-500">إدارة فروع الشركة</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                اسم الفرع (عربي) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.nameAr}
                                onChange={(e) => handleChange('nameAr', e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                placeholder="مثال: صنعاء"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                اسم الفرع (إنجليزي) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.nameEn}
                                onChange={(e) => handleChange('nameEn', e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                placeholder="Example: Sana'a"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium text-sm"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-sm"
                        >
                            <Save size={16} />
                            حفظ الفرع
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BranchModal;
