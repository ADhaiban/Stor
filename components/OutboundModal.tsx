import React, { useState } from 'react';
import { X, PackageCheck, AlertTriangle } from 'lucide-react';
import { InventoryStock, Client } from '../types';

interface OutboundModalProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  inventory: InventoryStock[];
  clients: Client[];
}

const OutboundModal: React.FC<OutboundModalProps> = ({ onClose, onSubmit, inventory, clients }) => {
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [soNumber, setSoNumber] = useState('');

  const selectedItem = inventory.find(i => i.id === selectedInventoryId);
  // Sort batches by expiry date for FIFO suggestion
  const sortedBatches = selectedItem?.batches ? [...selectedItem.batches].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()) : [];

  const availableQty = selectedItem ? selectedItem.quantityOnHand - selectedItem.quantityReserved : 0;
  const isOverStock = quantity > availableQty;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOverStock) return;
    onSubmit({ selectedInventoryId, selectedClient, quantity, soNumber });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">صرف بضاعة (صادر)</h3>
            <p className="text-sm text-slate-500">حجز وصرف المخزون لأمر بيع</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">العميل</label>
              <select
                className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={selectedClient}
                onChange={e => setSelectedClient(e.target.value)}
                required
              >
                <option value="">اختر العميل...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">رقم أمر البيع (SO)</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder-slate-400"
                placeholder="SO-XXXX"
                value={soNumber}
                onChange={e => setSoNumber(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">اختر مصدر المخزون</label>
            <select
              className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
              value={selectedInventoryId}
              onChange={e => setSelectedInventoryId(e.target.value)}
              required
            >
              <option value="">اختر المنتج والموقع...</option>
              {inventory.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.sku} | {inv.productName} | موقع: {inv.locationId} | متاح: {inv.quantityOnHand - inv.quantityReserved}
                </option>
              ))}
            </select>
          </div>

          {selectedItem && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">اقتراح الدفعة (الوارد أولاً يصرف أولاً)</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">تلقائي</span>
              </div>
              {sortedBatches.length > 0 ? (
                <div className="space-y-2">
                  {sortedBatches.map((batch, idx) => (
                    <div key={batch.id} className={`flex justify-between text-sm p-2 rounded border ${idx === 0 ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
                      <span>{batch.batchNumber}</span>
                      <span className={idx === 0 ? 'text-green-700 font-bold' : 'text-slate-500'}>
                        ينتهي: {batch.expiryDate} {idx === 0 && '(اصرف هذا)'}
                      </span>
                      <span>الكمية: {batch.quantity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">لا يوجد تتبع دفعات لهذا الصنف.</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">الكمية المطلوبة</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                required
                className={`w-full px-4 py-2 bg-white text-slate-900 border rounded-lg focus:ring-2 outline-none placeholder-slate-400 ${isOverStock ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-500'}`}
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
              />
              <div className="absolute left-3 top-2 text-xs text-slate-400">
                الحد الأقصى: {availableQty}
              </div>
            </div>
            {isOverStock && (
              <div className="flex items-center gap-2 mt-2 text-red-600 text-sm animate-pulse">
                <AlertTriangle size={16} />
                <span>الكمية المطلوبة غير متوفرة!</span>
              </div>
            )}
          </div>

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
              disabled={isOverStock || quantity <= 0}
              className={`px-5 py-2.5 text-white font-medium rounded-lg shadow-sm flex items-center gap-2
                ${isOverStock || quantity <= 0 ? 'bg-slate-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}
            >
              <PackageCheck size={18} />
              تأكيد الصرف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OutboundModal;