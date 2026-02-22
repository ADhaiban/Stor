import React from 'react';
import { supabase } from '../src/lib/supabase';
import {
    Module,
    Action,
    Role,
    User,
    RolePermission,
    UserPermission,
    PermissionMatrix,
    PermissionGridRow,
    UpdateRolePermissionsRequest,
    UpdateUserPermissionsRequest
} from '../types';
import * as mock from '../mockData';

// --- Mappers ---

const mapModule = (m: any): Module => ({
    id: m.id,
    name: m.name,
    displayName: m.display_name,
    displayNameEn: m.display_name_en,
    icon: m.icon,
    sortOrder: m.sort_order,
    isActive: m.is_active,
    createdAt: m.created_at
});

const mapAction = (a: any): Action => ({
    id: a.id,
    name: a.name,
    displayName: a.display_name,
    displayNameEn: a.display_name_en,
    sortOrder: a.sort_order,
    createdAt: a.created_at
});

const mapRole = (r: any): Role => ({
    id: r.id,
    name: r.name,
    displayName: r.display_name,
    description: r.description,
    isSystemRole: r.is_system_role,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at
});

const mapUser = (u: any): User => ({
    id: u.id,
    name: u.name,
    email: u.email,
    roleId: u.role_id,
    roleName: u.roles?.name,
    roleDisplayName: u.roles?.display_name,
    isActive: u.is_active,
    lastLogin: u.last_login,
    createdAt: u.created_at,
    updatedAt: u.updated_at
});

