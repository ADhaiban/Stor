import React, { useState, useMemo } from 'react';
import { X, ClipboardList, Plus, History, Save, AlertCircle, Info } from 'lucide-react';
import { StockIssueRequest, Beneficiary, BeneficiaryType, Product, Department, ProductType, IssuePurpose } from '../types';
import { formatLongDateTime } from '../utils/dateFormat';
import { dataService } from '../services/api';

interface IssueRequestModalProps {
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    onAddBeneficiary: (initialType?: BeneficiaryType) => void;
    beneficiaries: Beneficiary[];
    products: Product[];
    departments: Department[];
    allIssueRequests: StockIssueRequest[]; // For history check
    editItem?: StockIssueRequest | null;
}

const IssueRequestModal: React.FC<IssueRequestModalProps> = ({
    onClose,
    onSubmit,
    onAddBeneficiary,
    beneficiaries,
    products,
    departments,
    allIssueRequests,
    editItem
}) => {
    const [beneficiaryType, setBeneficiaryType] = useState<BeneficiaryType>(editItem?.beneficiaryType || 'INTERNAL');
    const [beneficiaryId, setBeneficiaryId] = useState(editItem?.beneficiaryId || '');
    const [departmentId, setDepartmentId] = useState(editItem?.departmentId || '');
    const [productId, setProductId] = useState(editItem?.productId || '');
    const [quantity, setQuantity] = useState(editItem?.quantity || 1);
    const [purpose, setPurpose] = useState<IssuePurpose>(editItem?.purpose || 'CONSUMABLE_CUSTODY');
    const [notes, setNotes] = useState(editItem?.notes || '');
    const [requestCode, setRequestCode] = useState(editItem?.requestCode || '');

    const [showHistory, setShowHistory] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stockSnapshot, setStockSnapshot] = useState<{ onHand: number; reserved: number; available: number } | null>(null);

    // Filtered beneficiaries based on selected type
    const filteredBeneficiaries = useMemo(() => {
        return beneficiaries
            .filter(b => b.type === beneficiaryType)
            .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [beneficiaries, beneficiaryType]);

    // Check if current beneficiary has history
    const hasHistory = useMemo(() => {
        if (!beneficiaryId) return false;
        return allIssueRequests.some(r =>
            r.beneficiaryId === beneficiaryId &&
            (r.status === 'ISSUED' || r.issuedAt || r.issuedMovementId)
        );
    }, [allIssueRequests, beneficiaryId]);

    const historyItems = useMemo(() => {
        if (!beneficiaryId) return [];
        return allIssueRequests
            .filter(r => r.beneficiaryId === beneficiaryId && (r.status === 'ISSUED' || r.issuedAt || r.issuedMovementId))
            .sort((a, b) => new Date(b.issuedAt || b.createdAt).getTime() - new Date(a.issuedAt || a.createdAt).getTime());
    }, [allIssueRequests, beneficiaryId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const data = {
                request_code: requestCode || undefined,
                beneficiary_type: beneficiaryType,
                beneficiary_id: beneficiaryId,
                department_id: (beneficiaryType === 'INTERNAL' || beneficiaryType === 'COMPANY_EMPLOYEE') ? departmentId : null,
                product_id: productId,
                quantity,
                purpose,
                notes,
                status: editItem?.status || 'PENDING'
            };

            await onSubmit(data);
            onClose();
        } catch (err: any) {
            setError(err.message || 'حدث خطأ أثناء حفظ الطلب');
        } finally {
            setLoading(false);
        }
    };

    const selectedBeneficiary = beneficiaries.find(b => b.id === beneficiaryId);

    // Auto-select department if beneficiary has one
    React.useEffect(() => {
        if (selectedBeneficiary?.departmentId) {
            setDepartmentId(selectedBeneficiary.departmentId);
        }
    }, [selectedBeneficiary]);

    // Fetch real-time stock when product changes
    React.useEffect(() => {
        const fetchStock = async () => {
            if (!productId) {
                setStockSnapshot(null);
                return;
            }
            try {
                const stock = await dataService.getProductStock(productId);
                setStockSnapshot(stock);
            } catch (err) {
                console.error("Error fetching stock:", err);
            }
        };
        fetchStock();
    }, [productId]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <ClipboardList size={22} className="text-purple-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">{editItem ? 'تعديل طلب صرف' : 'طلب صرف جديد'}</h3>
                            <p className="text-xs text-slate-500">صرف عهدة أو مواد استهلاكية للموظفين والسائقين</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Request Code */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">رقم الطلب</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none placeholder:text-slate-400 font-mono text-sm"
                                value={requestCode}
                                onChange={e => setRequestCode(e.target.value)}
                                placeholder="يولد تلقائياً (اختياري)"
                            />
                        </div>

                        {/* Beneficiary Type */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between">
                                <span>فئة المستفيد <span className="text-red-500">*</span></span>
                                <button
                                    type="button"
                                    onClick={() => onAddBeneficiary()}
                                    className="text-blue-600 hover:text-blue-800 flex items-center gap-0.5 text-xs font-bold"
                                >
                                    <Plus size={12} /> إضافة فئة
                                </button>
                            </label>
                            <select
                                required
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                value={beneficiaryType}
                                onChange={e => {
                                    setBeneficiaryType(e.target.value as BeneficiaryType);
                                    setBeneficiaryId('');
                                }}
                            >
                                <option value="INTERNAL">مستفيد داخلي</option>
                                <option value="COMPANY_EMPLOYEE">موظف شركة (عهدة)</option>
                                <option value="DELIVERY_DRIVER">موصل / سائق</option>
                                <option value="EXTERNAL_CLIENT">عميل خارجي</option>
                            </select>
                        </div>

                        {/* Beneficiary Select */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between items-center">
                                <div className="flex items-center gap-1">
                                    <span>المستفيد <span className="text-red-500">*</span></span>
                                    {hasHistory && (
                                        <button
                                            type="button"
                                            onClick={() => setShowHistory(true)}
                                            className="text-purple-600 hover:text-purple-800 p-1 flex items-center gap-1 text-xs border border-purple-200 rounded bg-purple-50"
                                            title="عرض سجل الصرف السابق"
                                        >
                                            <History size={14} /> سجل الصرف
                                        </button>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onAddBeneficiary(beneficiaryType)}
                                    className="text-blue-600 hover:text-blue-800 flex items-center gap-0.5 text-xs font-bold"
                                >
                                    <Plus size={14} /> إضافة مستفيد
                                </button>
                            </label>
                            <select
                                required
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                value={beneficiaryId}
                                onChange={e => setBeneficiaryId(e.target.value)}
                            >
                                <option value="">اختر المستفيد...</option>
                                {filteredBeneficiaries.map(b => (
                                    <option key={b.id} value={b.id}>{b.name} ({b.beneficiaryCode})</option>
                                ))}
                            </select>
                            {filteredBeneficiaries.length === 0 && (
                                <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                                    <Info size={10} /> لا يوجد مستفيدين من هذه الفئة، يرجى إضافة واحد.
                                </p>
                            )}
                        </div>

                        {/* Department (Required for Internal/Employee) */}
                        {(beneficiaryType === 'INTERNAL' || beneficiaryType === 'COMPANY_EMPLOYEE') && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">الإدارة / القسم <span className="text-red-500">*</span></label>
                                <select
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
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

                        {/* Product */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">الصنف <span className="text-red-500">*</span></label>
                            <select
                                required
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                value={productId}
                                onChange={e => setProductId(e.target.value)}
                            >
                                <option value="">اختر الصنف...</option>
                                {products.sort((a, b) => a.name.localeCompare(b.name, 'ar')).map(p => (
                                    <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Quantity with Stock Snapshot */}
                        <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">الكمية المطلوبة <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${stockSnapshot && quantity > stockSnapshot.available
                                                ? 'border-amber-300 focus:ring-amber-500 bg-amber-50'
                                                : 'border-slate-300 focus:ring-purple-500 bg-white'
                                            }`}
                                        value={quantity}
                                        onChange={e => setQuantity(Number(e.target.value))}
                                    />
                                </div>
                                {stockSnapshot && (
                                    <div className="flex gap-4 text-center">
                                        <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 shadow-sm">
                                            <p className="text-[10px] text-slate-500">في المستودع</p>
                                            <p className="text-sm font-bold text-slate-700">{stockSnapshot.onHand}</p>
                                        </div>
                                        <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 shadow-sm">
                                            <p className="text-[10px] text-slate-500">محجوز</p>
                                            <p className="text-sm font-bold text-amber-600">{stockSnapshot.reserved}</p>
                                        </div>
                                        <div className="px-3 py-1 bg-white rounded-lg border border-purple-100 shadow-sm ring-1 ring-purple-100">
                                            <p className="text-[10px] text-purple-600 font-bold">المتاح</p>
                                            <p className="text-sm font-bold text-purple-700">{stockSnapshot.available}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {stockSnapshot && quantity > stockSnapshot.available && (
                                <div className="flex items-center gap-2 p-2 bg-amber-100 border border-amber-200 rounded-lg text-amber-800 text-[11px] animate-pulse">
                                    <Info size={14} />
                                    <span>تحذير: الكمية المطلوبة تتجاوز الرصيد المتاح حالياً. سيتم تعليق الصرف حتى توفر الكمية.</span>
                                </div>
                            )}
                        </div>

                        {/* Purpose */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">الغرض <span className="text-red-500">*</span></label>
                            <select
                                required
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                value={purpose}
                                onChange={e => setPurpose(e.target.value as IssuePurpose)}
                            >
                                <option value="CONSUMABLE_CUSTODY">عهدة مستهلكة</option>
                                <option value="UNIFORM">زي رسمي (Uniform)</option>
                                <option value="DELIVERY_BAG">شنطة توصيل</option>
                                <option value="CUSTODY">عهدة مستديمة (Asset)</option>
                            </select>
                        </div>

                        {/* Notes */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">ملاحظات</label>
                            <textarea
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none h-20 text-sm"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="أي تفاصيل تود إضافتها..."
                            ></textarea>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !beneficiaryId || !productId}
                            className="px-6 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <Save size={18} />
                            {loading ? 'جاري الحفظ...' : editItem ? 'تحديث الطلب' : 'حفظ الطلب'}
                        </button>
                    </div>
                </form>

                {/* History Modal Overlay */}
                {showHistory && (
                    <div className="absolute inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    <History size={18} className="text-purple-600" />
                                    سجل الصرف: {selectedBeneficiary?.name}
                                </h4>
                                <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto max-h-[60vh]">
                                <table className="w-full text-[11px] text-right">
                                    <thead className="bg-slate-50 text-slate-500 border-b">
                                        <tr>
                                            <th className="px-2 py-2">رقم الطلب</th>
                                            <th className="px-2 py-2">تاريخ الصرف</th>
                                            <th className="px-2 py-2">الصنف</th>
                                            <th className="px-2 py-2">الكمية</th>
                                            <th className="px-2 py-2">الإدارة</th>
                                            <th className="px-2 py-2">الحالة</th>
                                            <th className="px-2 py-2 text-left">رقم الحركة</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {historyItems.map(h => (
                                            <tr key={h.id} className="hover:bg-slate-50">
                                                <td className="px-2 py-2 font-mono">{h.requestCode}</td>
                                                <td className="px-2 py-2">{formatLongDateTime(h.issuedAt || h.createdAt)}</td>
                                                <td className="px-2 py-2">{h.productName}</td>
                                                <td className="px-2 py-2 font-bold">{h.quantity}</td>
                                                <td className="px-2 py-2">{departments.find(d => d.id === h.departmentId)?.name || '-'}</td>
                                                <td className="px-2 py-2">
                                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${h.status === 'ISSUED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {h.status === 'ISSUED' ? 'تم الصرف' : h.status}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-2 text-left font-mono text-slate-400">{h.issuedMovementId || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {historyItems.length === 0 && (
                                    <div className="text-center py-8 text-slate-400">لا يوجد سجل صرف سابق</div>
                                )}
                            </div>
                            <div className="px-5 py-3 bg-slate-50 border-t flex justify-end">
                                <button onClick={() => setShowHistory(false)} className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded">
                                    إغلاق
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IssueRequestModal;
