import React, { useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Product, Vendor, Warehouse } from '../types';

interface LineItemDraft {
  productId: string;
  warehouseId: string;
  quantity: number;
  unitCost: number;
}

interface PurchaseOrderModalProps {
  onClose: () => void;
  onSubmit: (data: {
    poNumber: string;
    vendorId: string;
    orderDate: string;
    expectedDate?: string;
    notes?: string;
    items: LineItemDraft[];
  }) => void;
  vendors: Vendor[];
  products: Product[];
  warehouses: Warehouse[];
}

const makePoNumber = () => `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  onClose,
  onSubmit,
  vendors,
  products,
  warehouses
}) => {
  const [poNumber, setPoNumber] = useState(makePoNumber());
  const [vendorId, setVendorId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItemDraft[]>([
    {
      productId: '',
      warehouseId: warehouses[0]?.id || '',
      quantity: 1,
      unitCost: 0
    }
  ]);

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0),
    [items]
  );

  const updateItem = (index: number, updates: Partial<LineItemDraft>) => {
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const addLine = () => {
    setItems(prev => [
      ...prev,
      {
        productId: '',
        warehouseId: warehouses[0]?.id || '',
        quantity: 1,
        unitCost: 0
      }
    ]);
  };

  const removeLine = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items.filter(item =>
      item.productId &&
      item.quantity > 0 &&
      item.unitCost >= 0
    );

    if (!vendorId || validItems.length === 0) {
      alert('يرجى اختيار المورد وإضافة أصناف صحيحة.');
      return;
    }

    onSubmit({
      poNumber,
      vendorId,
      orderDate,
      expectedDate: expectedDate || undefined,
      notes: notes || undefined,
      items: validItems
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">إنشاء أمر شراء</h3>
            <p className="text-sm text-slate-500">إدخال رأس الطلب وبنود الشراء</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-700 mb-1">رقم أمر الشراء</label>
              <input
                value={poNumber}
                onChange={e => setPoNumber(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">المورد</label>
              <select
                value={vendorId}
                onChange={e => setVendorId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">اختر المورد...</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">تاريخ الطلب</label>
              <input
                type="date"
                value={orderDate}
                onChange={e => setOrderDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">تاريخ التوريد المتوقع</label>
              <input
                type="date"
                value={expectedDate}
                onChange={e => setExpectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-1">ملاحظات</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="border rounded-xl border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="font-semibold text-slate-800">بنود أمر الشراء</h4>
              <button
                type="button"
                onClick={addLine}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1"
              >
                <Plus size={14} />
                إضافة بند
              </button>
            </div>

            <div className="space-y-3 p-4">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 md:col-span-4">
                    <label className="block text-xs text-slate-500 mb-1">الصنف</label>
                    <select
                      value={item.productId}
                      onChange={e => updateItem(index, { productId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                      required
                    >
                      <option value="">اختر الصنف...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <label className="block text-xs text-slate-500 mb-1">المستودع</label>
                    <select
                      value={item.warehouseId}
                      onChange={e => updateItem(index, { warehouseId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">افتراضي</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <label className="block text-xs text-slate-500 mb-1">الكمية</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={e => updateItem(index, { quantity: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <label className="block text-xs text-slate-500 mb-1">سعر الوحدة</label>
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={item.unitCost}
                      onChange={e => updateItem(index, { unitCost: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>
                  <div className="col-span-12 md:col-span-1">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      disabled={items.length === 1}
                      className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40"
                      title="حذف البند"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm font-semibold text-slate-700">الإجمالي: {totalAmount.toFixed(2)}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 rounded-lg hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
              >
                حفظ أمر الشراء
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseOrderModal;