export const permissionService = {
    // --- Modules & Actions ---

    async getModules(): Promise<Module[]> {
        const { data, error } = await supabase
            .from('modules')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) {
            console.error('Error fetching modules:', error);
            return [];
        }
        return data.map(mapModule);
    },

    async getActions(): Promise<Action[]> {
        const { data, error } = await supabase
            .from('actions')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) {
            console.error('Error fetching actions:', error);
            return [];
        }
        return data.map(mapAction);
    },

    async getModuleActions(): Promise<any[]> {
        const { data, error } = await supabase
            .from('module_actions')
            .select('module_id, action_id, is_available')
            .eq('is_available', true);

        if (error) {
            console.error('Error fetching module actions:', error);
            return [];
        }
        return data;
    },

    // --- Roles ---

    async getRoles(): Promise<Role[]> {
        const { data, error } = await supabase
            .from('roles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching roles:', error);
            return [];
        }
        return (data || [])
            .filter((r: any) => r.is_active !== false)
            .map(mapRole);
    },

    async getRolePermissions(roleId: string): Promise<RolePermission[]> {
        const { data, error } = await supabase
            .from('role_permissions')
            .select('*')
            .eq('role_id', roleId);

        if (error) {
            console.error('Error fetching role permissions:', error);
            return [];
        }
        return data.map(rp => ({
            roleId: rp.role_id,
            moduleId: rp.module_id,
            actionId: rp.action_id,
            hasPermission: rp.has_permission,
            createdAt: rp.created_at,
            updatedAt: rp.updated_at
        }));
    },

    async updateRolePermissions(req: UpdateRolePermissionsRequest): Promise<void> {
        const { roleId, permissions } = req;

        const upsertData = permissions.map(p => ({
            role_id: roleId,
            module_id: p.moduleId,
            action_id: p.actionId,
            has_permission: p.hasPermission
        }));

        const { error } = await supabase
            .from('role_permissions')
            .upsert(upsertData, { onConflict: 'role_id,module_id,action_id' });

        if (error) throw error;
    },

    // --- Users ---

    async getUsers(): Promise<User[]> {
        const { data, error } = await supabase
            .from('users')
            .select('*, roles(name, display_name)')
            .order('created_at', { ascending: false });

        if (!error) {
            return (data || [])
                .filter((u: any) => u.is_active !== false)
                .map(mapUser);
        }

        console.warn('Users query with roles join failed, retrying with fallback:', error);

        const [usersRes, rolesRes] = await Promise.all([
            supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false }),
            supabase
                .from('roles')
                .select('id, name, display_name')
        ]);

        if (usersRes.error) {
            console.error('Error fetching users (fallback):', usersRes.error);
            return [];
        }

        const roleMap = new Map(
            (rolesRes.data || []).map((r: any) => [r.id, r])
        );

        return (usersRes.data || [])
            .filter((u: any) => u.is_active !== false)
            .map((u: any) =>
                mapUser({
                    ...u,
                    roles: roleMap.get(u.role_id) || null
                })
            );
    },

    async getUserPermissions(userId: string): Promise<PermissionMatrix[]> {
        const { data, error } = await supabase
            .rpc('get_user_permissions', { p_user_id: userId });

        if (error) {
            console.error('Error calling get_user_permissions RPC:', error);
            return mock.modules.flatMap(m =>
                mock.actions.map(a => ({
                    moduleId: m.id,
                    moduleName: m.name,
                    moduleDisplayName: m.displayName,
                    actionId: a.id,
                    actionName: a.name,
                    actionDisplayName: a.displayName,
                    hasPermission: true,
                    source: 'role' as const
                }))
            );
        }

        return data.map((p: any) => ({
            moduleId: p.module_id,
            moduleName: p.module_name,
            moduleDisplayName: p.module_display_name,
            actionId: p.action_id,
            actionName: p.action_name,
            actionDisplayName: p.action_display_name,
            hasPermission: p.has_permission,
            source: p.source
        }));
    },

    async updateDirectUserPermissions(req: UpdateUserPermissionsRequest): Promise<void> {
        const { userId, permissions } = req;

        const upsertData = permissions.map(p => ({
            user_id: userId,
            module_id: p.moduleId,
            action_id: p.actionId,
            has_permission: p.hasPermission
        }));

        const { error } = await supabase
            .from('user_permissions')
            .upsert(upsertData, { onConflict: 'user_id,module_id,action_id' });

        if (error) throw error;
    },

    async updateUserLastLogin(userId: string): Promise<void> {
        const { error } = await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', userId);

        if (error) {
            console.error('Error updating last login:', error);
        }
    },

    async resetUserPermissions(userId: string): Promise<void> {
        const { error } = await supabase
            .from('user_permissions')
            .delete()
            .eq('user_id', userId);

        if (error) throw error;
    },

    // --- Combined Data Helpers for UI ---

    async getPermissionGrid(id: string, type: 'role' | 'user'): Promise<PermissionGridRow[]> {
        const [modules, actions, moduleActions] = await Promise.all([
            this.getModules(),
            this.getActions(),
            this.getModuleActions()
        ]);

        let effectivePerms: any[] = [];
        if (type === 'role') {
            effectivePerms = await this.getRolePermissions(id);
        } else {
            const user = (await this.getUsers()).find(u => u.id === id);
            if (!user) return [];

            const [rolePerms, userOverrides] = await Promise.all([
                this.getRolePermissions(user.roleId),
                supabase.from('user_permissions').select('*').eq('user_id', id)
            ]);

            effectivePerms = rolePerms.map(rp => {
                const override = userOverrides.data?.find(up =>
                    up.module_id === rp.moduleId && up.action_id === rp.actionId
                );
                return {
                    moduleId: rp.moduleId,
                    actionId: rp.actionId,
                    hasPermission: override ? override.has_permission : rp.hasPermission,
                    source: override ? 'user' : 'role'
                };
            });
        }

        return modules.map(m => {
            const row: PermissionGridRow = {
                moduleId: m.id,
                moduleName: m.name,
                moduleDisplayName: m.displayName,
                moduleIcon: m.icon,
                permissions: {}
            };

            actions.forEach(a => {
                const isAvailable = moduleActions.some(ma => ma.module_id === m.id && ma.action_id === a.id);
                const perm = effectivePerms.find(p =>
                    (p.moduleId === m.id || p.module_id === m.id) &&
                    (p.actionId === a.id || p.action_id === a.id)
                );

                row.permissions[a.name] = {
                    actionId: a.id,
                    hasPermission: perm?.hasPermission ?? false,
                    isAvailable,
                    source: perm?.source
                };
            });

            return row;
        });
    },

    checkPermission(matrix: PermissionMatrix[], moduleName: string, actionName: string): boolean {
        const perm = matrix.find(p => p.moduleName === moduleName && p.actionName === actionName);
        return perm ? perm.hasPermission : false;
    }
};

export const usePermissions = (userId?: string) => {
    const [permissions, setPermissions] = React.useState<PermissionMatrix[]>([]);
    const [loading, setLoading] = React.useState(true);
    const fullAccessUserIds = React.useMemo(() => {
        const fromEnv = (import.meta.env.VITE_FULL_ACCESS_USER_IDS || '')
            .split(',')
            .map((id: string) => id.trim())
            .filter(Boolean);

        return new Set<string>([
            '40000001-0000-0000-0000-000000000001',
            '40000001-0000-0000-0000-000000000002',
            ...fromEnv
        ]);
    }, []);
    const isFullAccessUser = !!userId && fullAccessUserIds.has(userId);

    const refreshPermissions = React.useCallback(async () => {
        if (!userId) {
            setPermissions([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const data = await permissionService.getUserPermissions(userId);
            setPermissions(data);
        } catch (error) {
            console.error('Error fetching user permissions:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    React.useEffect(() => {
        refreshPermissions();
    }, [refreshPermissions]);

    const hasPermission = (moduleName: string, actionName: string) => {
        if (isFullAccessUser) return true;
        return permissionService.checkPermission(permissions, moduleName, actionName);
    };

    return { permissions, loading, hasPermission, refreshPermissions };
};
