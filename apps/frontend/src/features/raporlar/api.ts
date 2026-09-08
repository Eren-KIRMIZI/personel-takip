import { api } from '@/lib/api';

export interface EmployeeRef {
  id: string;
  firstName: string;
  lastName: string;
  employeeNo?: string | null;
}

export interface AttendanceSummaryRow {
  employee: EmployeeRef;
  totalRecords: number;
  totalIn: number;
  totalOut: number;
  workedMinutes: number;
  worked: string;
  days: number;
}

export interface OvertimeSummaryRow {
  employee: EmployeeRef;
  totalHours: number;
  approvedHours: number;
  records: number;
}

export interface LeaveSummaryRow {
  employee: EmployeeRef;
  totalDays: number;
  approvedDays: number;
  pendingDays: number;
  rejectedDays: number;
  byType: Record<string, number>;
}

export interface AttendanceLogRow {
  employee: EmployeeRef;
  date: string;
  checkIn?: { at: string; source: 'QR' | 'MANUAL' | 'PDKS' | 'CARD' } | null;
  checkOut?: { at: string; source: 'QR' | 'MANUAL' | 'PDKS' | 'CARD' } | null;
  workedMinutes: number;
  worked?: string | null;
}

export interface DashboardSummary {
  today: string;
  employeesActive: number;
  employeesTotal: number;
  departmentsTotal: number;
  unitsTotal: number;
  rolesTotal: number;
  presentToday: number;
  pendingLeaves: number;
  pendingOvertimes: number;
  approvedOvertimeHoursMonth: number;
}

export interface ExcelFile {
  filename: string;
  contentType: string;
  base64: string;
}

interface ReportParams {
  from?: string;
  to?: string;
  employeeId?: string;
}

export type PunchSourceKind = 'PDKS' | 'QR' | 'MANUAL' | 'CARD';

export interface PunchRow {
  date: string;
  time: string;
  employee: EmployeeRef;
  type: 'IN' | 'OUT';
  source: PunchSourceKind;
  location?: string | null;
}

export interface LateRow {
  employee: EmployeeRef;
  date: string;
  time: string;
  expected: string;
  lateMinutes: number;
  shiftUsed: boolean;
  source: PunchSourceKind;
}

export interface EarlyRow {
  employee: EmployeeRef;
  date: string;
  time: string;
  expected: string;
  earlyMinutes: number;
  shiftUsed: boolean;
  source: PunchSourceKind;
}

export interface AbsenceRow {
  employee: EmployeeRef;
  date: string;
  dayName: string;
}

export interface PresentNowRow {
  employee: EmployeeRef;
  firstIn: string;
  lastIn: string;
  sinceMinutes: number;
  source: PunchSourceKind | null;
}

export interface NewHireRow {
  employeeNo?: string | null;
  firstName: string;
  lastName: string;
  startDate: string;
  status: string;
  department?: string | null;
  unit?: string | null;
  location?: string | null;
  title?: string | null;
}

export interface TerminationRow {
  employeeNo?: string | null;
  firstName: string;
  lastName: string;
  endDate: string;
  status: string;
  department?: string | null;
  title?: string | null;
}

export interface WeekendRow {
  date: string;
  dayName: string;
  employee: EmployeeRef;
  in: string;
  out: string;
  worked: string;
}

export interface MonthlyAttendanceRow {
  employee: EmployeeRef;
  seq: string;
  presentCount: number;
  workedMinutes: number;
  worked: string;
}

export interface PayrunRow {
  employee: EmployeeRef;
  department?: string | null;
  baseSalary: number;
  overtimeHours: number;
  overtimeAmount: number;
  unpaidLeaveDays: number;
  leaveDeduction: number;
  grossAmount: number;
  netAmount: number;
  workedDays: number;
  workedMinutes: number;
  worked: string;
}

