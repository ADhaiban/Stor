import React, { useState, useEffect } from 'react';
import { BagEvent } from '../../types';
import { dataService } from '../../services/api';
import GenericList, { Column } from '../GenericList';
import { formatLongDateTime } from '../../utils/dateFormat';

interface BagEventsListProps {
    bagId?: string; // This expects bagNo (serial number) now
    driverId?: string;
    title?: string;
}

const BagEventsList: React.FC<BagEventsListProps> = ({ bagId, driverId, title }) => {
    const [events, setEvents] = useState<BagEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const data = await dataService.getBagEvents(bagId, driverId);
                setEvents(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, [bagId, driverId]);

    const columns: Column<BagEvent>[] = [
        { header: 'المستخدم', accessor: 'userName' },
        {
            header: 'نوع الحركة',
            accessor: 'type',
            render: (e) => {
                const labels: Record<string, string> = {
                    'IN': 'توريد / إرجاع',
                    'OUT': 'صرف',
                    'TRANSFER': 'نقل',
                    'ADJUSTMENT': 'تسوية',
                    'CONSUMPTION': 'استهلاك'
                };
                const colors: Record<string, string> = {
                    'IN': 'text-blue-600 bg-blue-50',
                    'OUT': 'text-purple-600 bg-purple-50',
                    'TRANSFER': 'text-amber-600 bg-amber-50',
                    'ADJUSTMENT': 'text-slate-600 bg-slate-50'
                };
                return (
                    <span className={`px-2 py-1 rounded text-xs font-bold ${colors[e.type] || 'text-gray-600'}`}>
                        {labels[e.type] || e.type}
                    </span>
                );
            }
        },
        { header: 'الشنطة', accessor: 'bagNo' },
        { header: 'المستفيد / الموصل', accessor: 'beneficiaryName' },
        { header: 'تاريخ', render: e => formatLongDateTime(e.date) },
        { header: 'ملاحظات', accessor: 'notes' }
    ];

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <GenericList
            data={events}
            columns={columns}
            title={title || "سجل حركات الشنط"}
            searchKeys={['bagNo', 'beneficiaryName', 'userName', 'notes']}
        />
    );
};

export default BagEventsList;
