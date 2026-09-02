import { api } from '@/lib/api';

export interface OrgRef {
  id: string;
  name: string;
}

export type EmploymentStatus = 'ACTIVE' | 'PASSIVE' | 'SUSPENDED';

export interface EmployeeUserRef {
  id: string;
  username: string;
  email?: string | null;
  status: string;
  roles: Array<{ role: { id: string; name: string; code: string } }>;
}

export interface EmployeeHistoryItem {
  id: string;
  employeeId: string;
  department?: OrgRef | null;
  unit?: OrgRef | null;
  workLocation?: OrgRef | null;
  title?: OrgRef | null;
  position?: OrgRef | null;
  effectiveDate: string;
  endDate?: string | null;
  changeType: string;
  note?: string | null;
  createdAt: string;
}

export interface Employee {
  id: string;
  employeeNo?: string | null;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  internalPhone?: string | null;
  externalLine?: string | null;
  identityNo?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  bloodType?: string | null;
  educationLevel?: string | null;
  note?: string | null;
  status: EmploymentStatus;
  workStartDate?: string | null;
  workEndDate?: string | null;
  department?: OrgRef | null;
  unit?: OrgRef | null;
  workLocation?: OrgRef | null;
  title?: OrgRef | null;
  position?: OrgRef | null;
  manager?: { id: string; firstName: string; lastName: string } | null;
  user?: EmployeeUserRef | null;
  history?: EmployeeHistoryItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type EmployeeListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  departmentId?: string;
  unitId?: string;
  workLocationId?: string;
  titleId?: string;
  status?: string;
};

export interface CreateEmployeePayload {
  account?: { username: string; email?: string; password: string; roleIds?: string[] };
  firstName: string;
  lastName: string;
  employeeNo?: string;
  email?: string;
  phone?: string;
  internalPhone?: string;
  externalLine?: string;
  status?: EmploymentStatus;
  departmentId?: string;
  unitId?: string;
  workLocationId?: string;
  titleId?: string;
  positionId?: string;
  identityNo?: string;
  birthDate?: string;
  workStartDate?: string;
  note?: string;
}

export const employeesApi = {
  list: (params?: EmployeeListParams) =>
    api<Paginated<Employee>>('/api/employees', { query: params }),
  get: (id: string) => api<Employee>(`/api/employees/${id}`),
  history: (id: string) => api<EmployeeHistoryItem[]>(`/api/employees/${id}/history`),
  create: (payload: CreateEmployeePayload) =>
    api<Employee>('/api/employees', { method: 'POST', body: payload }),
  update: (id: string, payload: Record<string, unknown>) =>
    api<Employee>(`/api/employees/${id}`, { method: 'PATCH', body: payload }),
  setStatus: (id: string, status: EmploymentStatus) =>
    api<Employee>(`/api/employees/${id}/status`, { method: 'PATCH', body: { status } }),
};

export const FULL_NAME = (e: { firstName: string; lastName: string; employeeNo?: string | null }) =>
  `${e.firstName} ${e.lastName}`;