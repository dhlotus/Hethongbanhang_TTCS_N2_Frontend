export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  roles: string[];
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

export const USER_ROLES = {
  ADMIN: "ADMIN",
  SALES_REP: "SALES_REP",
  SALES_MANAGER: "SALES_MANAGER",
  WAREHOUSE_KEEPER: "WAREHOUSE_KEEPER",
  WAREHOUSE_MANAGER: "WAREHOUSE_MANAGER",
  ACCOUNTANT: "ACCOUNTANT",
  CUSTOMER: "CUSTOMER",
} as const;

export type UserRoleType = (typeof USER_ROLES)[keyof typeof USER_ROLES];
