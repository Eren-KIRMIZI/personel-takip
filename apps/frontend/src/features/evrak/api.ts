import { api } from '@/lib/api';

export type DocumentPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type DocumentStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export interface Document {
  id: string;
  documentNo?: string | null;
  subject: string;
  content?: string | null;
  employeeId?: string | null;
  unitId?: string | null;
  priority: DocumentPriority;
  status: DocumentStatus;
  processType?: string | null;
  receivedAt?: string | null;
  lastActionAt?: string | null;
  attachmentUrl?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNo?: string | null;
    photoUrl?: string | null;
  } | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DocumentListParams {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  priority?: DocumentPriority;
  status?: DocumentStatus;
  search?: string;
  from?: string;
  to?: string;
}

export interface CreateDocumentPayload {
  documentNo?: string;
  subject: string;
  content?: string;
  employeeId?: string;
  unitId?: string;
  priority?: DocumentPriority;
  status?: DocumentStatus;
  processType?: string;
  receivedAt?: string;
  attachmentUrl?: string;
  note?: string;
}

export const documentApi = {
  list: (params?: DocumentListParams) =>
    api<Paginated<Document>>('/api/documents', params ? { query: { ...params } } : {}),
  find: (id: string) => api<Document>(`/api/documents/${id}`),
  create: (payload: CreateDocumentPayload) =>
    api<Document>('/api/documents', { method: 'POST', body: payload }),
  update: (id: string, payload: Partial<CreateDocumentPayload>) =>
    api<Document>(`/api/documents/${id}`, { method: 'PATCH', body: payload }),
  remove: (id: string) => api<Document>(`/api/documents/${id}`, { method: 'DELETE' }),
  getStats: () =>
    api<{ total: number; byStatus: { status: DocumentStatus; count: number }[]; byPriority: { priority: DocumentPriority; count: number }[] }>('/api/documents/stats'),
};

export const DOCUMENT_PRIORITY_META: Record<DocumentPriority, { label: string; variant: 'secondary' | 'outline' | 'warning' | 'destructive' }> = {
  LOW: { label: 'Düşük', variant: 'secondary' },
  NORMAL: { label: 'Normal', variant: 'outline' },
  HIGH: { label: 'Yüksek', variant: 'warning' },
  URGENT: { label: 'Acil', variant: 'destructive' },
};

export const DOCUMENT_STATUS_META: Record<DocumentStatus, { label: string; variant: 'secondary' | 'outline' | 'success' | 'destructive' }> = {
  PENDING: { label: 'Beklemede', variant: 'secondary' },
  IN_PROGRESS: { label: 'İşlemde', variant: 'outline' },
  DONE: { label: 'Tamamlandı', variant: 'success' },
  CANCELLED: { label: 'İptal edildi', variant: 'destructive' },
};
