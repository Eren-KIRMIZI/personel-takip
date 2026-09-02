import { api } from '@/lib/api';

export type NotificationType = 
  | 'LEAVE_REQUEST' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED'
  | 'OVERTIME_REQUEST' | 'OVERTIME_APPROVED' | 'OVERTIME_REJECTED'
  | 'TASK_ASSIGNED' | 'TASK_DUE_SOON'
  | 'DOCUMENT_CREATED' | 'DOCUMENT_UPDATED'
  | 'ANNOUNCEMENT'
  | 'ASSET_ASSIGNED' | 'ASSET_RETURNED'
  | 'GENERAL';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  announcementId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface PaginatedNotifications {
  items: Notification[];
  total: number;
  page: number;
  pageSize: number;
  unreadCount: number;
}

export const notificationApi = {
  list: (page = 1, pageSize = 30) =>
    api<PaginatedNotifications>('/api/notifications', { query: { page, pageSize } }),
  
  unreadCount: () => 
    api<{ count: number }>('/api/notifications/unread-count'),

  markRead: (id: string) => 
    api<{ count: number }>(`/api/notifications/${id}/read`, { method: 'PATCH' }),

  markAllRead: () => 
    api<{ count: number }>('/api/notifications/read-all', { method: 'PATCH' }),
};
