import type { UserRoleType } from './auth';

export type UserStatusType = 'ACTIVE' | 'LOCKED' | 'INACTIVE';

export interface UserManagementItem {
  id: string;
  email: string;
  username: string;
  fullName: string;
  phone: string;
  role: UserRoleType | string;
  roles?: (UserRoleType | string)[];
  status: UserStatusType;
  assignedWarehouse?: string;
  lockReason?: string | null;
  resetCode?: string | null;
  resetCodeCreatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResetPasswordWithCodePayload {
  identifier: string;
  resetCode: string;
  newPassword: string;
}

export interface PaginatedUsersResponse {
  data: UserManagementItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateUserPayload {
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  role: string;
  roles?: string[];
  assignedWarehouse?: string;
  password?: string;
}

export interface UpdateUserPayload {
  fullName?: string;
  email?: string;
  phone?: string;
  role?: string;
  roles?: string[];
  assignedWarehouse?: string;
  password?: string;
}

export interface UpdateUserStatusPayload {
  status: UserStatusType;
  reason: string;
}

export interface CreateUserResponse {
  user: UserManagementItem;
  temporaryPassword?: string;
}
