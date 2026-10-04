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
  avatarUrl?: string | null;
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

export interface AssignedCustomerItem {
  id: string;
  code: string;
  name: string;
  region: string;
  phone?: string;
  email?: string;
  status: string;
  salesRepId?: string;
}

export interface AssignedCustomersResponse {
  customers: AssignedCustomerItem[];
  total: number;
  warning?: string;
}

export interface UpdateUserStatusResponse extends UserManagementItem {
  user: UserManagementItem;
  assignedCustomers?: AssignedCustomerItem[];
  assignedCustomersCount?: number;
  handoverWarning?: string;
}

// ──────────────────────────────────────────────────────────────
// SN-147: Import tài khoản hàng loạt từ Excel
// Mapping chính xác với ImportUsersReportDto của BE
// ──────────────────────────────────────────────────────────────

/** Kết quả xử lý từng dòng (khớp với ImportRowResult của BE) */
export interface ImportRowResult {
  row: number;
  rawData: {
    fullName?: string;
    username?: string;
    email?: string;
    role?: string;
    phone?: string;
    assignedWarehouse?: string;
  };
  status: 'SUCCESS' | 'FAILED';
  createdUser?: {
    id: string;
    username: string;
    fullName: string;
    email: string;
    role: string;
    status: string;
  };
  temporaryPassword?: string;
  errors?: string[];
}

/** Báo cáo tổng kết (khớp với ImportUsersReportDto của BE) */
export interface ExcelImportReport {
  totalRows: number;
  successCount: number;
  failedCount: number;
  results: ImportRowResult[];
  summary: string;
}

export interface ExcelImportResponse {
  statusCode: number;
  message: string;
  data: ExcelImportReport;
}
