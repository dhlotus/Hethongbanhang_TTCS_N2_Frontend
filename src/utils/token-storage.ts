import type { AuthUser } from "../types/auth";

const ACCESS_TOKEN_KEY = "access_token";
const AUTH_TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const AUTH_USER_KEY = "auth_user";

/**
 * Tiện ích quản lý lưu trữ Token & Thông tin tài khoản người dùng tại localStorage
 * Đảm bảo tính nhất quán của các key, tránh magic strings trong toàn bộ dự án
 */
export const tokenStorage = {
  /**
   * Lấy Access Token (ưu tiên access_token, fallback về auth_token)
   */
  getAccessToken(): string | null {
    return (
      localStorage.getItem(ACCESS_TOKEN_KEY) ||
      localStorage.getItem(AUTH_TOKEN_KEY)
    );
  },

  /**
   * Lấy Refresh Token hiện tại
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Lấy thông tin tài khoản người dùng hiện tại
   */
  getUser(): AuthUser | null {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  /**
   * Lưu trữ cặp Access Token và Refresh Token
   */
  setTokens(accessToken: string, refreshToken?: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  },

  /**
   * Lưu thông tin người dùng
   */
  setUser(user: AuthUser): void {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  },

  /**
   * Xóa sạch toàn bộ dữ liệu xác thực (Logout / Session Timeout)
   */
  clearAuthData(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  },

  /**
   * Kiểm tra người dùng đã có token đăng nhập hay chưa
   */
  isAuthenticated(): boolean {
    return Boolean(this.getAccessToken());
  },
};
