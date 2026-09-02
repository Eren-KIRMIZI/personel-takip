import { api } from '@/lib/api';

export interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  description?: string | null;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isSystem: boolean;
  isActive: boolean;
  permissions: Permission[];
}

export interface UserRow {
  id: string;
  username: string;
  email?: string | null;
  status: 'ACTIVE' | 'DISABLED';
  lastLoginAt?: string | null;
  employee?: { id: string; firstName: string; lastName: string } | null;
  roles: Array<{ role: Role }>;
}

export const accessApi = {
  permissions: () => api<Permission[]>('/api/permissions'),
  roles: (search?: string) => api<Role[]>('/api/roles', { query: { search } }),
  createRole: (body: { name: string; code: string; description?: string; permissionIds?: string[] }) =>
    api<Role>('/api/roles', { method: 'POST', body }),
  setRolePermissions: (id: string, permissionIds: string[]) =>
    api<Role>(`/api/roles/${id}/permissions`, { method: 'PATCH', body: { permissionIds } }),
  users: (search?: string) => api<UserRow[]>('/api/users', { query: { search } }),
  setUserRoles: (id: string, roleIds: string[]) =>
    api<UserRow>(`/api/users/${id}/roles`, { method: 'PATCH', body: { roleIds } }),
  setUserStatus: (id: string, status: 'ACTIVE' | 'DISABLED') =>
    api<UserRow>(`/api/users/${id}/status`, { method: 'PATCH', body: { status } }),
};