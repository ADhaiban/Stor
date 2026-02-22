import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface FieldConfig {
    name: string;
    label: string;
    type?: 'text' | 'number' | 'date' | 'select';
    placeholder?: string;
    required?: boolean;
    options?: { value: string; label: string }[]; // For select type
}

interface GenericFormModalProps {
    title: string;
    fields: FieldConfig[];
    onClose: () => void;
    onSubmit: (data: Record<string, string>) => void;
    initialData?: Record<string, any>;
    errors?: Record<string, string>;
    isSubmitting?: boolean;
}

const GenericFormModal: React.FC<GenericFormModalProps> = ({ title, fields, onClose, onSubmit, initialData = {}, errors = {}, isSubmitting = false }) => {
    const [formData, setFormData] = useState<Record<string, string>>({});

    useEffect(() => {
        if (initialData) {
            // Convert all values to strings for the form
            const stringData: Record<string, string> = {};
            Object.entries(initialData).forEach(([key, val]) => {
                stringData[key] = String(val ?? '');
            });
            setFormData(stringData);
        }
    }, [JSON.stringify(initialData)]);

    const handleChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {fields.map((field) => (
                        <div key={field.name}>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>
                            {field.type === 'select' ? (
                                <select
                                    required={field.required}
                                    value={formData[field.name] || ''}
                                    onChange={(e) => handleChange(field.name, e.target.value)}
                                    className={`w-full px-3 py-2 bg-white border rounded-lg focus:ring-2 outline-none text-sm transition-all
                                        ${errors[field.name] ? 'border-red-300 focus:ring-red-200 focus:border-red-400' : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'}`}
                                >
                                    <option value="" disabled>اختر...</option>
                                    {field.options?.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type={field.type || 'text'}
                                    required={field.required}
                                    placeholder={field.placeholder}
                                    value={formData[field.name] || ''}
                                    onChange={(e) => handleChange(field.name, e.target.value)}
                                    className={`w-full px-3 py-2 bg-white border rounded-lg focus:ring-2 outline-none text-sm transition-all
                                        ${errors[field.name] ? 'border-red-300 focus:ring-red-200 focus:border-red-400' : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'}`}
                                />
                            )}
                            {errors[field.name] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[field.name]}</p>}
                        </div>
                    ))}

                    <div className="pt-4 flex justify-end gap-3">
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
                            حفظ
                        </button>
                    </div>
                    {isSubmitting && <p className="text-center text-xs text-slate-400 mt-2 font-medium animate-pulse">جاري الحفظ...</p>}
                </form>
            </div>
        </div>
    );
};

export default GenericFormModal;
