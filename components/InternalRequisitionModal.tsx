import React, { useState } from 'react';
import { X, CheckCircle, Building2, AlertTriangle, Calculator } from 'lucide-react';
import { ProductType, InventoryStock, Product, Department } from '../types';

interface InternalRequisitionModalProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  inventory: InventoryStock[];
  products: Product[];
  departments: Department[];
}

const InternalRequisitionModal: React.FC<InternalRequisitionModalProps> = ({ onClose, onSubmit, inventory, products, departments }) => {
  const [departmentId, setDepartmentId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(0);

  const productData = products.find(p => p.id === selectedProduct);
  const deptData = departments.find(d => d.id === departmentId);
  const stockInfo = inventory.find(i => i.productId === selectedProduct);

  const availableQty = stockInfo ? stockInfo.quantityOnHand - stockInfo.quantityReserved : 0;

  // Logic: Prevent requesting Resale items for internal consumption
  const isResaleItem = productData?.type === ProductType.RESALE;
  const totalCost = (productData?.currentAvgCost || 0) * quantity;
  const isOverBudget = deptData && totalCost > deptData.budgetCap; // Mock check logic

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isResaleItem) return;
    onSubmit({ departmentId, selectedProduct, quantity, totalCost });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 size={20} className="text-purple-600" /> طلب صرف داخلي
            </h3>
            <p className="text-sm text-slate-500">صرف مواد مستهلكة للأقسام</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">القسم الطالب</label>
              <select
                className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                value={departmentId}
                onChange={e => setDepartmentId(e.target.value)}
                required
              >
                <option value="">اختر القسم...</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} (الميزانية: {d.budgetCap} ريال)</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">اختر الصنف</label>
              <select
                className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                value={selectedProduct}
                onChange={e => setSelectedProduct(e.target.value)}
                required
              >
                <option value="">اختر مادة مستهلكة...</option>
                {products
                  .filter(p => p.type === ProductType.CONSUMABLE) // Only show consumables
                  .map(p => (
                    <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                  ))}
                <optgroup label="غير مسموح (بضاعة)">
                  {products
                    .filter(p => p.type === ProductType.RESALE)
                    .map(p => (
                      <option key={p.id} value={p.id} disabled>{p.sku} - {p.name} (للبيع فقط)</option>
                    ))}
                </optgroup>
              </select>
              {isResaleItem && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertTriangle size={12} /> خطأ: لا يمكن صرف بضاعة البيع للاستخدام الداخلي.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الكمية</label>
              <input
                type="number"
                min="1"
                required
                className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none placeholder-slate-400"
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
              />
              <p className="text-xs text-slate-500 mt-1">متوفر في المخزون: {availableQty}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">التكلفة التقديرية</label>
              <div className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                {totalCost.toFixed(2)} ر.س
              </div>
            </div>

          </div>

          {/* Cost Allocation Preview */}
          {deptData && quantity > 0 && (
            <div className={`rounded-xl p-4 border ${isOverBudget ? 'bg-red-50 border-red-200' : 'bg-purple-50 border-purple-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Calculator size={18} className={isOverBudget ? "text-red-600" : "text-purple-600"} />
                <h4 className={`font-semibold text-sm ${isOverBudget ? "text-red-900" : "text-purple-900"}`}>
                  تحليل تأثير الميزانية
                </h4>
              </div>
              <div className="flex justify-between text-sm">
                <span>ميزانية القسم:</span>
                <span className="font-mono font-medium">{deptData.budgetCap} ر.س</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>الطلب الحالي:</span>
                <span className="font-mono font-medium text-red-600">-{totalCost.toFixed(2)} ر.س</span>
              </div>
              {isOverBudget && (
                <p className="text-xs text-red-600 font-bold mt-2 flex items-center gap-1">
                  <AlertTriangle size={12} /> تحذير: هذا الطلب يتجاوز سقف الميزانية المخصص.
                </p>
              )}
              {productData?.expenseAccountCode && (
                <p className="text-xs text-slate-500 mt-2 border-t border-slate-200/50 pt-2">
                  حساب الأستاذ العام: <span className="font-mono">{productData.expenseAccountCode}</span>
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isResaleItem}
              className="px-5 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 shadow-sm shadow-purple-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle size={18} />
              إرسال الطلب
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InternalRequisitionModal;