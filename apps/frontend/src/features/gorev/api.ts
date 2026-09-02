import { api } from '@/lib/api';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  employeeId: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedAt: string;
  dueDate?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  note?: string | null;
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

export interface TaskListParams {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  search?: string;
  from?: string;
  to?: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  employeeId: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string;
  note?: string;
}

export const taskApi = {
  list: (params?: TaskListParams) =>
    api<Paginated<Task>>('/api/tasks', params ? { query: { ...params } } : {}),
  find: (id: string) => api<Task>(`/api/tasks/${id}`),
  create: (payload: CreateTaskPayload) =>
    api<Task>('/api/tasks', { method: 'POST', body: payload }),
  update: (id: string, payload: Partial<CreateTaskPayload>) =>
    api<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: payload }),
  updateStatus: (id: string, status: TaskStatus, note?: string) =>
    api<Task>(`/api/tasks/${id}/status`, { method: 'PATCH', body: { status, note } }),
  remove: (id: string) => api<Task>(`/api/tasks/${id}`, { method: 'DELETE' }),
};

export const TASK_PRIORITY_META: Record<TaskPriority, { label: string; variant: 'secondary' | 'warning' | 'destructive' }> = {
  LOW: { label: 'Düşük', variant: 'secondary' },
  MEDIUM: { label: 'Orta', variant: 'warning' },
  HIGH: { label: 'Yüksek', variant: 'destructive' },
};

export const TASK_STATUS_META: Record<TaskStatus, { label: string; variant: 'secondary' | 'outline' | 'success' | 'destructive' }> = {
  TODO: { label: 'Tamamlanmadı', variant: 'secondary' },
  IN_PROGRESS: { label: 'Devam ediyor', variant: 'outline' },
  DONE: { label: 'Tamamlandı', variant: 'success' },
  CANCELLED: { label: 'İptal edildi', variant: 'destructive' },
};
