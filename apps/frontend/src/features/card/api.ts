import { api } from '@/lib/api';
import type { Paginated } from '@/features/personel/api';

export interface CardCredential {
  id: string;
  employeeId: string;
  cardUid: string;
  isActive: boolean;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  employee: { id: string; firstName: string; lastName: string; employeeNo?: string | null };
}

export interface CardReader {
  id: string;
  name: string;
  serialNo?: string | null;
  locationId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  location?: { id: string; name: string; address?: string | null } | null;
}

export interface CardScanResult {
  id: string;
  type: 'IN' | 'OUT';
  source: 'CARD';
  timestamp: string;
  cardUid: string;
  reader?: { id: string; name: string; serialNo?: string | null } | null;
  employee: { id: string; firstName: string; lastName: string; employeeNo?: string | null };
  location?: { id: string; name: string; address?: string | null } | null;
}

export interface ListCredentialsParams {
  page?: number;
  pageSize?: number;
  employeeId?: string;
}

interface CreateCredentialPayload {
  employeeId: string;
  cardUid: string;
  isActive?: boolean;
  note?: string;
}

interface UpdateCredentialPayload {
  cardUid?: string;
  isActive?: boolean;
  note?: string;
}

interface CreateReaderPayload {
  name: string;
  serialNo?: string;
  locationId?: string;
  isActive?: boolean;
}

interface UpdateReaderPayload {
  name?: string;
  serialNo?: string;
  locationId?: string;
  isActive?: boolean;
}

export const cardApi = {
  scan: (payload: { cardUid: string; readerId?: string; employeeId?: string }) =>
    api<CardScanResult>('/api/card/scan', { method: 'POST', body: payload }),

  credentials: (params?: ListCredentialsParams) =>
    api<Paginated<CardCredential>>('/api/card/credentials', params ? { query: { ...params } } : {}),
  createCredential: (payload: CreateCredentialPayload) =>
    api<CardCredential>('/api/card/credentials', { method: 'POST', body: payload }),
  updateCredential: (id: string, payload: UpdateCredentialPayload) =>
    api<CardCredential>(`/api/card/credentials/${id}`, { method: 'PATCH', body: payload }),

  readers: (params?: { page?: number; pageSize?: number }) =>
    api<Paginated<CardReader>>('/api/card/readers', params ? { query: { ...params } } : {}),
  createReader: (payload: CreateReaderPayload) =>
    api<CardReader>('/api/card/readers', { method: 'POST', body: payload }),
  updateReader: (id: string, payload: UpdateReaderPayload) =>
    api<CardReader>(`/api/card/readers/${id}`, { method: 'PATCH', body: payload }),
};