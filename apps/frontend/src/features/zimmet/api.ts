import { api } from '@/lib/api';

export type AssetStatus = 'ASSIGNED' | 'RETURNED' | 'LOST' | 'DAMAGED' | 'SERVICING';

export interface Asset {
  id: string;
  employeeId: string;
  name: string;
  code?: string | null;
  serialNo?: string | null;
  category?: string | null;
  description?: string | null;
  condition?: string | null;
  assignedDate?: string | null;
  returnedDate?: string | null;
  status: AssetStatus;
  note?: string | null;
  issuedById?: string | null;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNo?: string | null;
    photoUrl?: string | null;
    unit?: { id: string; name: string } | null;
    department?: { id: string; name: string } | null;
  };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AssetListParams {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  status?: AssetStatus;
  category?: string;
  q?: string;
}

export interface CreateAssetPayload {
  employeeId: string;
  name: string;
  code?: string;
  serialNo?: string;
  category?: string;
  description?: string;
  condition?: string;
  assignedDate?: string;
  note?: string;
}

export const assetApi = {
  list: (params?: AssetListParams) =>
    api<Paginated<Asset>>('/api/assets', params ? { query: { ...params } } : {}),
  find: (id: string) => api<Asset>(`/api/assets/${id}`),
  create: (payload: CreateAssetPayload) =>
    api<Asset>('/api/assets', { method: 'POST', body: payload }),
  update: (id: string, payload: Partial<CreateAssetPayload>) =>
    api<Asset>(`/api/assets/${id}`, { method: 'PATCH', body: payload }),
  returnItem: (id: string) =>
    api<Asset>(`/api/assets/${id}/return`, { method: 'PATCH' }),
  updateStatus: (id: string, status: AssetStatus) =>
    api<Asset>(`/api/assets/${id}/status/${status}`, { method: 'PATCH' }),
  remove: (id: string) => api<Asset>(`/api/assets/${id}`, { method: 'DELETE' }),
  getStats: () =>
    api<{ total: number; byStatus: { status: AssetStatus; count: number }[]; byCategory: { category: string; count: number }[] }>('/api/assets/stats'),
};

export const ASSET_STATUS_META: Record<AssetStatus, { label: string; variant: 'secondary' | 'success' | 'destructive' | 'outline' | 'warning' }> = {
  ASSIGNED: { label: 'Kullanılıyor', variant: 'secondary' },
  RETURNED: { label: 'İade edildi', variant: 'success' },
  LOST: { label: 'Kayıp', variant: 'destructive' },
  DAMAGED: { label: 'Arızalı', variant: 'warning' },
  SERVICING: { label: 'Serviste', variant: 'outline' },
};
