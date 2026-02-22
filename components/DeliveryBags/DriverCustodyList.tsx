import React, { useState, useEffect } from 'react';
import { DeliveryBag } from '../../types';
import { dataService } from '../../services/api';
import GenericList, { Column } from '../GenericList';
import { formatLongDateTime } from '../../utils/dateFormat';

const DriverCustodyList: React.FC = () => {
    const [bags, setBags] = useState<DeliveryBag[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBags = async () => {
            try {
                const data = await dataService.getDeliveryBags();
                setBags(data.filter(b => b.isIssued));
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchBags();
    }, []);

    const columns: Column<DeliveryBag>[] = [
        { header: 'الموصل', accessor: 'driverName' },
        { header: 'رقم الشنطة', accessor: 'bagNo' },
        {
            header: 'الحالة',
            render: (bag) => (
                <span className="px-2 py-1 rounded text-xs font-bold bg-purple-50 text-purple-600">
                    {bag.status || 'ISSUED'}
                </span>
            )
        },
        { header: 'تاريخ الصرف', render: b => b.issuedAt ? formatLongDateTime(b.issuedAt) : '-' },
        { header: 'الفرع', accessor: 'branchName' }
    ];

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <GenericList
            data={bags}
            columns={columns}
            title="تقرير عهدة الموصلين"
            searchKeys={['driverName', 'bagNo', 'branchName']}
        />
    );
};

export default DriverCustodyList;
