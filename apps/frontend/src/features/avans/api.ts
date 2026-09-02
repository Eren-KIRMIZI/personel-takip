import { api } from '@/lib/api';
import type { Paginated } from '@/features/personel/api';

export type AdvanceStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED';

export interface AdvanceItem {
  id: string;
  employeeId: string;
  amount: number;
  installmentCount: number;
  periodYear: number;
  periodMonth: number;
  description?: string | null;
  status: AdvanceStatus;
  approvedById?: string | null;
  approvedAt?: string | null;
  paymentDate?: string | null;
  rejectionReason?: string | null;
  note?: string | null;
  createdAt: string;
  employee: { id: string; firstName: string; lastName: string; employeeNo?: string | null };
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  status?: AdvanceStatus;
  periodYear?: number;
  periodMonth?: number;
}

export const advanceApi = {
  list: (params?: ListParams) =>
    api<Paginated<AdvanceItem>>('/api/advances', params ? { query: { ...params } } : {}),
  create: (payload: { employeeId: string; amount: string; installmentCount?: number; periodYear?: number; periodMonth?: number; description?: string }) =>
    api<AdvanceItem>('/api/advances', { method: 'POST', body: payload }),
  approve: (id: string) =>
    api<AdvanceItem>(`/api/advances/${id}/approve`, { method: 'PATCH' }),
  reject: (id: string, rejectionReason: string) =>
    api<AdvanceItem>(`/api/advances/${id}/reject`, { method: 'PATCH', body: { rejectionReason } }),
  markPaid: (id: string) =>
    api<AdvanceItem>(`/api/advances/${id}/paid`, { method: 'PATCH' }),
  cancel: (id: string) =>
    api<AdvanceItem>(`/api/advances/${id}/cancel`, { method: 'PATCH' }),
};

export const ADVANCE_STATUS_META: Record<AdvanceStatus, { label: string; variant: 'secondary' | 'warning' | 'success' | 'destructive' | 'outline' }> = {
  PENDING: { label: 'Bekliyor', variant: 'secondary' },
  APPROVED: { label: 'Onaylandı', variant: 'warning' },
  PAID: { label: 'Ödendi', variant: 'success' },
  REJECTED: { label: 'Reddedildi', variant: 'destructive' },
  CANCELLED: { label: 'İptal', variant: 'outline' },
};

export function formatMoney(n: number): string {
  return n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });
}

export function monthLabel(month: number): string {
  return [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ][month - 1];
}
