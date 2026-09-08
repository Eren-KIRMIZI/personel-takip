import { api } from '@/lib/api';
import type { Paginated } from '@/features/personel/api';

export type PunchType = 'IN' | 'OUT';
export type PunchSource = 'PDKS' | 'QR' | 'MANUAL' | 'CARD';

export interface AttendanceEntry {
  id: string;
  employeeId: string;
  type: PunchType;
  source: PunchSource;
  timestamp: string;
  locationId?: string | null;
  qrCodeId?: string | null;
  deviceInfo?: string | null;
  createdAt: string;
  employee: { id: string; firstName: string; lastName: string; employeeNo?: string | null };
  location?: { id: string; name: string; address?: string | null } | null;
}

export interface QrCodeItem {
  id: string;
  token: string;
  locationId: string;
  entryPointName?: string | null;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt: string;
  location: { id: string; name: string; address?: string | null };
}

export interface QrCodeImage {
  id: string;
  token: string;
  encoding: string;
  contentType: string;
  dataUrl: string;
}

export interface PunchResult {
  id: string;
  type: PunchType;
  source: PunchSource;
  timestamp: string;
  employee: { id: string; firstName: string; lastName: string; employeeNo?: string | null };
  location?: { id: string; name: string } | null;
}

export interface DailyPunchRef {
  id: string;
  at: string;
  source: PunchSource;
  location?: { id: string; name: string; address?: string | null } | null;
}

export interface DailyAttendanceRow {
  id: string | null;
  employee: { id: string; firstName: string; lastName: string; employeeNo?: string | null };
  day: string;
  checkIn?: DailyPunchRef | null;
  checkOut?: DailyPunchRef | null;
}

interface AttendanceListParams {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  type?: PunchType;
  source?: PunchSource;
  from?: string;
  to?: string;
}

interface ManualPunchPayload {
  employeeId: string;
  type: PunchType;
  timestamp?: string;
  locationId?: string;
  deviceInfo?: string;
}

interface CreateQrPayload {
  locationId: string;
  entryPointName?: string;
  expiresAt?: string;
}

export const attendanceApi = {
  list: (params?: AttendanceListParams) =>
    api<Paginated<AttendanceEntry>>('/api/attendance', params ? { query: { ...params } } : {}),
  daily: (day: string, params?: { page?: number; pageSize?: number; employeeId?: string }) =>
    api<Paginated<DailyAttendanceRow>>('/api/attendance/daily', { query: { day, ...params } }),
  punch: (payload: ManualPunchPayload) =>
    api<AttendanceEntry>('/api/attendance', { method: 'POST', body: payload }),
  update: (id: string, payload: { type?: PunchType; timestamp?: string; locationId?: string }) =>
    api<AttendanceEntry>(`/api/attendance/${id}`, { method: 'PATCH', body: payload }),
  qrCodes: () => api<Paginated<QrCodeItem>>('/api/attendance/qr-codes', { query: { pageSize: 100 } }),
  createQr: (payload: CreateQrPayload) =>
    api<QrCodeItem>('/api/attendance/qr-codes', { method: 'POST', body: payload }),
  qrImage: (id: string) => api<QrCodeImage>(`/api/attendance/qr-codes/${id}/qr`),
  rotateQr: (id: string) => api<QrCodeItem>(`/api/attendance/qr-codes/${id}/rotate`, { method: 'PATCH' }),
  scan: (content: string, employeeId: string) =>
    api<PunchResult>('/api/attendance/scan', { method: 'POST', body: { content, employeeId } }),
  scanSelf: (content: string) =>
    api<PunchResult>('/api/attendance/scan/self', { method: 'POST', body: { content } }),
};

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR');
}

export const PUNCH_TYPE_LABEL: Record<PunchType, string> = {
  IN: 'Giriş',
  OUT: 'Çıkış',
};

export const PUNCH_SOURCE_LABEL: Record<PunchSource, string> = {
  PDKS: 'PDKS',
  QR: 'QR',
  MANUAL: 'Manuel',
  CARD: 'Kart',
};