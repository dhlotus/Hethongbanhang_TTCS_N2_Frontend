export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  isIdentityLocked?: boolean;
  roles: string[];
  role?: string;
  status?: string;
  assignedWarehouse?: string;
  avatarUrl?: string;
  createdAt?: string | Date;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn?: string;
  user: AuthUser;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn?: string;
  refreshToken?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  SALES_REP: 'SALES_REP',
  SALES_MANAGER: 'SALES_MANAGER',
  WAREHOUSE_KEEPER: 'WAREHOUSE_KEEPER',
  WAREHOUSE_MANAGER: 'WAREHOUSE_MANAGER',
  ACCOUNTANT: 'ACCOUNTANT',
  CUSTOMER: 'CUSTOMER',
} as const;

export type UserRoleType = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/**
 * Enum vai trò người dùng chuẩn hóa (SN-34 Code Convention)
 */
export enum Role {
  ADMIN = 'ADMIN',
  SALES_REP = 'SALES_REP',
  SALES_MANAGER = 'SALES_MANAGER',
  BUSINESS_MANAGER = 'SALES_MANAGER',
  WAREHOUSE_KEEPER = 'WAREHOUSE_KEEPER',
  WAREHOUSE_MANAGER = 'WAREHOUSE_MANAGER',
  ACCOUNTANT = 'ACCOUNTANT',
  ACCOUNTANT_DEBT = 'ACCOUNTANT',
  CUSTOMER = 'CUSTOMER',
}
