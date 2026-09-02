import { api } from '@/lib/api';
import type { Paginated } from '@/features/personel/api';

export interface OrgItem {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  companyId?: string;
  departmentId?: string;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
}

export type OrgGroup = 'companies' | 'departments' | 'units' | 'work-locations' | 'titles' | 'positions';

export const ORG_GROUPS: Array<{ route: OrgGroup; label: string; singular: string }> = [
  { route: 'companies', label: 'Şirket / Kurum', singular: 'Kurum' },
  { route: 'departments', label: 'Departmanlar', singular: 'Departman' },
  { route: 'units', label: 'Birimler / Bölümler', singular: 'Birim' },
  { route: 'work-locations', label: 'Görev Yerleri', singular: 'Görev yeri' },
  { route: 'titles', label: 'Unvanlar', singular: 'Unvan' },
  { route: 'positions', label: 'Görev / Pozisyon', singular: 'Pozisyon' },
];

export const orgApi = {
  list: (group: OrgGroup, params?: { page?: number; pageSize?: number; search?: string }) =>
    api<Paginated<OrgItem>>(`/api/${group}`, { query: params }),
  create: (group: OrgGroup, body: Record<string, unknown>) =>
    api<OrgItem>(`/api/${group}`, { method: 'POST', body }),
  update: (group: OrgGroup, id: string, body: Record<string, unknown>) =>
    api<OrgItem>(`/api/${group}/${id}`, { method: 'PATCH', body }),
  remove: (group: OrgGroup, id: string) =>
    api<{ id: string }>(`/api/${group}/${id}`, { method: 'DELETE' }),
};