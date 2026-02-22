import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Product, ProductType, Warehouse, Vendor, Department, ProductCategory, UnitOfMeasure } from '../types';

interface ProductModalProps {
    onClose: () => void;
    onSubmit: (productData: any) => void;
    existingProducts: Product[];
    warehouses: Warehouse[];
    vendors: Vendor[];
    departments: Department[];
    categories: ProductCategory[];
    uoms: UnitOfMeasure[];
    initialData?: Product;
    onAddCategory?: () => void;
    onAddWarehouse?: () => void;
    onAddVendor?: () => void;
    onAddDepartment?: () => void;
    onAddUOM?: () => void;
}

import { Plus } from 'lucide-react';

const ProductModal: React.FC<ProductModalProps> = ({
    onClose,
    onSubmit,
    existingProducts,
    warehouses,
    vendors,
    departments,
    categories,
    uoms,
    initialData,
    onAddCategory,
    onAddWarehouse,
    onAddVendor,
    onAddDepartment,
    onAddUOM
}) => {
    const [name, setName] = useState('');
    const [cost, setCost] = useState('');
    const [sku, setSku] = useState('');
    const [description, setDescription] = useState('');
    const [selectedUOM, setSelectedUOM] = useState('');
    const [minReorderLevel, setMinReorderLevel] = useState(10);
    const [isSerialized, setIsSerialized] = useState(false);

    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [selectedVendor, setSelectedVendor] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    // Initialize or Auto-generate SKU
    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setCost(String(initialData.currentAvgCost));
            setSku(initialData.sku);
            setDescription(initialData.description);
            setSelectedUOM(initialData.unit);
            setMinReorderLevel(initialData.minReorderLevel);
            setSelectedCategory(initialData.categoryId);
            setIsSerialized(initialData.isSerialized || false);

            // Handle optional fields safely
            setSelectedWarehouse(initialData.warehouseId || '');
            setSelectedVendor(initialData.vendorId || '');
            setSelectedDepartment(initialData.departmentId || '');
        } else {
            const nextNum = existingProducts.length + 1;
            const formattedNum = nextNum.toString().padStart(3, '0');
            setSku(`PROD-${formattedNum}`);

            // Reset fields
            setName('');
            setCost('');
            setDescription('');
            setSelectedUOM('');
            setMinReorderLevel(10);
            setSelectedWarehouse('');
            setSelectedVendor('');
            setSelectedDepartment('');
            setSelectedCategory('');
            setIsSerialized(false);
        }
    }, [initialData, existingProducts]);

    // Auto-select newly added items if they appear in the lists
    useEffect(() => {
        if (!initialData) {
            // Check if we just added a category
            if (categories.length > 0 && !selectedCategory) {
                const latest = categories[categories.length - 1];
                setSelectedCategory(latest.id);
            }
            // Check if we just added a warehouse
            if (warehouses.length > 0 && !selectedWarehouse) {
                const latest = warehouses[warehouses.length - 1];
                setSelectedWarehouse(latest.id);
            }
            // Check if we just added a vendor
            if (vendors.length > 0 && !selectedVendor) {
                const latest = vendors[vendors.length - 1];
                setSelectedVendor(latest.id);
            }
            // Check if we just added a department
            if (departments.length > 0 && !selectedDepartment) {
                const latest = departments[departments.length - 1];
                setSelectedDepartment(latest.id);
            }
            // Check if we just added a UOM
            if (uoms.length > 0 && !selectedUOM) {
                const latest = uoms[uoms.length - 1];
                setSelectedUOM(latest.id);
            }
        }
    }, [categories, warehouses, vendors, departments, uoms]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !cost || !selectedWarehouse || !selectedVendor || !selectedDepartment || !selectedCategory) {
            alert("يرجى ملء جميع الحقول الإلزامية واختيار القيم من القوائم.");
            return;
        }

        onSubmit({
            name,
            sku,
            currentAvgCost: parseFloat(cost),
            description,
            unit: selectedUOM,
            minReorderLevel,
            categoryId: selectedCategory,
            type: ProductType.RESALE,
            isSerialized: isSerialized,
            isBatchTracked: false,
            warehouseId: selectedWarehouse,
            vendorId: selectedVendor,
            departmentId: selectedDepartment
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 h-auto max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
                    <h3 className="text-lg font-bold text-slate-800">إضافة صنف جديد</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">الرقم التسلسلي (SKU)</label>
                            <input
                                type="text"
                                value={sku}
                                readOnly
                                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono text-sm cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-slate-700">الفئة <span className="text-red-500">*</span></label>
                                {onAddCategory && (
                                    <button
                                        type="button"
                                        onClick={onAddCategory}
                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors flex items-center gap-1 text-xs font-bold"
                                        title="إضافة فئة جديدة"
                                    >
                                        <Plus size={14} strokeWidth={3} />
                                        إضافة
                                    </button>
                                )}
                            </div>
                            <select
                                required
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            >
                                <option value="">اختر الفئة...</option>
                                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">اسم الصنف <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="مثال: لابتوب ديل 15 بوصة"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-slate-700">المستودع الافتراضي <span className="text-red-500">*</span></label>
                                {onAddWarehouse && (
                                    <button
                                        type="button"
                                        onClick={onAddWarehouse}
                                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors flex items-center gap-1 text-xs font-bold"
                                        title="إضافة مستودع جديد"
                                    >
                                        <Plus size={14} strokeWidth={3} />
                                        إضافة
                                    </button>
                                )}
                            </div>
                            <select
                                required
                                value={selectedWarehouse}
                                onChange={(e) => setSelectedWarehouse(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            >
                                <option value="">اختر المستودع...</option>
                                {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-slate-700">المورد المفضل <span className="text-red-500">*</span></label>
                                {onAddVendor && (
                                    <button
                                        type="button"
                                        onClick={onAddVendor}
                                        className="p-1 text-purple-600 hover:bg-purple-50 rounded-md transition-colors flex items-center gap-1 text-xs font-bold"
                                        title="إضافة مورد جديد"
                                    >
                                        <Plus size={14} strokeWidth={3} />
                                        إضافة
                                    </button>
                                )}
                            </div>
                            <select
                                required
                                value={selectedVendor}
                                onChange={(e) => setSelectedVendor(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            >
                                <option value="">اختر المورد...</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-slate-700">القسم / مركز التكلفة <span className="text-red-500">*</span></label>
                                {onAddDepartment && (
                                    <button
                                        type="button"
                                        onClick={onAddDepartment}
                                        className="p-1 text-amber-600 hover:bg-amber-50 rounded-md transition-colors flex items-center gap-1 text-xs font-bold"
                                        title="إضافة قسم جديد"
                                    >
                                        <Plus size={14} strokeWidth={3} />
                                        إضافة
                                    </button>
                                )}
                            </div>
                            <select
                                required
                                value={selectedDepartment}
                                onChange={(e) => setSelectedDepartment(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            >
                                <option value="">اختر القسم...</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">التكلفة (ر.س) <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={cost}
                                onChange={(e) => setCost(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">حد إعادة الطلب (Min)</label>
                            <input
                                type="number"
                                min="0"
                                value={minReorderLevel}
                                onChange={(e) => setMinReorderLevel(parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-slate-700">الوحدة <span className="text-red-500">*</span></label>
                                {onAddUOM && (
                                    <button
                                        type="button"
                                        onClick={onAddUOM}
                                        className="p-1 text-cyan-600 hover:bg-cyan-50 rounded-md transition-colors flex items-center gap-1 text-xs font-bold"
                                        title="إضافة وحدة جديدة"
                                    >
                                        <Plus size={14} strokeWidth={3} />
                                        إضافة
                                    </button>
                                )}
                            </div>
                            <select
                                required
                                value={selectedUOM}
                                onChange={(e) => setSelectedUOM(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            >
                                <option value="">اختر الوحدة...</option>
                                {uoms.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">الوصف <span className="text-red-500">*</span></label>
                        <textarea
                            required
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="وصف مختصر للصنف..."
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                        />
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <input
                            type="checkbox"
                            id="isSerialized"
                            checked={isSerialized}
                            onChange={(e) => setIsSerialized(e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="isSerialized" className="text-sm font-bold text-slate-800 cursor-pointer">
                            تتبع بالأرقام المتسلسلة (Serialization)
                            <span className="block text-xs font-normal text-slate-500">يتطلب هذا الخيار إدخال رقم فريد لكل قطعة عند الاستلام</span>
                        </label>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white py-2">
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
                            حفظ الصنف
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
};

export default ProductModal;
