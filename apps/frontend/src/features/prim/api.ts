import { api } from '@/lib/api';
import type { Employee } from '@/features/personel/api';

export type BonusStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED';

export interface Bonus {
  id: string;
  employeeId: string;
  amount: number;
  date: string;
  description?: string;
  status: BonusStatus;
  approvedById?: string;
  approvedAt?: string;
  paymentDate?: string;
  rejectionReason?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  employee: Employee;
  approvedBy?: {
    id: string;
    employee?: {
      firstName: string;
      lastName: string;
    };
  };
}

export interface BonusListResponse {
  items: Bonus[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateBonusPayload {
  employeeId: string;
  amount: number;
  date: string;
  description?: string;
  note?: string;
}

export const bonusApi = {
  list: async (query?: { employeeId?: string; status?: BonusStatus; page?: number; pageSize?: number }) => {
    const params = new URLSearchParams();
    if (query?.employeeId) params.append('employeeId', query.employeeId);
    if (query?.status) params.append('status', query.status);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.pageSize) params.append('pageSize', query.pageSize.toString());

    const qs = params.toString();
    return api<BonusListResponse>(`/api/bonuses${qs ? `?${qs}` : ''}`);
  },

  getStats: () => api<{ total: number; byStatus: { status: BonusStatus; count: number }[] }>('/api/bonuses/stats'),
  
  find: (id: string) => api<Bonus>(`/api/bonuses/${id}`),

  create: (payload: CreateBonusPayload) => api<Bonus>('/api/bonuses', { method: 'POST', body: payload }),

  update: (id: string, payload: Partial<CreateBonusPayload>) => api<Bonus>(`/api/bonuses/${id}`, { method: 'PATCH', body: payload }),

  updateStatus: (id: string, payload: { status: BonusStatus; rejectionReason?: string; note?: string }) => 
    api<Bonus>(`/api/bonuses/${id}/status`, { method: 'PATCH', body: payload }),

  remove: (id: string) => api<{ id: string; deleted: boolean }>(`/api/bonuses/${id}`, { method: 'DELETE' }),
};

export const BONUS_STATUS_META: Record<BonusStatus, { label: string; variant: 'secondary' | 'success' | 'destructive' | 'outline' | 'warning' }> = {
  PENDING: { label: 'Bekliyor', variant: 'warning' },
  APPROVED: { label: 'Onaylandı', variant: 'secondary' },
  PAID: { label: 'Ödendi', variant: 'success' },
  REJECTED: { label: 'Reddedildi', variant: 'destructive' },
  CANCELLED: { label: 'İptal Edildi', variant: 'outline' },
};
