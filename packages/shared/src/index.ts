export const EMPLOYMENT_STATUSES = ['ACTIVE', 'PASSIVE', 'SUSPENDED'] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const USER_STATUSES = ['ACTIVE', 'DISABLED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export const PUNCH_TYPES = ['IN', 'OUT'] as const;
export type PunchType = (typeof PUNCH_TYPES)[number];

export const PUNCH_SOURCES = ['PDKS', 'QR', 'MANUAL'] as const;
export type PunchSource = (typeof PUNCH_SOURCES)[number];

export interface OrgNode {
  id: string;
  name: string;
  code?: string | null;
  isActive: boolean;
}

export interface EmployeeSummary {
  id: string;
  employeeNo?: string | null;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  internalPhone?: string | null;
  externalLine?: string | null;
  status: EmploymentStatus;
  department?: { id: string; name: string } | null;
  unit?: { id: string; name: string } | null;
  workLocation?: { id: string; name: string } | null;
  title?: { id: string; name: string } | null;
  position?: { id: string; name: string } | null;
}

export interface PermissionInfo {
  code: string;
  name: string;
  module: string;
}

export interface RoleInfo {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  permissions: string[];
}

export interface UserInfo {
  id: string;
  username: string;
  email?: string | null;
  status: UserStatus;
  employee?: { id: string; firstName: string; lastName: string } | null;
  roles: string[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}