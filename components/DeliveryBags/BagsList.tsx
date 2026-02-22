import React, { useState, useEffect } from 'react';
import { DeliveryBag, Beneficiary } from '../../types';
import { dataService } from '../../services/api';
import GenericList, { Column } from '../GenericList';
import { Plus, ArrowRightLeft, Upload, Download, History } from 'lucide-react';
import BagActionModal from './BagActionModal';
import { formatLongDateTime } from '../../utils/dateFormat';

interface BagsListProps {
    currentUser: { id: string; name: string };
    onShowHistory: (bagNo?: string, driverId?: string) => void;
}

const BagsList: React.FC<BagsListProps> = ({ currentUser, onShowHistory }) => {
    const [bags, setBags] = useState<DeliveryBag[]>([]);
    const [drivers, setDrivers] = useState<Beneficiary[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalConfig, setModalConfig] = useState<{
        show: boolean;
        action: 'SUPPLY' | 'ISSUE' | 'RECEIVE' | 'RECEIVE_AND_ISSUE';
        bag?: DeliveryBag;
    }>({ show: false, action: 'SUPPLY' });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [bagsData, beneficiariesData] = await Promise.all([
                dataService.getDeliveryBags(),
                dataService.getBeneficiaries()
            ]);
            setBags(bagsData);
            setDrivers(beneficiariesData.filter(b => b.type === 'DELIVERY_DRIVER'));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAction = (action: 'SUPPLY' | 'ISSUE' | 'RECEIVE' | 'RECEIVE_AND_ISSUE', bag?: DeliveryBag) => {
        setModalConfig({ show: true, action, bag });
    };

    const columns: Column<DeliveryBag>[] = [
        { header: 'رقم الشنطة', accessor: 'bagNo' },
        {
            header: 'الحالة',
            render: (bag) => {
                let colorClass = 'bg-slate-100 text-slate-600';
                if (bag.status === 'AVAILABLE') colorClass = 'bg-blue-50 text-blue-600'; // In Stock
                if (bag.status === 'ISSUED') colorClass = 'bg-purple-50 text-purple-600'; // With Driver
                if (bag.status === 'DAMAGED') colorClass = 'bg-red-50 text-red-600';
                if (bag.status === 'SOLD') colorClass = 'bg-gray-50 text-gray-500'; // Missing/Sold
                if (bag.status === 'RESERVED') colorClass = 'bg-amber-50 text-amber-600';

                const labelMap: Record<string, string> = {
                    'AVAILABLE': 'متاح (مخزن)',
                    'ISSUED': 'مصروفة',
                    'DAMAGED': 'تالفة',
                    'SOLD': 'مفقودة/مباعة',
                    'RESERVED': 'محجوزة'
                };

                return (
                    <span className={`px-2 py-1 rounded text-xs font-bold ${colorClass}`}>
                        {labelMap[bag.status] || bag.status}
                    </span>
                );
            }
        },
        { header: 'النوع', accessor: 'productName' },
        { header: 'الفرع/المستودع', accessor: 'branchName' },
        {
            header: 'العهدة حالياً لدى',
            render: (bag) => (
                <span className={`font-medium ${bag.isIssued ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                    {bag.driverName}
                </span>
            )
        },
        { header: 'تاريخ التوريد', render: b => b.suppliedAt ? formatLongDateTime(b.suppliedAt) : '-' },
        {
            header: 'تاريخ الصرف',
            render: b => b.isIssued && b.issuedAt ? (
                <span className="text-purple-600 font-medium">{formatLongDateTime(b.issuedAt)}</span>
            ) : '-'
        },
        {
            header: 'الإجراءات',
            render: (bag) => (
                <div className="flex gap-1 justify-end">
                    {/* Issue Button: Active only if NOT issued and AVAILABLE */}
                    <button
                        onClick={() => !bag.isIssued && bag.status === 'AVAILABLE' && handleAction('ISSUE', bag)}
                        disabled={bag.isIssued || bag.status !== 'AVAILABLE'}
                        className={`p-1 rounded border transition-colors ${!bag.isIssued && bag.status === 'AVAILABLE'
                            ? 'text-blue-600 hover:bg-blue-50 border-transparent hover:border-blue-100'
                            : 'text-slate-300 border-transparent cursor-not-allowed'
                            }`}
                        title={bag.isIssued ? 'الشنطة منصرفة بالفعل' : 'صرف لموصل'}
                    >
                        <Upload size={16} />
                    </button>

                    {/* Receive Button: Active only if ISSUED */}
                    <button
                        onClick={() => bag.isIssued && handleAction('RECEIVE', bag)}
                        disabled={!bag.isIssued}
                        className={`p-1 rounded border transition-colors ${bag.isIssued
                            ? 'text-green-600 hover:bg-green-50 border-transparent hover:border-green-100'
                            : 'text-slate-300 border-transparent cursor-not-allowed'
                            }`}
                        title={!bag.isIssued ? 'الشنطة في المخزن' : 'استلام من موصل'}
                    >
                        <Download size={16} />
                    </button>

                    {/* Receive & Issue (Swap) Button: Active only if ISSUED */}
                    <button
                        onClick={() => bag.isIssued && handleAction('RECEIVE_AND_ISSUE', bag)}
                        disabled={!bag.isIssued}
                        className={`p-1 rounded border transition-colors ${bag.isIssued
                            ? 'text-purple-600 hover:bg-purple-50 border-transparent hover:border-purple-100'
                            : 'text-slate-300 border-transparent cursor-not-allowed'
                            }`}
                        title={!bag.isIssued ? 'الشنطة في المخزن' : 'استلام وصرف (تبديل)'}
                    >
                        <ArrowRightLeft size={16} />
                    </button>

                    {/* History: Always available */}
                    <button
                        onClick={() => onShowHistory(bag.bagNo, undefined)}
                        className="p-1 text-slate-500 hover:bg-slate-100 rounded border border-transparent hover:border-slate-200 transition-colors"
                        title="سجل الحركات"
                    >
                        <History size={16} />
                    </button>
                </div>
            )
        }
    ];

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <>
            <GenericList
                data={bags}
                columns={columns as any}
                title="تقرير عهد الشنط"
                searchKeys={['bagNo', 'driverName', 'branchName', 'productName'] as any}
                onAdd={() => handleAction('SUPPLY')}
            />

            {modalConfig.show && (
                <BagActionModal
                    action={modalConfig.action}
                    bag={modalConfig.bag}
                    drivers={drivers}
                    currentUser={currentUser}
                    onClose={() => setModalConfig({ ...modalConfig, show: false })}
                    onSuccess={fetchData}
                />
            )}
        </>
    );
};

export default BagsList;
