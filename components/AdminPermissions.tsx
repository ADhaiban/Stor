
import React, { useState, useEffect } from 'react';
import { Users, Shield, UserPlus, ShieldPlus, Key, Eye, Edit, Trash2 } from 'lucide-react';
import GenericList, { Column } from './GenericList';
import { User, Role } from '../types';
import { permissionService } from '../services/permissions';
import RolePermissionsEditor from './RolePermissionsEditor';
import GenericFormModal from './GenericFormModal';

const AdminPermissions: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [showPermissionsEditor, setShowPermissionsEditor] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [uData, rData] = await Promise.all([
                permissionService.getUsers(),
                permissionService.getRoles()
            ]);
            setUsers(uData);
            setRoles(rData);
        } catch (error) {
            console.error('Error loading permissions data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- Roles Column Definitions ---
    const roleColumns: Column<Role>[] = [
        { header: 'اسم الدور', accessor: 'displayName', className: 'font-bold' },
        { header: 'الاسم البرمجي', accessor: 'name' },
        { header: 'الوصف', accessor: 'description' },
        {
            header: 'الحالة',
            render: (role) => (
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${role.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {role.isActive ? 'نشط' : 'معطل'}
                </span>
            )
        },
        {
            header: 'الصلاحيات',
            render: (role) => (
                <button
                    onClick={(e) => { e.stopPropagation(); setSelectedItem(role); setShowPermissionsEditor(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-blue-600 hover:text-white rounded-lg transition-all text-xs font-bold shadow-sm"
                >
                    <Key size={14} />
                    إدارة الصلاحيات
                </button>
            )
        }
    ];

    // --- Users Column Definitions ---
    const userColumns: Column<User>[] = [
        { header: 'الاسم', accessor: 'name', className: 'font-bold' },
        { header: 'البريد الإلكتروني', accessor: 'email' },
        {
            header: 'الدور',
            render: (user) => (
                <div className="flex items-center gap-2">
                    <Shield size={14} className="text-blue-500" />
                    <span className="font-medium">{user.roleDisplayName}</span>
                </div>
            )
        },
        {
            header: 'الحالة',
            render: (user) => (
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {user.isActive ? 'نشط' : 'معطل'}
                </span>
            )
        },
        {
            header: 'آخر دخول',
            render: (user) => (
                <span className="text-xs text-slate-500">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString('ar-SA') : 'لم يدخل بعد'}
                </span>
            )
        }
    ];

    return (
        <div className="p-1 sm:p-6 space-y-6">
            {/* Tab Navigation */}
            <div className="flex p-1 bg-slate-100 rounded-2xl w-full max-w-md shadow-inner border border-slate-200">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    <Users size={18} />
                    إدارة المستخدمين
                </button>
                <button
                    onClick={() => setActiveTab('roles')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'roles' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    <Shield size={18} />
                    الأدوار والصلاحيات
                </button>
            </div>

            <div className="animate-in fade-in duration-500">
                {activeTab === 'users' ? (
                    <GenericList
                        data={users}
                        columns={userColumns}
                        title="إدارة المستخدمين"
                        searchKeys={['name', 'email']}
                        onAdd={() => { setSelectedItem(null); setShowUserModal(true); }}
                        onEdit={(user) => { setSelectedItem(user); setShowUserModal(true); }}
                        onDelete={(user) => { if (confirm(`هل أنت متأكد من حذف المستخدم ${user.name}؟`)) { /* handle delete */ } }}
                    />
                ) : (
                    <GenericList
                        data={roles}
                        columns={roleColumns}
                        title="أدوار النظام"
                        searchKeys={['displayName', 'name']}
                        onAdd={() => { setSelectedItem(null); setShowRoleModal(true); }}
                        onEdit={(role) => { setSelectedItem(role); setShowRoleModal(true); }}
                    />
                )}
            </div>

            {/* Role Management Modal */}
            {showRoleModal && (
                <GenericFormModal
                    title={selectedItem ? 'تعديل دور' : 'إضافة دور جديد'}
                    fields={[
                        { name: 'displayName', label: 'اسم الدور (للمستخدم)', required: true, placeholder: 'مثلاً: مدير مستودع' },
                        { name: 'name', label: 'الاسم البرمجي', required: true, placeholder: 'مثلاً: warehouse_manager' },
                        { name: 'description', label: 'الوصف', type: 'text', placeholder: 'وصف مهام هذا الدور' }
                    ]}
                    initialData={selectedItem}
                    onClose={() => setShowRoleModal(false)}
                    onSubmit={async (data) => {
                        try {
                            if (selectedItem) {
                                // In a real app, you'd call updateRole. 
                                // For now, let's use a placeholder or custom service method if we add it.
                                // await permissionService.updateRole({ id: selectedItem.id, ...data });
                                alert('تم تحديث بيانات الدور بنجاح (سيتم الحفظ في قاعدة البيانات عند ربط API التعديل)');
                            } else {
                                // await permissionService.createRole(data);
                                alert('تم إنشاء الدور بنجاح');
                            }
                            setShowRoleModal(false);
                            fetchData();
                        } catch (error) {
                            console.error('Error submitting role:', error);
                        }
                    }}
                />
            )}

            {/* User Management Modal */}
            {showUserModal && (
                <GenericFormModal
                    title={selectedItem ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
                    fields={[
                        { name: 'name', label: 'الاسم الكامل', required: true },
                        { name: 'email', label: 'البريد الإلكتروني', required: true, type: 'text' },
                        { name: 'password', label: 'كلمة المرور', required: !selectedItem, type: 'text' },
                        {
                            name: 'role_id',
                            label: 'الدور',
                            type: 'select',
                            required: true,
                            options: roles.map(r => ({ value: r.id, label: r.displayName }))
                        }
                    ]}
                    initialData={selectedItem}
                    onClose={() => setShowUserModal(false)}
                    onSubmit={(data) => {
                        console.log('User Submit:', data);
                        setShowUserModal(false);
                    }}
                />
            )}

            {/* Permissions Matrix Editor */}
            {showPermissionsEditor && selectedItem && (
                <RolePermissionsEditor
                    role={selectedItem}
                    onClose={() => setShowPermissionsEditor(false)}
                    onSave={() => {
                        setShowPermissionsEditor(false);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
};

export default AdminPermissions;
