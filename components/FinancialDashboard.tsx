import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Calendar, DollarSign } from 'lucide-react';
import { FinancialTransaction, Vendor, Client, EntityType, CollectionAlert } from '../types';
import { formatLongDateTime } from '../utils/dateFormat';

interface FinancialDashboardProps {
    vendors: Vendor[];
    clients: Client[];
    transactions: FinancialTransaction[];
}

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ vendors, clients, transactions }) => {
    const [selectedEntity, setSelectedEntity] = useState<{ type: EntityType; id: string } | null>(null);
    const [dateRange, setDateRange] = useState({ from: '', to: '' });

    // Calculate totals
    const totalPayables = useMemo(() =>
        vendors.reduce((sum, v) => sum + v.currentBalance, 0),
        [vendors]
    );

    const totalReceivables = useMemo(() =>
        clients.reduce((sum, c) => sum + c.currentBalance, 0),
        [clients]
    );

    // Calculate collection alerts (overdue)
    const collectionAlerts = useMemo<CollectionAlert[]>(() => {
        const today = new Date();
        const alerts: CollectionAlert[] = [];

        transactions
            .filter(t => t.entityType === EntityType.CLIENT && t.type === 'INVOICE' && t.dueDate && !t.paidDate)
            .forEach(t => {
                const dueDate = new Date(t.dueDate!);
                const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

                if (daysOverdue > 0) {
                    const client = clients.find(c => c.id === t.entityId);
                    alerts.push({
                        id: t.id,
                        clientId: t.entityId,
                        clientName: t.entityName,
                        invoiceId: t.referenceDocId,
                        invoiceDate: t.transactionDate,
                        dueDate: t.dueDate!,
                        amount: t.amount,
                        daysOverdue,
                        currentBalance: client?.currentBalance || 0
                    });
                }
            });

        return alerts.sort((a, b) => b.daysOverdue - a.daysOverdue);
    }, [transactions, clients]);

    // Aging analysis
    const agingReport = useMemo(() => {
        const aging = { '0-30': 0, '31-60': 0, '61+': 0 };

        collectionAlerts.forEach(alert => {
            if (alert.daysOverdue <= 30) aging['0-30'] += alert.amount;
            else if (alert.daysOverdue <= 60) aging['31-60'] += alert.amount;
            else aging['61+'] += alert.amount;
        });

        return aging;
    }, [collectionAlerts]);

    // Statement of Account (SOA)
    const getSOA = (entityType: EntityType, entityId: string) => {
        let filteredTxns = transactions.filter(t => t.entityType === entityType && t.entityId === entityId);

        if (dateRange.from) {
            filteredTxns = filteredTxns.filter(t => t.transactionDate >= dateRange.from);
        }
        if (dateRange.to) {
            filteredTxns = filteredTxns.filter(t => t.transactionDate <= dateRange.to);
        }

        return filteredTxns.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
    };

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' });
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-slate-600">إجمالي المستحقات (دائـن)</h3>
                        <TrendingDown className="text-red-500" size={20} />
                    </div>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(totalPayables)}</p>
                    <p className="text-xs text-slate-500 mt-1">{vendors.length} مورد</p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-slate-600">إجمالي المقبوضات (مدين)</h3>
                        <TrendingUp className="text-green-500" size={20} />
                    </div>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceivables)}</p>
                    <p className="text-xs text-slate-500 mt-1">{clients.length} عميل</p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-slate-600">صافي الوضع المالي</h3>
                        <DollarSign className="text-blue-500" size={20} />
                    </div>
                    <p className={`text-2xl font-bold ${totalReceivables - totalPayables >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(totalReceivables - totalPayables)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">المدين - الدائن</p>
                </div>
            </div>

            {/* Collection Alerts */}
            {collectionAlerts.length > 0 && (
                <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-red-50 border-b border-red-200 flex items-center gap-2">
                        <AlertCircle className="text-red-600" size={20} />
                        <h3 className="font-bold text-red-900">تنبيهات التحصيل المتأخر ({collectionAlerts.length})</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="px-4 py-3 text-right">العميل</th>
                                    <th className="px-4 py-3 text-right">رقم الفاتورة</th>
                                    <th className="px-4 py-3 text-right">تاريخ الاستحقاق</th>
                                    <th className="px-4 py-3 text-right">الأيام المتأخرة</th>
                                    <th className="px-4 py-3 text-right">المبلغ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {collectionAlerts.slice(0, 10).map(alert => (
                                    <tr key={alert.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium">{alert.clientName}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{alert.invoiceId}</td>
                                        <td className="px-4 py-3">{formatLongDateTime(alert.dueDate)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${alert.daysOverdue > 60 ? 'bg-red-100 text-red-700' :
                                                alert.daysOverdue > 30 ? 'bg-orange-100 text-orange-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {alert.daysOverdue} يوم
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-bold text-red-600">{formatCurrency(alert.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Aging Report */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Calendar size={20} className="text-blue-600" />
                    تحليل أعمار الديون (Aging Report)
                </h3>
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-xs text-slate-600 mb-1">0-30 يوم</p>
                        <p className="text-xl font-bold text-yellow-700">{formatCurrency(agingReport['0-30'])}</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <p className="text-xs text-slate-600 mb-1">31-60 يوم</p>
                        <p className="text-xl font-bold text-orange-700">{formatCurrency(agingReport['31-60'])}</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-xs text-slate-600 mb-1">أكثر من 60 يوم</p>
                        <p className="text-xl font-bold text-red-700">{formatCurrency(agingReport['61+'])}</p>
                    </div>
                </div>
            </div>

            {/* SOA Viewer */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">كشف حساب (Statement of Account)</h3>

                <div className="grid grid-cols-3 gap-4 mb-4">
                    <select
                        className="px-3 py-2 border border-slate-300 rounded-lg"
                        onChange={(e) => {
                            const [type, id] = e.target.value.split('|');
                            if (type && id) setSelectedEntity({ type: type as EntityType, id });
                            else setSelectedEntity(null);
                        }}
                    >
                        <option value="">اختر مورد أو عميل...</option>
                        <optgroup label="الموردين">
                            {vendors.map(v => (
                                <option key={v.id} value={`${EntityType.VENDOR}|${v.id}`}>{v.name}</option>
                            ))}
                        </optgroup>
                        <optgroup label="العملاء">
                            {clients.map(c => (
                                <option key={c.id} value={`${EntityType.CLIENT}|${c.id}`}>{c.name}</option>
                            ))}
                        </optgroup>
                    </select>

                    <input
                        type="date"
                        className="px-3 py-2 border border-slate-300 rounded-lg"
                        value={dateRange.from}
                        onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                        placeholder="من تاريخ"
                    />

                    <input
                        type="date"
                        className="px-3 py-2 border border-slate-300 rounded-lg"
                        value={dateRange.to}
                        onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                        placeholder="إلى تاريخ"
                    />
                </div>

                {selectedEntity && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-t">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="px-4 py-3 text-right">التاريخ</th>
                                    <th className="px-4 py-3 text-right">النوع</th>
                                    <th className="px-4 py-3 text-right">المرجع</th>
                                    <th className="px-4 py-3 text-right">المبلغ</th>
                                    <th className="px-4 py-3 text-right">الرصيد بعد</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {getSOA(selectedEntity.type, selectedEntity.id).map(txn => (
                                    <tr key={txn.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">{formatLongDateTime(txn.transactionDate)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs ${txn.type === 'INVOICE' ? 'bg-blue-100 text-blue-700' :
                                                txn.type === 'PAYMENT' ? 'bg-green-100 text-green-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                {txn.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs">{txn.referenceDocId}</td>
                                        <td className={`px-4 py-3 font-bold ${txn.type === 'INVOICE' ? 'text-red-600' : 'text-green-600'}`}>
                                            {formatCurrency(txn.amount)}
                                        </td>
                                        <td className="px-4 py-3 font-bold">{formatCurrency(txn.balanceAfter)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinancialDashboard;
