import React, { useState, useEffect } from 'react';
import { CompanyBranch } from '../types';
import { dataService } from '../services/api';
import GenericList, { Column } from './GenericList';
import { Edit2, Trash2, Plus } from 'lucide-react';
import BranchModal from './BranchModal';
import { formatLongDateTime } from '../utils/dateFormat';

const BranchesList: React.FC = () => {
    const [branches, setBranches] = useState<CompanyBranch[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState<CompanyBranch | undefined>();

    const fetchBranches = async () => {
        try {
            setLoading(true);
            const data = await dataService.getBranches();
            setBranches(data);
        } catch (error) {
            console.error('Failed to fetch branches:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    const handleAdd = () => {
        setSelectedBranch(undefined);
        setShowModal(true);
    };

    const handleEdit = (branch: CompanyBranch) => {
        setSelectedBranch(branch);
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('هل أنت متأكد من حذف هذا الفرع؟')) {
            try {
                await dataService.deleteBranch(id);
                fetchBranches();
            } catch (error) {
                console.error('Failed to delete branch:', error);
            }
        }
    };

    const handleSubmit = async (formData: Partial<CompanyBranch>) => {
        try {
            if (selectedBranch) {
                await dataService.updateBranch(selectedBranch.id, formData);
            } else {
                await dataService.createBranch(formData);
            }
            setShowModal(false);
            fetchBranches();
        } catch (error) {
            console.error('Failed to save branch:', error);
        }
    };

    const columns: Column<CompanyBranch>[] = [
        { header: 'ID', accessor: 'id' as any },
        { header: 'اسم الفرع (عربي)', accessor: 'nameAr' as any },
        { header: 'اسم الفرع (إنجليزي)', accessor: 'nameEn' as any },
        {
            header: 'تاريخ الإضافة',
            render: (b) => formatLongDateTime(b.createdAt)
        },
        {
            header: 'الإجراءات',
            render: (branch) => (
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={() => handleEdit(branch)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="تعديل"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={() => handleDelete(branch.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="حذف"
                    >
                        <Trash2 size={16} />
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
                title="إدارة فروع الشركة"
                data={branches}
                columns={columns as any}
                searchKeys={['nameAr', 'nameEn'] as any}
                onAdd={handleAdd}
            />

            {showModal && (
                <BranchModal
                    onClose={() => setShowModal(false)}
                    onSubmit={handleSubmit}
                    existingBranch={selectedBranch}
                />
            )}
        </>
    );
};

export default BranchesList;