export const reportsApi = {
  summary: () => api<DashboardSummary>('/api/reports/summary'),
  attendance: (params?: ReportParams) => api<{ from: string; to: string; summary: AttendanceSummaryRow[]; meta: { totalRecords: number; totalWorkedMinutes: number } }>('/api/reports/attendance', params ? { query: { ...params } } : {}),
  attendanceExcel: (params?: ReportParams) => api<ExcelFile>('/api/reports/attendance/excel', params ? { query: { ...params } } : {}),
  overtimes: (params?: ReportParams) => api<{ from: string; to: string; summary: OvertimeSummaryRow[]; meta: { totalHours: number; records: number } }>('/api/reports/overtimes', params ? { query: { ...params } } : {}),
  overtimesExcel: (params?: ReportParams) => api<ExcelFile>('/api/reports/overtimes/excel', params ? { query: { ...params } } : {}),
  leaves: (params?: ReportParams) => api<{ from: string; to: string; summary: LeaveSummaryRow[]; meta: { totalDays: number; records: number } }>('/api/reports/leaves', params ? { query: { ...params } } : {}),
  leavesExcel: (params?: ReportParams) => api<ExcelFile>('/api/reports/leaves/excel', params ? { query: { ...params } } : {}),
  attendanceLog: (params?: ReportParams) => api<{ from: string; to: string; rows: AttendanceLogRow[]; meta: { totalRows: number } }>('/api/reports/attendance-log', params ? { query: { ...params } } : {}),
  attendanceLogExcel: (params?: ReportParams) => api<ExcelFile>('/api/reports/attendance-log/excel', params ? { query: { ...params } } : {}),
  entries: (params?: ReportParams) => api<{ from: string; to: string; rows: PunchRow[]; meta: { total: number } }>('/api/reports/entries', params ? { query: { ...params } } : {}),
  late: (params?: ReportParams) => api<{ from: string; to: string; rows: LateRow[]; meta: { total: number; totalLateMinutes: number } }>('/api/reports/late', params ? { query: { ...params } } : {}),
  early: (params?: ReportParams) => api<{ from: string; to: string; rows: EarlyRow[]; meta: { total: number; totalEarlyMinutes: number } }>('/api/reports/early', params ? { query: { ...params } } : {}),
  absences: (params?: ReportParams) => api<{ from: string; to: string; rows: AbsenceRow[]; meta: { total: number; days: number } }>('/api/reports/absences', params ? { query: { ...params } } : {}),
  nonCard: (side: 'IN' | 'OUT' | 'BOTH', params?: ReportParams) =>
    api<{ from: string; to: string; side: string; rows: PunchRow[]; meta: { total: number } }>(
      '/api/reports/non-card',
      { query: { side, ...(params ?? {}) } },
    ),
  presentNow: () => api<{ date: string; rows: PresentNowRow[]; meta: { total: number } }>('/api/reports/present-now'),
  manual: (params?: ReportParams) => api<{ from: string; to: string; rows: PunchRow[]; meta: { total: number } }>('/api/reports/manual', params ? { query: { ...params } } : {}),
  newHires: (params?: ReportParams) => api<{ from: string; to: string; rows: NewHireRow[]; meta: { total: number } }>('/api/reports/new-hires', params ? { query: { ...params } } : {}),
  terminations: (params?: ReportParams) => api<{ from: string; to: string; rows: TerminationRow[]; meta: { total: number } }>('/api/reports/terminations', params ? { query: { ...params } } : {}),
  weekendWork: (params?: ReportParams) => api<{ from: string; to: string; rows: WeekendRow[]; meta: { total: number } }>('/api/reports/weekend-work', params ? { query: { ...params } } : {}),
  monthlyAttendance: (month: string) => api<{ year: number; month: number; label: string; weekdays: { date: string; dayName: string }[]; rows: MonthlyAttendanceRow[]; meta: { employees: number; days: number; workedDays: number } }>('/api/reports/monthly-attendance', { query: { month } }),
  payrun: (month: string) => api<{ year: number; month: number; label: string; rows: PayrunRow[]; meta: { employees: number; totalGross: number; totalNet: number; totalOvertime: number; totalLeaveDeduction: number } }>('/api/reports/payrun', { query: { month } }),
};

export function downloadExcel(file: ExcelFile) {
  const bin = atob(file.base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: file.contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const esc = (v: string | number | null | undefined) => {
    if (v == null) return '';
    const s = String(v);
    return /[;",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((line) => line.map(esc).join(';')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const FULL_NAME = (e: { firstName: string; lastName: string; employeeNo?: string | null }) =>
  `${e.firstName} ${e.lastName}${e.employeeNo ? ` (${e.employeeNo})` : ''}`;

export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}s ${m}dk`;
}