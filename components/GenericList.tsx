import React, { useState, useMemo } from 'react';
import { Search, Filter, Layers, Download, Plus, Edit, Trash2, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface Column<T> {
    header: string;
    accessor?: keyof T;
    render?: (item: T) => React.ReactNode;
    className?: string;
    sortable?: boolean;   // Enable sorting on this column
    sortKey?: string;     // DB field name for backend sort (optional, defaults to accessor)
}

interface GenericListProps<T> {
    data: T[];
    columns: Column<T>[];
    title: string;
    searchKeys: (keyof T)[];
    onAdd?: () => void;
    onEdit?: (item: T) => void;
    onDelete?: (item: T) => void;
    enableDateFilter?: boolean;
    dateAccessor?: keyof T;
}

const GenericList = <T extends { id: string | number }>({
    data,
    columns,
    title,
    searchKeys,
    onAdd,
    onEdit,
    onDelete,
    enableDateFilter,
    dateAccessor
}: GenericListProps<T>) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const handleColumnFilterChange = (key: string, value: string) => {
        setColumnFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Columns Visibility State
    const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
    const [showColMenu, setShowColMenu] = useState(false);

    const toggleColumn = (header: string) => {
        setHiddenColumns(prev =>
            prev.includes(header)
                ? prev.filter(h => h !== header)
                : [...prev, header]
        );
    };

    const isColumnVisible = (header: string) => !hiddenColumns.includes(header);

    const filteredData = useMemo(() => {
        let result = data;

        // Global Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(item =>
                searchKeys.some(key => {
                    const value = item[key];
                    return String(value).toLowerCase().includes(lowerTerm);
                })
            );
        }

        // Column Filters
        if (showFilters) {
            Object.entries(columnFilters).forEach(([key, filterValue]) => {
                if (filterValue) {
                    const lowerFilter = String(filterValue).toLowerCase();
                    result = result.filter(item => {
                        const val = item[key as keyof T];
                        return String(val).toLowerCase().includes(lowerFilter);
                    });
                }
            });

            // Date Range Filter
            if (enableDateFilter && dateAccessor && (dateRange.start || dateRange.end)) {
                result = result.filter(item => {
                    const itemDate = new Date(String(item[dateAccessor]));
                    // Reset time for comparison
                    itemDate.setHours(0, 0, 0, 0);

                    let isValid = true;
                    if (dateRange.start) {
                        const start = new Date(dateRange.start);
                        start.setHours(0, 0, 0, 0);
                        if (itemDate < start) isValid = false;
                    }
                    if (dateRange.end) {
                        const end = new Date(dateRange.end);
                        end.setHours(23, 59, 59, 999);
                        // Notice: Set to end of day to be inclusive
                        if (itemDate > end) isValid = false;
                    }
                    return isValid;
                });
            }
        }

        return result;
    }, [data, searchTerm, searchKeys, columnFilters, showFilters, dateRange, enableDateFilter, dateAccessor]);

    // Sort the filtered data
    const sortedData = useMemo(() => {
        if (!sortConfig) return filteredData;
        const { key, direction } = sortConfig;
        return [...filteredData].sort((a, b) => {
            const aVal = a[key as keyof T];
            const bVal = b[key as keyof T];
            // Handle null/undefined
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;
            // Date detection
            const aStr = String(aVal);
            const bStr = String(bVal);
            const aDate = new Date(aStr);
            const bDate = new Date(bStr);
            if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime()) && aStr.length > 8) {
                return direction === 'asc' ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
            }
            // Number detection
            const aNum = Number(aVal);
            const bNum = Number(bVal);
            if (!isNaN(aNum) && !isNaN(bNum) && aStr !== '' && bStr !== '') {
                return direction === 'asc' ? aNum - bNum : bNum - aNum;
            }
            // String compare
            return direction === 'asc' ? aStr.localeCompare(bStr, 'ar') : bStr.localeCompare(aStr, 'ar');
        });
    }, [filteredData, sortConfig]);

    const handleSort = (col: Column<T>) => {
        const key = col.accessor as string;
        if (!key) return;
        setSortConfig(prev => {
            if (prev?.key === key) {
                return prev.direction === 'asc' ? { key, direction: 'desc' } : null;
            }
            return { key, direction: 'asc' };
        });
    };

    const handleExport = () => {
        if (filteredData.length === 0) return;

        // Create CSV Headers
        const visibleCols = columns.filter(c => !hiddenColumns.includes(c.header));
        const headers = visibleCols.map(c => c.header).join(',');

        // Create CSV Rows
        const rows = sortedData.map(item => {
            return visibleCols.map(c => {
                let val = '';
                if (c.accessor) {
                    val = String(item[c.accessor]);
                } else {
                    val = '';
                }
                return `"${val.replace(/"/g, '""')}"`;
            }).join(',');
        }).join('\n');

        const csvContent = "\uFEFF" + headers + "\n" + rows; // Add BOM for Excel support
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${title}_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getSortIcon = (col: Column<T>) => {
        const key = col.accessor as string;
        if (!key) return null;
        if (sortConfig?.key === key) {
            return sortConfig.direction === 'asc'
                ? <ArrowUp size={12} className="inline-block mr-1 text-blue-500" />
                : <ArrowDown size={12} className="inline-block mr-1 text-blue-500" />;
        }
        return <ArrowUpDown size={12} className="inline-block mr-1 text-slate-300" />;
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{title}</h2>
                    <p className="text-sm text-slate-500">تم العثور على {sortedData.length} سجل</p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    {onAdd && (
                        <button
                            onClick={onAdd}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            <Plus size={18} />
                            إضافة جديد
                        </button>
                    )}
                    <div className="relative">
                        <button
                            onClick={() => setShowColMenu(!showColMenu)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium"
                        >
                            <Layers size={18} />
                            الأعمدة
                        </button>
                        {showColMenu && (
                            <div className="absolute left-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-2 animate-in fade-in zoom-in-95">
                                <h4 className="text-xs font-bold text-slate-500 mb-2 px-2">إظهار/إخفاء الأعمدة</h4>
                                {columns.map((col, idx) => (
                                    <label key={idx} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-sm">
                                        <input
                                            type="checkbox"
                                            checked={!hiddenColumns.includes(col.header)}
                                            onChange={() => toggleColumn(col.header)}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        {col.header}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium"
                    >
                        <Download size={18} />
                        تصدير
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="بحث سريع..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    />
                </div>
                <div className="flex gap-2 hidden sm:flex">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 rounded-lg border transition-colors ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'text-slate-500 hover:bg-slate-100 border-slate-200'}`}
                        title="فلترة متقدمة"
                    >
                        <Filter size={20} />
                    </button>
                </div>
            </div>

            {showFilters && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-bold text-slate-700">خيارات الفلترة</h4>
                        <div className="flex gap-4">
                            <button onClick={() => { setColumnFilters({}); setDateRange({ start: '', end: '' }); }} className="text-xs text-red-600 hover:underline">إعادة تعيين</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        {enableDateFilter && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">من تاريخ</label>
                                    <input
                                        type="date"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">إلى تاريخ</label>
                                    <input
                                        type="date"
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm focus:border-blue-500 outline-none"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="border-t border-slate-200 my-3"></div>

                    <h4 className="text-sm font-bold text-slate-700 mb-2">فلترة الأعمدة</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {columns.filter(c => c.accessor && !hiddenColumns.includes(c.header)).map((col, idx) => (
                            <div key={idx}>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{col.header}</label>
                                <input
                                    type="text"
                                    value={columnFilters[col.accessor as string] || ''}
                                    onChange={(e) => handleColumnFilterChange(col.accessor as string, e.target.value)}
                                    placeholder={`بحث في ${col.header}...`}
                                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm focus:border-blue-500 outline-none"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                {columns.map((col, idx) => (
                                    !hiddenColumns.includes(col.header) && (
                                        <th
                                            key={idx}
                                            className={`px-6 py-4 ${col.className || ''} ${col.sortable !== false && col.accessor ? 'cursor-pointer select-none hover:bg-slate-100 transition-colors' : ''}`}
                                            onClick={() => col.sortable !== false && col.accessor && handleSort(col)}
                                        >
                                            <span className="flex items-center gap-1">
                                                {col.header}
                                                {col.sortable !== false && col.accessor && getSortIcon(col)}
                                            </span>
                                        </th>
                                    )
                                ))}
                                {(onEdit || onDelete) && <th className="px-6 py-4">الإجراءات</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {sortedData.length > 0 ? (
                                sortedData.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                        {columns.map((col, idx) => (
                                            !hiddenColumns.includes(col.header) && (
                                                <td key={idx} className="px-6 py-4">
                                                    {col.render ? col.render(item) : (col.accessor ? String(item[col.accessor]) : '')}
                                                </td>
                                            )
                                        ))}
                                        {(onEdit || onDelete) && (
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {onEdit && (
                                                        <button onClick={() => onEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md" title="تعديل">
                                                            <Edit size={16} />
                                                        </button>
                                                    )}
                                                    {onDelete && (
                                                        <button onClick={() => onDelete(item)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md" title="حذف">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columns.filter(c => !hiddenColumns.includes(c.header)).length + (onEdit || onDelete ? 1 : 0)} className="px-6 py-12 text-center text-slate-500">
                                        لا توجد بيانات للعرض
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GenericList;
