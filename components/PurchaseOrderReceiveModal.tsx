import React, { useMemo, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { PurchaseOrder, Warehouse } from '../types';

interface ReceiptLine {
  purchaseOrderItemId: string;
  quantityReceived: number;
  warehouseId?: string;
}

interface PurchaseOrderReceiveModalProps {
  purchaseOrder: PurchaseOrder;
  warehouses: Warehouse[];
  onClose: () => void;
  onSubmit: (data: { notes?: string; lines: ReceiptLine[] }) => void;
}

const PurchaseOrderReceiveModal: React.FC<PurchaseOrderReceiveModalProps> = ({
  purchaseOrder,
  warehouses,
  onClose,
  onSubmit
}) => {
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Record<string, { qty: number; warehouseId?: string }>>(() => {
    const seed: Record<string, { qty: number; warehouseId?: string }> = {};
    purchaseOrder.items.forEach(item => {
      seed[item.id] = {
        qty: 0,
        warehouseId: item.warehouseId
      };
    });
    return seed;
  });

  const totalReceiveQty = useMemo(
    () => Object.values(lines).reduce((sum, line) => sum + (line.qty || 0), 0),
    [lines]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: ReceiptLine[] = purchaseOrder.items
      .map(item => ({
        purchaseOrderItemId: item.id,
        quantityReceived: Number(lines[item.id]?.qty || 0),
        warehouseId: lines[item.id]?.warehouseId || item.warehouseId
      }))
      .filter(line => line.quantityReceived > 0);

    if (payload.length === 0) {
      alert('يرجى إدخال كميات للاستلام.');
      return;
    }

    onSubmit({
      notes: notes || undefined,
      lines: payload
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">استلام من أمر الشراء</h3>
            <p className="text-sm text-slate-500">{purchaseOrder.poNumber} - {purchaseOrder.vendorName || purchaseOrder.vendorId}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="space-y-3">
            {purchaseOrder.items.map(item => {
              const remaining = Math.max(0, item.orderedQty - item.receivedQty);
              return (
                <div key={item.id} className="grid grid-cols-12 gap-3 p-3 border border-slate-200 rounded-lg">
                  <div className="col-span-12 md:col-span-5">
                    <p className="text-sm font-semibold text-slate-800">{item.sku} - {item.productName}</p>
                    <p className="text-xs text-slate-500">مطلوب: {item.orderedQty} | مستلم: {item.receivedQty} | متبقي: {remaining}</p>
                  </div>
                  <div className="col-span-6 md:col-span-4">
                    <label className="block text-xs text-slate-500 mb-1">المستودع</label>
                    <select
                      value={lines[item.id]?.warehouseId || ''}
                      onChange={e => setLines(prev => ({ ...prev, [item.id]: { ...prev[item.id], warehouseId: e.target.value } }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">افتراضي</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <label className="block text-xs text-slate-500 mb-1">كمية الاستلام</label>
                    <input
                      type="number"
                      min="0"
                      max={remaining}
                      value={lines[item.id]?.qty ?? 0}
                      onChange={e => setLines(prev => ({ ...prev, [item.id]: { ...prev[item.id], qty: Number(e.target.value) } }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-1">ملاحظات الاستلام</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">إجمالي الكمية المستلمة الآن: {totalReceiveQty}</p>
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
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <CheckCircle size={16} />
                تأكيد الاستلام
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseOrderReceiveModal;
