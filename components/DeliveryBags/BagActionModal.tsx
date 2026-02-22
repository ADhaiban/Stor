import React, { useState, useEffect } from 'react';
import { X, Save, Box, RefreshCw, XCircle } from 'lucide-react';
import { DeliveryBag, BagStatus, Beneficiary, Product, Warehouse } from '../../types';
import { dataService } from '../../services/api';

type ActionType = 'SUPPLY' | 'ISSUE' | 'RECEIVE' | 'RECEIVE_AND_ISSUE';

interface BagActionModalProps {
    action: ActionType;
    bag?: DeliveryBag; // Optional for SUPPLY/REGISTER
    drivers: Beneficiary[];
    currentUser: { id: string; name: string };
    onClose: () => void;
    onSuccess: () => void;
}

const BagActionModal: React.FC<BagActionModalProps> = ({
    action,
    bag,
    drivers,
    currentUser,
    onClose,
    onSuccess
}) => {
    const [formData, setFormData] = useState({
        serialNo: '',
        productId: '',
        warehouseId: '',
        targetDriverId: '',
        status: 'AVAILABLE' as BagStatus, // Default for receipt
        notes: ''
    });

    const [products, setProducts] = useState<Product[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (bag) {
            setFormData(prev => ({ ...prev, status: bag.status }));
        }
    }, [bag]);

    useEffect(() => {
        if (action === 'SUPPLY') {
            const loadRefs = async () => {
                try {
                    const [pData, wData] = await Promise.all([
                        dataService.getProducts(),
                        dataService.getWarehouses()
                    ]);
                    // Ideally filter for "Bags" category, but we'll show all or user searches
                    setProducts(pData);
                    setWarehouses(wData);
                    // Set default warehouse
                    if (wData.length > 0) setFormData(prev => ({ ...prev, warehouseId: wData[0].id }));
                    // Set default product if only one
                    // if (pData.length === 1) setFormData(prev => ({ ...prev, productId: pData[0].id }));
                } catch (e) {
                    console.error("Error loading references", e);
                }
            };
            loadRefs();
        }
    }, [action]);

    const getTitle = () => {
        switch (action) {
            case 'SUPPLY': return 'تسجيل شنطة جديدة (إضافة سيريال)';
            case 'ISSUE': return 'صرف شنطة لموصل';
            case 'RECEIVE': return 'استلام شنطة من موصل';
            case 'RECEIVE_AND_ISSUE': return 'استلام وصرف (تبديل عهدة)';
            default: return '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            if (action === 'SUPPLY') {
                if (!formData.serialNo.trim()) throw new Error('يرجى إدخال رقم السيريال');
                if (!formData.productId) throw new Error('يرجى اختيار المنتج');
                if (!formData.warehouseId) throw new Error('يرجى اختيار المستودع');

                await dataService.registerBagProduct({
                    serialNo: formData.serialNo,
                    productId: formData.productId,
                    warehouseId: formData.warehouseId,
                    userId: currentUser.id,
                    notes: formData.notes
                });
            } else {
                if (!bag) throw new Error('بيانات الشنطة غير موجودة');

                if (action === 'ISSUE') {
                    if (!formData.targetDriverId) throw new Error('يرجى اختيار الموصل');
                    await dataService.issueBagSerial(
                        bag.serialId,
                        formData.targetDriverId,
                        currentUser.id,
                        formData.notes
                    );
                } else if (action === 'RECEIVE') {
                    // Status for receive is usually AVAILABLE unless damaged
                    await dataService.receiveBagSerial(
                        bag.serialId,
                        formData.status !== 'ISSUED' ? formData.status : 'AVAILABLE',
                        currentUser.id,
                        formData.notes
                    );
                } else if (action === 'RECEIVE_AND_ISSUE') {
                    if (!formData.targetDriverId) throw new Error('يرجى اختيار الموصل الجديد');
                    await dataService.transferBagSerial(
                        bag.serialId,
                        formData.targetDriverId,
                        currentUser.id,
                        formData.notes
                    );
                }
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'حدث خطأ غير متوقع');
        } finally {
            setIsSubmitting(false);
        }
    };

    const statusOptions: { value: BagStatus; label: string }[] = [
        { value: 'AVAILABLE', label: 'متاح / سليم' },
        { value: 'DAMAGED', label: 'تالف' },
        { value: 'SOLD', label: 'مباع / مفقود' },
        { value: 'RESERVED', label: 'محجوز' }
    ];

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Box size={20} className="text-slate-500" />
                        {getTitle()}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                            <XCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Bag Info Display */}
                    {bag && (
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg mb-4">
                            <div className="text-sm text-blue-800 font-bold mb-1">الشنطة (Serial): {bag.bagNo}</div>
                            <div className="text-xs text-blue-600">
                                الحالة: {bag.status}
                                {bag.driverName && ` | في عهدة: ${bag.driverName}`}
                            </div>
                        </div>
                    )}

                    {action === 'SUPPLY' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">المنتج (نوع الشنطة)</label>
                                <select
                                    required
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all bg-white"
                                    value={formData.productId}
                                    onChange={e => setFormData({ ...formData, productId: e.target.value })}
                                >
                                    <option value="">اختر المنتج...</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">رقم السيريال (أرقام فقط)</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    required
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all font-mono"
                                    value={formData.serialNo}
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setFormData({ ...formData, serialNo: val });
                                    }}
                                    placeholder="أدخل الرقم التسلسلي..."
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">المستودع (مكان التوريد)</label>
                                <select
                                    required
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all bg-white"
                                    value={formData.warehouseId}
                                    onChange={e => setFormData({ ...formData, warehouseId: e.target.value })}
                                >
                                    <option value="">اختر المستودع...</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {(action === 'ISSUE' || action === 'RECEIVE_AND_ISSUE') && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                {action === 'RECEIVE_AND_ISSUE' ? 'الموصل الجديد' : 'الموصل المستلم'}
                            </label>
                            <select
                                required
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all appearance-none bg-white"
                                value={formData.targetDriverId}
                                onChange={e => setFormData({ ...formData, targetDriverId: e.target.value })}
                            >
                                <option value="">اختر الموصل...</option>
                                {drivers.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {(action === 'RECEIVE') && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">حالة الإرجاع</label>
                            <div className="flex flex-wrap gap-2">
                                {statusOptions.filter(o => o.value !== 'SOLD').map(option => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, status: option.value })}
                                        className={`px-3 py-2 text-sm rounded-lg border transition-all ${formData.status === option.value
                                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">ملاحظات</label>
                        <textarea
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all min-h-[80px]"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="ملاحظات..."
                        />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-[2] px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-all shadow-sm shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <RefreshCw size={18} className="animate-spin" />
                                    جاري التنفيذ...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    تنفيذ
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BagActionModal;
