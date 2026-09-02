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

export interface DashboardSummary {
  today: string;
  employeesActive: number;
  employeesTotal: number;
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

export const reportsApi = {
  summary: () => api<DashboardSummary>('/api/reports/summary'),
  attendance: (params?: ReportParams) => api<{ from: string; to: string; summary: AttendanceSummaryRow[]; meta: { totalRecords: number; totalWorkedMinutes: number } }>('/api/reports/attendance', params ? { query: { ...params } } : {}),
  attendanceExcel: (params?: ReportParams) => api<ExcelFile>('/api/reports/attendance/excel', params ? { query: { ...params } } : {}),
  overtimes: (params?: ReportParams) => api<{ from: string; to: string; summary: OvertimeSummaryRow[]; meta: { totalHours: number; records: number } }>('/api/reports/overtimes', params ? { query: { ...params } } : {}),
  overtimesExcel: (params?: ReportParams) => api<ExcelFile>('/api/reports/overtimes/excel', params ? { query: { ...params } } : {}),
  leaves: (params?: ReportParams) => api<{ from: string; to: string; summary: LeaveSummaryRow[]; meta: { totalDays: number; records: number } }>('/api/reports/leaves', params ? { query: { ...params } } : {}),
  leavesExcel: (params?: ReportParams) => api<ExcelFile>('/api/reports/leaves/excel', params ? { query: { ...params } } : {}),
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

export const FULL_NAME = (e: { firstName: string; lastName: string; employeeNo?: string | null }) =>
  `${e.firstName} ${e.lastName}${e.employeeNo ? ` (${e.employeeNo})` : ''}`;

export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}s ${m}dk`;
}