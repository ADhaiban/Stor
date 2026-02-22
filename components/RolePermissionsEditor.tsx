
import React, { useState, useEffect } from 'react';
import { X, Save, Shield, Check, Minus } from 'lucide-react';
import { permissionService } from '../services/permissions';
import { Role, PermissionGridRow } from '../types';

interface RolePermissionsEditorProps {
    role: Role;
    onClose: () => void;
    onSave: () => void;
}

const RolePermissionsEditor: React.FC<RolePermissionsEditorProps> = ({ role, onClose, onSave }) => {
    const [grid, setGrid] = useState<PermissionGridRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [actions, setActions] = useState<any[]>([]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [gridData, actionsData] = await Promise.all([
                    permissionService.getPermissionGrid(role.id, 'role'),
                    permissionService.getActions()
                ]);
                setGrid(gridData);
                setActions(actionsData);
            } catch (error) {
                console.error('Error loading permissions:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [role.id]);

    const handleToggle = (moduleName: string, actionName: string) => {
        setGrid(prev => prev.map(row => {
            if (row.moduleName === moduleName) {
                return {
                    ...row,
                    permissions: {
                        ...row.permissions,
                        [actionName]: {
                            ...row.permissions[actionName],
                            hasPermission: !row.permissions[actionName].hasPermission
                        }
                    }
                };
            }
            return row;
        }));
    };

    const handleToggleAllModule = (moduleName: string, value: boolean) => {
        setGrid(prev => prev.map(row => {
            if (row.moduleName === moduleName) {
                const newPerms = { ...row.permissions };
                Object.keys(newPerms).forEach(act => {
                    if (newPerms[act].isAvailable) {
                        newPerms[act].hasPermission = value;
                    }
                });
                return { ...row, permissions: newPerms };
            }
            return row;
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const permissions = grid.flatMap(row =>
                Object.values(row.permissions).map((p: any) => ({
                    moduleId: row.moduleId,
                    actionId: p.actionId,
                    hasPermission: p.hasPermission,
                    isAvailable: p.isAvailable
                }))
                    .filter(p => p.isAvailable)
                    .map(p => ({
                        moduleId: p.moduleId,
                        actionId: p.actionId,
                        hasPermission: p.hasPermission
                    }))
            );

            await permissionService.updateRolePermissions({
                roleId: role.id,
                permissions
            });
            onSave();
        } catch (error) {
            console.error('Error saving role permissions:', error);
            alert('فشل في حفظ الصلاحيات');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50">
                <div className="bg-white p-6 rounded-xl shadow-xl flex items-center gap-3">
                    <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-bold text-slate-800">جاري تحميل الصلاحيات...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
            <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">تعديل صلاحيات الدور: {role.displayName}</h3>
                            <p className="text-sm text-slate-500">{role.description || 'لا يوجد وصف'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Permissions Grid */}
                <div className="flex-1 overflow-auto p-6 custom-scrollbar">
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 border-b border-slate-200 w-64">الوحدة / الوظيفة</th>
                                    {actions.map(action => (
                                        <th key={action.id} className="px-4 py-3 border-b border-slate-200 text-center">
                                            {action.displayName}
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 border-b border-slate-200 text-center w-24">الكل</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {grid.map(row => {
                                    const availablePerms = Object.values(row.permissions).map((p: any) => p).filter(p => p.isAvailable);
                                    const allChecked = availablePerms.length > 0 && availablePerms.every(p => p.hasPermission);
                                    const someChecked = availablePerms.length > 0 && availablePerms.some(p => p.hasPermission) && !allChecked;

                                    return (
                                        <tr key={row.moduleId} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 font-bold text-slate-800 border-l border-slate-200">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-400">{/* Icon placeholder */}</span>
                                                    {row.moduleDisplayName}
                                                </div>
                                            </td>
                                            {actions.map(action => {
                                                const perm = row.permissions[action.name];
                                                if (!perm || !perm.isAvailable) {
                                                    return <td key={action.id} className="px-4 py-3 text-center bg-slate-50/50"></td>;
                                                }
                                                return (
                                                    <td key={action.id} className="px-4 py-3 text-center">
                                                        <label className="flex items-center justify-center cursor-pointer group">
                                                            <input
                                                                type="checkbox"
                                                                checked={perm.hasPermission}
                                                                onChange={() => handleToggle(row.moduleName, action.name)}
                                                                className="hidden"
                                                            />
                                                            <div className={`w-6 h-6 rounded flex items-center justify-center transition-all ${perm.hasPermission
                                                                ? 'bg-rose-700 text-white shadow-md'
                                                                : 'bg-slate-50 text-transparent border-2 border-slate-200 group-hover:border-rose-400'
                                                                }`}>
                                                                <Check size={16} strokeWidth={3} />
                                                            </div>
                                                        </label>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-4 py-3 text-center border-r border-slate-200 bg-rose-50/10">
                                                {availablePerms.length > 0 && (
                                                    <button
                                                        onClick={() => handleToggleAllModule(row.moduleName, !allChecked)}
                                                        className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-all ${allChecked
                                                            ? 'bg-rose-700 text-white shadow-md'
                                                            : someChecked
                                                                ? 'bg-rose-100 text-rose-600 border-2 border-rose-300'
                                                                : 'bg-rose-50 text-transparent border-2 border-slate-200 hover:border-rose-400'
                                                            }`}
                                                    >
                                                        {allChecked ? <Check size={16} strokeWidth={3} /> : someChecked ? <Minus size={16} strokeWidth={3} /> : <Check size={16} />}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-bold text-sm"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-2.5 bg-rose-700 text-white rounded-xl hover:bg-rose-800 transition-all shadow-lg shadow-rose-200 disabled:opacity-50 font-bold text-sm"
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <Save size={18} />
                        )}
                        حفظ التغييرات
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RolePermissionsEditor;
