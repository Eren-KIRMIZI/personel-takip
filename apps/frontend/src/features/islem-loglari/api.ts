import { api } from '@/lib/api';

export interface AuditLog {
  id: string;
  actorUserId?: string;
  employeeId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: any;
  after?: any;
  result: 'SUCCESS' | 'FAILURE';
  ip?: string;
  userAgent?: string;
  createdAt: string;
  actor?: {
    id: string;
    username: string;
    employee?: {
      firstName: string;
      lastName: string;
    };
  };
}

interface AuditListResponse {
  items: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

export const auditApi = {
  list: async (query?: { page?: number; pageSize?: number; action?: string; entityType?: string }) => {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.pageSize) params.append('pageSize', query.pageSize.toString());
    if (query?.action) params.append('action', query.action);
    if (query?.entityType) params.append('entityType', query.entityType);

    const qs = params.toString();
    return api<AuditListResponse>(`/api/audit-logs${qs ? `?${qs}` : ''}`);
  },
};
