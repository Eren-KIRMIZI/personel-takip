import { api } from '@/lib/api';
import type { Paginated } from '@/features/personel/api';

export type PayrollStatus = 'DRAFT' | 'APPROVED' | 'PAID' | 'CANCELLED';

export interface PayrollItem {
  id: string;
  employeeId: string;
  periodYear: number;
  periodMonth: number;
  baseSalary: number;
  overtimeAmount: number;
  leaveDeduction: number;
  bonus: number | null;
  deduction: number | null;
  grossAmount: number;
  netAmount: number;
  status: PayrollStatus;
  note?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  employee: { id: string; firstName: string; lastName: string; employeeNo?: string | null };
}

interface ListParams {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  periodYear?: number;
  periodMonth?: number;
  status?: PayrollStatus;
}

export const payrollApi = {
  list: (params?: ListParams) => api<Paginated<PayrollItem>>('/api/payroll', params ? { query: { ...params } } : {}),
  generate: (periodYear: number, periodMonth: number) =>
    api<{ periodYear: number; periodMonth: number; items: PayrollItem[]; generated: number }>(
      '/api/payroll/generate',
      { method: 'POST', body: { periodYear, periodMonth } },
    ),
  getEmployeeSalary: (employeeId: string) =>
    api<{ baseSalary: number | null; lastPeriod?: { year: number; month: number } | null }>(
      `/api/payroll/employees/${employeeId}/salary`,
    ),
  setSalary: (employeeId: string, baseSalary: string, note?: string) =>
    api<PayrollItem>(`/api/payroll/employees/${employeeId}/salary`, { method: 'POST', body: { baseSalary, note } }),
  update: (id: string, payload: { bonus?: string; deduction?: string; note?: string }) =>
    api<PayrollItem>(`/api/payroll/${id}`, { method: 'PATCH', body: payload }),
  approve: (id: string) => api<PayrollItem>(`/api/payroll/${id}/approve`, { method: 'PATCH' }),
  markPaid: (id: string) => api<PayrollItem>(`/api/payroll/${id}/paid`, { method: 'PATCH' }),
};

export const PAYROLL_STATUS_META: Record<PayrollStatus, { label: string; variant: 'secondary' | 'warning' | 'success' | 'outline' }> = {
  DRAFT: { label: 'Taslak', variant: 'secondary' },
  APPROVED: { label: 'Onaylandı', variant: 'warning' },
  PAID: { label: 'Ödendi', variant: 'success' },
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