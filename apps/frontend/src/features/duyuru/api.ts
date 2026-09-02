import { api } from '@/lib/api';

export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'EXPIRED';
export type AnnouncementTargetType = 'ALL' | 'DEPARTMENT' | 'UNIT' | 'SPECIFIC';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  status: AnnouncementStatus;
  targetType: AnnouncementTargetType;
  targetId?: string | null;
  publishAt?: string | null;
  expireAt?: string | null;
  createdAt: string;
  updatedAt: string;
  isRead?: boolean; // Yalnızca 'my' listesinde gelir
  readAt?: string | null; // Yalnızca 'my' listesinde gelir
  _count?: {
    reads: number;
    targetEmployees: number;
  };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AnnouncementListParams {
  page?: number;
  pageSize?: number;
  status?: AnnouncementStatus;
  search?: string;
}

export interface CreateAnnouncementPayload {
  title: string;
  content: string;
  status?: AnnouncementStatus;
  targetType?: AnnouncementTargetType;
  targetId?: string;
  targetEmployeeIds?: string[];
  publishAt?: string;
  expireAt?: string;
}

export const announcementApi = {
  // Admin listesi (Tüm duyurular)
  list: (params?: AnnouncementListParams) =>
    api<Paginated<Announcement>>('/api/announcements', params ? { query: { ...params } } : {}),
  
  // Personel listesi (Kişiye özel yayınlananlar)
  listMy: (page = 1, pageSize = 20) =>
    api<Paginated<Announcement>>('/api/announcements/my', { query: { page, pageSize } }),

  find: (id: string) => api<Announcement>(`/api/announcements/${id}`),
  
  create: (payload: CreateAnnouncementPayload) =>
    api<Announcement>('/api/announcements', { method: 'POST', body: payload }),
  
  update: (id: string, payload: Partial<CreateAnnouncementPayload>) =>
    api<Announcement>(`/api/announcements/${id}`, { method: 'PATCH', body: payload }),
  
  markRead: (id: string) => 
    api<{ ok: boolean }>(`/api/announcements/${id}/read`, { method: 'POST' }),

  remove: (id: string) => api<Announcement>(`/api/announcements/${id}`, { method: 'DELETE' }),
};

export const ANNOUNCEMENT_STATUS_META: Record<AnnouncementStatus, { label: string; variant: 'secondary' | 'success' | 'outline' }> = {
  DRAFT: { label: 'Taslak', variant: 'secondary' },
  PUBLISHED: { label: 'Yayında', variant: 'success' },
  EXPIRED: { label: 'Süresi Doldu', variant: 'outline' },
};

export const ANNOUNCEMENT_TARGET_META: Record<AnnouncementTargetType, string> = {
  ALL: 'Tüm Personel',
  DEPARTMENT: 'Departman',
  UNIT: 'Birim',
  SPECIFIC: 'Belirli Personeller',
};
