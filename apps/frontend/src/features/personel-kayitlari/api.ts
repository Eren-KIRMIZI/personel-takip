import { api } from '@/lib/api';
import type { Paginated } from '@/features/personel/api';

export type EmployeeRecordCategory = 'DISCIPLINARY' | 'REWARD';

export type EmployeeRecordType =
  | 'WARNING' | 'REPRIMAND' | 'SUSPENSION' | 'DEDUCTION' | 'TERMINATION'
  | 'PRAISE' | 'AWARD' | 'CERTIFICATE';

export interface EmployeeRecord {
  id: string;
  employeeId: string;
  category: EmployeeRecordCategory;
  type: EmployeeRecordType;
  title: string;
  description?: string | null;
  date: string;
  issuedById?: string | null;
  createdById?: string | null;
  note?: string | null;
  createdAt: string;
  employee: { id: string; firstName: string; lastName: string; employeeNo?: string | null };
  issuedBy?: { id: string; username: string; employee?: { firstName: string; lastName: string } | null } | null;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  category?: EmployeeRecordCategory;
  type?: EmployeeRecordType;
  from?: string;
  to?: string;
}

export interface CreatePayload {
  employeeId: string;
  category: EmployeeRecordCategory;
  type: EmployeeRecordType;
  title: string;
  description?: string;
  date: string;
  issuedById?: string;
  note?: string;
}

export interface UpdatePayload {
  type?: EmployeeRecordType;
  title?: string;
  description?: string;
  date?: string;
  issuedById?: string;
  note?: string;
}

export const employeeRecordApi = {
  list: (params?: ListParams) =>
    api<Paginated<EmployeeRecord>>('/api/employee-records', params ? { query: { ...params } } : {}),
  create: (payload: CreatePayload) =>
    api<EmployeeRecord>('/api/employee-records', { method: 'POST', body: payload }),
  update: (id: string, payload: UpdatePayload) =>
    api<EmployeeRecord>(`/api/employee-records/${id}`, { method: 'PATCH', body: payload }),
  remove: (id: string) =>
    api<{ deleted: boolean; id: string }>(`/api/employee-records/${id}`, { method: 'DELETE' }),
};

export const RECORD_CATEGORY_LABELS: Record<EmployeeRecordCategory, { label: string; color: string }> = {
  DISCIPLINARY: { label: 'Ceza', color: 'destructive' },
  REWARD: { label: 'Ödül', color: 'success' },
};

export const RECORD_TYPE_LABELS: Record<EmployeeRecordType, string> = {
  WARNING: 'Uyarı',
  REPRIMAND: 'Kınama',
  SUSPENSION: 'Görevden Uzaklaştırma',
  DEDUCTION: 'Ücret Kesintisi',
  TERMINATION: 'İşten Çıkarma',
  PRAISE: 'Takdir',
  AWARD: 'Ödül',
  CERTIFICATE: 'Sertifika/Belge',
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}