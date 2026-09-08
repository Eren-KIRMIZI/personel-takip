import { api } from '@/lib/api';

export type OvertimeStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface OvertimeEntry {
  id: string;
  employeeId: string;
  date: string;
  hours: number;
  rate: number;
  workArea?: string | null;
  description?: string | null;
  status: OvertimeStatus;
  approvedById?: string | null;
  approvedAt?: string | null;
  approvedBy?: {
    id: string;
    username: string;
    employee?: { firstName: string; lastName: string } | null;
  } | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  employee: { id: string; firstName: string; lastName: string; employeeNo?: string | null };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OvertimeListParams {
  page?: number;
  pageSize?: number;
  status?: OvertimeStatus;
  employeeId?: string;
  from?: string;
  to?: string;
}

export interface CreateOvertimePayload {
  employeeId: string;
  date: string;
  hours: number;
  rate?: number;
  workArea?: string;
  description?: string;
}

export const overtimeApi = {
  list: (params?: OvertimeListParams) =>
    api<Paginated<OvertimeEntry>>('/api/overtimes', params ? { query: { ...params } } : {}),
  find: (id: string) => api<OvertimeEntry>(`/api/overtimes/${id}`),
  create: (payload: CreateOvertimePayload) =>
    api<OvertimeEntry>('/api/overtimes', { method: 'POST', body: payload }),
  approve: (id: string) => api<OvertimeEntry>(`/api/overtimes/${id}/approve`, { method: 'PATCH' }),
  reject: (id: string, rejectionReason: string) =>
    api<OvertimeEntry>(`/api/overtimes/${id}/reject`, { method: 'PATCH', body: { rejectionReason } }),
  cancel: (id: string) => api<OvertimeEntry>(`/api/overtimes/${id}/cancel`, { method: 'PATCH' }),
};

export const OVERTIME_STATUS_META: Record<OvertimeStatus, { label: string; variant: 'secondary' | 'success' | 'destructive' | 'outline' }> = {
  PENDING: { label: 'Bekliyor', variant: 'secondary' },
  APPROVED: { label: 'Onaylandı', variant: 'success' },
  REJECTED: { label: 'Reddedildi', variant: 'destructive' },
  CANCELLED: { label: 'İptal', variant: 'outline' },
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR');
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}