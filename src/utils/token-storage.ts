import type { AuthUser } from '../types/auth';

const ACCESS_TOKEN_KEY = 'access_token';
const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const AUTH_USER_KEY = 'auth_user';
const REMEMBERED_EMAIL_KEY = 'remembered_login_email';
const REMEMBER_ME_PREF_KEY = 'remember_me_preference';
const AUTH_STORAGE_TYPE_KEY = 'auth_storage_type';

/**
 * Tiện ích quản lý lưu trữ Token & Thông tin tài khoản người dùng
 * Hỗ trợ linh hoạt cả localStorage (Ghi nhớ đăng nhập dài hạn) và sessionStorage (Phiên làm việc tạm thời)
 * Đảm bảo tính nhất quán của các key, tránh magic strings trong toàn bộ dự án
 */
export const tokenStorage = {
  /**
   * Kiểm tra xem phiên làm việc hiện tại có đang lưu trong sessionStorage hay không
   */
  isSessionMode(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      sessionStorage.getItem(AUTH_STORAGE_TYPE_KEY) === 'session' ||
      Boolean(sessionStorage.getItem(ACCESS_TOKEN_KEY)) ||
      Boolean(sessionStorage.getItem(AUTH_TOKEN_KEY))
    );
  },

  /**
   * Lấy Access Token (ưu tiên localStorage, fallback sang sessionStorage)
   */
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return (
      localStorage.getItem(ACCESS_TOKEN_KEY) ||
      localStorage.getItem(AUTH_TOKEN_KEY) ||
      sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
      sessionStorage.getItem(AUTH_TOKEN_KEY)
    );
  },

  /**
   * Lấy Refresh Token hiện tại (ưu tiên localStorage, fallback sang sessionStorage)
   */
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return (
      localStorage.getItem(REFRESH_TOKEN_KEY) ||
      sessionStorage.getItem(REFRESH_TOKEN_KEY)
    );
  },

  /**
   * Lấy thông tin tài khoản người dùng hiện tại
   */
  getUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    const raw =
      localStorage.getItem(AUTH_USER_KEY) ||
      sessionStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  /**
   * Lưu trữ cặp Access Token và Refresh Token
   * @param accessToken Token truy cập JWT
   * @param refreshToken Token làm mới (nếu có)
   * @param rememberMe true: lưu localStorage (dài hạn), false: lưu sessionStorage (hết phiên khi đóng tab/trình duyệt). Nếu không truyền sẽ tự động theo chế độ hiện tại.
   */
  setTokens(accessToken: string, refreshToken?: string, rememberMe?: boolean): void {
    if (typeof window === 'undefined') return;

    const shouldPersist = rememberMe !== undefined ? rememberMe : !this.isSessionMode();
    const targetStorage = shouldPersist ? localStorage : sessionStorage;
    const cleanStorage = shouldPersist ? sessionStorage : localStorage;

    cleanStorage.removeItem(ACCESS_TOKEN_KEY);
    cleanStorage.removeItem(AUTH_TOKEN_KEY);
    cleanStorage.removeItem(REFRESH_TOKEN_KEY);
    cleanStorage.removeItem(AUTH_STORAGE_TYPE_KEY);

    targetStorage.setItem(AUTH_STORAGE_TYPE_KEY, shouldPersist ? 'local' : 'session');
    targetStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    targetStorage.setItem(AUTH_TOKEN_KEY, accessToken);
    if (refreshToken) {
      targetStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  },

  /**
   * Lưu thông tin người dùng
   * @param user Đối tượng thông tin người dùng
   * @param rememberMe true: lưu localStorage, false: lưu sessionStorage
   */
  setUser(user: AuthUser, rememberMe?: boolean): void {
    if (typeof window === 'undefined') return;

    const shouldPersist = rememberMe !== undefined ? rememberMe : !this.isSessionMode();
    const targetStorage = shouldPersist ? localStorage : sessionStorage;
    const cleanStorage = shouldPersist ? sessionStorage : localStorage;

    cleanStorage.removeItem(AUTH_USER_KEY);
    targetStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  },

  /**
   * Xóa sạch toàn bộ dữ liệu xác thực (Logout / Session Timeout)
   * Giữ lại email đã ghi nhớ (nếu có) để phục vụ tiện ích điền sẵn khi đăng nhập lại
   */
  clearAuthData(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_STORAGE_TYPE_KEY);

    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_TYPE_KEY);
  },

  /**
   * Lấy Email/Tài khoản đã được ghi nhớ từ phiên trước
   */
  getRememberedEmail(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REMEMBERED_EMAIL_KEY);
  },

  /**
   * Lưu Email/Tài khoản để tự động điền trong các lần đăng nhập tiếp theo
   */
  setRememberedEmail(email: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
  },

  /**
   * Xóa Email/Tài khoản đã ghi nhớ (khi người dùng bỏ chọn ghi nhớ đăng nhập)
   */
  clearRememberedEmail(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  },

  /**
   * Lấy tùy chọn ghi nhớ đăng nhập của người dùng (mặc định là true nếu chưa từng tắt)
   */
  getRememberMePreference(): boolean {
    if (typeof window === 'undefined') return true;
    const pref = localStorage.getItem(REMEMBER_ME_PREF_KEY);
    return pref === null ? true : pref === 'true';
  },

  /**
   * Cập nhật tùy chọn ghi nhớ đăng nhập
   */
  setRememberMePreference(enabled: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(REMEMBER_ME_PREF_KEY, String(enabled));
  },

  /**
   * Kiểm tra người dùng đã có token đăng nhập hay chưa
   */
  isAuthenticated(): boolean {
    return Boolean(this.getAccessToken());
  },
};
