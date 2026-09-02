import { api } from '@/lib/api';

export type ShiftDay = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export interface ShiftItem {
  id: string;
  name: string;
  code?: string | null;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  description?: string | null;
  workLocationId?: string | null;
  isActive: boolean;
  createdAt: string;
  workLocation?: { id: string; name: string } | null;
  _count?: { assignments: number };
}

export interface ShiftAssignment {
  id: string;
  employeeId: string;
  shiftId: string;
  day: ShiftDay;
  createdAt: string;
  employee: { id: string; firstName: string; lastName: string; employeeNo?: string | null };
  shift: { id: string; name: string; startTime: string; endTime: string };
}

export const SHIFT_DAY_LABEL: Record<ShiftDay, string> = {
  MON: 'Pazartesi',
  TUE: 'Salı',
  WED: 'Çarşamba',
  THU: 'Perşembe',
  FRI: 'Cuma',
  SAT: 'Cumartesi',
  SUN: 'Pazar',
};

export const SHIFT_DAY_ORDER: ShiftDay[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export const shiftApi = {
  list: (params?: { workLocationId?: string; includeInactive?: boolean }) =>
    api<ShiftItem[]>('/api/shifts', params ? { query: { ...params } } : {}),
  create: (payload: {
    name: string;
    code?: string;
    startTime: string;
    endTime: string;
    breakMinutes?: number;
    description?: string;
    workLocationId?: string;
  }) => api<ShiftItem>('/api/shifts', { method: 'POST', body: payload }),
  assignments: (params?: { employeeId?: string; shiftId?: string; day?: ShiftDay }) =>
    api<ShiftAssignment[]>('/api/shifts/assignments', params ? { query: { ...params } } : {}),
  assign: (payload: { shiftId: string; day: ShiftDay; employeeIds: string[] }) =>
    api<{ assigned: number; skipped: number }>('/api/shifts/assignments', { method: 'POST', body: payload }),
  bulkAssign: (payload: { shiftId: string; day: ShiftDay; employeeIds: string[] }) =>
    api<{ assigned: number; skipped: number }>('/api/shifts/assignments/bulk', { method: 'POST', body: payload }),
  removeAssignment: (id: string) => api<{ deleted: boolean }>(`/api/shifts/assignments/${id}`, { method: 'DELETE' }),
};

export function durationLabel(startTime: string, endTime: string, breakMinutes: number): string {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  let diff = toMin(endTime) - toMin(startTime);
  if (diff < 0) diff += 24 * 60;
  diff -= breakMinutes;
  if (diff < 0) diff = 0;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}s ${m}dk`;
}