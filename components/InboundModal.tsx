import React, { useState } from 'react';
import { X, Calculator, ArrowLeft, CheckCircle } from 'lucide-react';
import { InventoryStock, Product, Warehouse, Vendor } from '../types';

interface InboundModalProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  inventory: InventoryStock[];
  products: Product[];
  warehouses: Warehouse[];
  vendors: Vendor[];
}

const InboundModal: React.FC<InboundModalProps> = ({ onClose, onSubmit, inventory, products, warehouses, vendors }) => {
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(warehouses[0]?.id || '');
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [poNumber, setPoNumber] = useState('');

  // Serialization states
  // Serialization states
  const [serialStart, setSerialStart] = useState<number>(1001);

  const productData = products.find(p => p.id === selectedProduct);
  const stockItem = inventory.find(i => i.productId === selectedProduct && i.warehouseId === selectedWarehouse);

  // WAC Logic Real
  const currentCost = productData?.currentAvgCost || 0;
  const currentQty = stockItem ? stockItem.quantityOnHand : 0;

  const newTotalValue = (currentQty * currentCost) + (quantity * unitCost);
  const newTotalQty = currentQty + quantity;
  const projectedWAC = newTotalQty > 0 ? (newTotalValue / newTotalQty) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      selectedProduct,
      selectedWarehouse,
      selectedVendor,
      quantity,
      unitCost,
      poNumber,
      serialization: productData?.isSerialized ? {
        prefix: '',
        startNumber: serialStart,
        suffix: ''
      } : null
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">استلام بضاعة (وارد)</h3>
            <p className="text-sm text-slate-500">تسجيل دخول بضاعة بناءً على أمر شراء</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">المورد</label>
              <select
                className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={selectedVendor}
                onChange={e => setSelectedVendor(e.target.value)}
                required
              >
                <option value="">اختر المورد...</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">رقم أمر الشراء (PO)</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder-slate-400"
                placeholder="PO-XXXX"
                value={poNumber}
                onChange={e => setPoNumber(e.target.value)}
              />
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">المستودع المستهدف</label>
              <select
                className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={selectedWarehouse}
                onChange={e => setSelectedWarehouse(e.target.value)}
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">الصنف</label>
              <select
                className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={selectedProduct}
                onChange={e => setSelectedProduct(e.target.value)}
                required
              >
                <option value="">اختر الصنف...</option>
                {products.length > 0 ? products.map(p => (
                  <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                )) : <option disabled>لا توجد أصناف معرفة</option>}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الكمية المستلمة</label>
              <input
                type="number"
                min="1"
                required
                className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-400"
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تكلفة الوحدة (ريال)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-400"
                value={unitCost}
                onChange={e => setUnitCost(Number(e.target.value))}
              />
            </div>
          </div>

          {selectedProduct && quantity > 0 && unitCost > 0 && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <Calculator size={18} className="text-blue-600" />
                <h4 className="font-semibold text-blue-900 text-sm">تحليل تأثير التكلفة (متوسط التكلفة المرجح)</h4>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="text-center">
                  <p className="text-slate-500">المتوسط الحالي</p>
                  <p className="font-mono font-medium text-slate-700">{currentCost.toFixed(2)} ر.س</p>
                </div>
                <ArrowLeft size={16} className="text-blue-300" />
                <div className="text-center">
                  <p className="text-slate-500">تكلفة الوارد</p>
                  <p className="font-mono font-medium text-slate-700">{unitCost.toFixed(2)} ر.س</p>
                </div>
                <ArrowLeft size={16} className="text-blue-300" />
                <div className="text-center bg-white px-3 py-1 rounded shadow-sm border border-blue-100">
                  <p className="text-blue-600 font-medium">المتوسط الجديد</p>
                  <p className="font-mono font-bold text-blue-700">{projectedWAC.toFixed(2)} ر.س</p>
                </div>
              </div>
              <p className="text-xs text-blue-600/70 mt-3 italic">
                * بناءً على تقدير المخزون الحالي بـ {currentQty} وحدة. يتم الحساب النهائي عند الحفظ في قاعدة البيانات.
              </p>
            </div>
          )}

          {/* Serialization Section */}
          {productData?.isSerialized && quantity > 0 && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 mb-3 text-amber-800">
                <CheckCircle size={18} className="text-amber-600" />
                <h4 className="font-bold text-sm">توليد أرقام تسلسلية (Sequential Generation)</h4>
              </div>
              <p className="text-xs text-amber-700 mb-4">
                سيقوم النظام بتوليد {quantity} رقم متسلسل تلقائياً بناءً على النمط أدناه:
              </p>

              <div className="col-span-3">
                <label className="block text-sm font-medium text-amber-700 mb-1">الرقم التسلسلي الأول (أرقام فقط)</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 bg-white border border-amber-300 rounded-lg text-lg font-mono outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="1001"
                  value={serialStart}
                  onChange={e => setSerialStart(parseInt(e.target.value.replace(/\D/g, '')) || 0)}
                />
              </div>

              <div className="mt-4 pt-3 border-t border-amber-200">
                <p className="text-[10px] text-amber-600 mb-1 font-bold">معاينة النمط:</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-amber-200 text-amber-900 rounded-lg text-sm font-mono font-bold">
                    {serialStart}
                  </span>
                  <span className="text-amber-400">....</span>
                  <span className="px-3 py-1 bg-amber-200 text-amber-900 rounded-lg text-sm font-mono font-bold">
                    {serialStart + quantity - 1}
                  </span>
                </div>
              </div>
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
              className="px-5 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 shadow-sm shadow-green-200 flex items-center gap-2"
            >
              <CheckCircle size={18} />
              تأكيد الاستلام
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InboundModal;