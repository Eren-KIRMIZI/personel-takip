import { api } from '@/lib/api';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  paid: boolean;
  color?: string | null;
  defaultDays?: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: number;
  description?: string | null;
  documentUrl?: string | null;
  status: LeaveStatus;
  approvedById?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  employee: { id: string; firstName: string; lastName: string; employeeNo?: string | null };
  leaveType: { id: string; name: string; code: string; color?: string | null; paid: boolean };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LeaveListParams {
  page?: number;
  pageSize?: number;
  status?: LeaveStatus;
  employeeId?: string;
  leaveTypeId?: string;
}

export interface CreateLeaveRequestPayload {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  description?: string;
}

export const leaveApi = {
  types: () => api<LeaveType[]>('/api/leave-types'),
  createType: (payload: Partial<LeaveType>) =>
    api<LeaveType>('/api/leave-types', { method: 'POST', body: payload }),
  updateType: (id: string, payload: Partial<LeaveType>) =>
    api<LeaveType>(`/api/leave-types/${id}`, { method: 'PATCH', body: payload }),
  removeType: (id: string) => api<unknown>(`/api/leave-types/${id}`, { method: 'DELETE' }),
  list: (params?: LeaveListParams) =>
    api<Paginated<LeaveRequest>>('/api/leave-requests', params ? { query: { ...params } } : {}),
  get: (id: string) => api<LeaveRequest>(`/api/leave-requests/${id}`),
  create: (payload: CreateLeaveRequestPayload) =>
    api<LeaveRequest>('/api/leave-requests', { method: 'POST', body: payload }),
  approve: (id: string) => api<LeaveRequest>(`/api/leave-requests/${id}/approve`, { method: 'PATCH' }),
  reject: (id: string, rejectionReason: string) =>
    api<LeaveRequest>(`/api/leave-requests/${id}/reject`, { method: 'PATCH', body: { rejectionReason } }),
  cancel: (id: string) => api<LeaveRequest>(`/api/leave-requests/${id}/cancel`, { method: 'PATCH' }),
};

export const LEAVE_STATUS_META: Record<LeaveStatus, { label: string; variant: 'secondary' | 'success' | 'destructive' | 'outline' }> = {
  PENDING: { label: 'Bekliyor', variant: 'secondary' },
  APPROVED: { label: 'Onaylandı', variant: 'success' },
  REJECTED: { label: 'Reddedildi', variant: 'destructive' },
  CANCELLED: { label: 'İptal', variant: 'outline' },
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR');
}