import axios from "axios";
import { apiClient, refreshClient } from "./api";
import { tokenStorage } from "../utils/token-storage";
import type {
  LoginCredentials,
  LoginResponse,
  TokenResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from "../types/auth";

// Danh sách 7 tài khoản demo theo đúng 7 vai trò của hệ thống LOHA SALES (Mật khẩu chung: 123456)
const DEMO_USERS: Record<string, LoginResponse> = {
  // 1. Quản trị hệ thống (Admin)
  "quantrihethong@loha.vn": {
    accessToken: "demo-jwt-admin-access-token",
    refreshToken: "demo-jwt-admin-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-admin",
      username: "admin",
      fullName: "Nguyễn Văn Admin (Quản Trị Viên)",
      email: "quantrihethong@loha.vn",
      roles: ["ADMIN"],
    },
  },
  "admin@loha.vn": {
    accessToken: "demo-jwt-admin-access-token",
    refreshToken: "demo-jwt-admin-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-admin",
      username: "admin",
      fullName: "Nguyễn Văn Admin (Quản Trị Viên)",
      email: "quantrihethong@loha.vn",
      roles: ["ADMIN"],
    },
  },
  "admin": {
    accessToken: "demo-jwt-admin-access-token",
    refreshToken: "demo-jwt-admin-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-admin",
      username: "admin",
      fullName: "Nguyễn Văn Admin (Quản Trị Viên)",
      email: "quantrihethong@loha.vn",
      roles: ["ADMIN"],
    },
  },

  // 2. Nhân viên kinh doanh (Sales Rep)
  "nhanvienkinhdoanh@loha.vn": {
    accessToken: "demo-jwt-sales-access-token",
    refreshToken: "demo-jwt-sales-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-sales-rep",
      username: "sales",
      fullName: "Trần Văn Nam (Nhân Viên Kinh Doanh)",
      email: "nhanvienkinhdoanh@loha.vn",
      roles: ["SALES_REP"],
    },
  },
  "sales@loha.vn": {
    accessToken: "demo-jwt-sales-access-token",
    refreshToken: "demo-jwt-sales-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-sales-rep",
      username: "sales",
      fullName: "Trần Văn Nam (Nhân Viên Kinh Doanh)",
      email: "nhanvienkinhdoanh@loha.vn",
      roles: ["SALES_REP"],
    },
  },
  "sales": {
    accessToken: "demo-jwt-sales-access-token",
    refreshToken: "demo-jwt-sales-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-sales-rep",
      username: "sales",
      fullName: "Trần Văn Nam (Nhân Viên Kinh Doanh)",
      email: "nhanvienkinhdoanh@loha.vn",
      roles: ["SALES_REP"],
    },
  },

  // 3. Quản lý kinh doanh (Sales Manager)
  "quanlykinhdoanh@loha.vn": {
    accessToken: "demo-jwt-salesmanager-access-token",
    refreshToken: "demo-jwt-salesmanager-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-sales-manager",
      username: "salesmanager",
      fullName: "Lê Hoàng Trưởng Phòng (Quản Lý Kinh Doanh)",
      email: "quanlykinhdoanh@loha.vn",
      roles: ["SALES_MANAGER"],
    },
  },
  "salesmanager@loha.vn": {
    accessToken: "demo-jwt-salesmanager-access-token",
    refreshToken: "demo-jwt-salesmanager-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-sales-manager",
      username: "salesmanager",
      fullName: "Lê Hoàng Trưởng Phòng (Quản Lý Kinh Doanh)",
      email: "quanlykinhdoanh@loha.vn",
      roles: ["SALES_MANAGER"],
    },
  },

  // 4. Thủ kho (Warehouse Keeper)
  "thukho@loha.vn": {
    accessToken: "demo-jwt-wh-keeper-access-token",
    refreshToken: "demo-jwt-wh-keeper-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-warehouse-keeper",
      username: "warehouse",
      fullName: "Phạm Hùng Kho (Thủ Kho)",
      email: "thukho@loha.vn",
      roles: ["WAREHOUSE_KEEPER"],
    },
  },
  "warehouse@loha.vn": {
    accessToken: "demo-jwt-wh-keeper-access-token",
    refreshToken: "demo-jwt-wh-keeper-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-warehouse-keeper",
      username: "warehouse",
      fullName: "Phạm Hùng Kho (Thủ Kho)",
      email: "thukho@loha.vn",
      roles: ["WAREHOUSE_KEEPER"],
    },
  },
  "warehouse": {
    accessToken: "demo-jwt-wh-keeper-access-token",
    refreshToken: "demo-jwt-wh-keeper-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-warehouse-keeper",
      username: "warehouse",
      fullName: "Phạm Hùng Kho (Thủ Kho)",
      email: "thukho@loha.vn",
      roles: ["WAREHOUSE_KEEPER"],
    },
  },

  // 5. Quản lý kho (Warehouse Manager)
  "quanlykho@loha.vn": {
    accessToken: "demo-jwt-wh-manager-access-token",
    refreshToken: "demo-jwt-wh-manager-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-warehouse-manager",
      username: "warehousemanager",
      fullName: "Đỗ Quốc Bảo (Quản Lý Kho)",
      email: "quanlykho@loha.vn",
      roles: ["WAREHOUSE_MANAGER"],
    },
  },
  "warehousemanager@loha.vn": {
    accessToken: "demo-jwt-wh-manager-access-token",
    refreshToken: "demo-jwt-wh-manager-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-warehouse-manager",
      username: "warehousemanager",
      fullName: "Đỗ Quốc Bảo (Quản Lý Kho)",
      email: "quanlykho@loha.vn",
      roles: ["WAREHOUSE_MANAGER"],
    },
  },

  // 6. Kế toán công nợ (Accountant)
  "ketoan@loha.vn": {
    accessToken: "demo-jwt-acc-access-token",
    refreshToken: "demo-jwt-acc-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-accountant",
      username: "accountant",
      fullName: "Vũ Mai Hoa (Kế Toán Công Nợ)",
      email: "ketoan@loha.vn",
      roles: ["ACCOUNTANT"],
    },
  },
  "ketoancongno@loha.vn": {
    accessToken: "demo-jwt-acc-access-token",
    refreshToken: "demo-jwt-acc-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-accountant",
      username: "accountant",
      fullName: "Vũ Mai Hoa (Kế Toán Công Nợ)",
      email: "ketoan@loha.vn",
      roles: ["ACCOUNTANT"],
    },
  },
  "accountant@loha.vn": {
    accessToken: "demo-jwt-acc-access-token",
    refreshToken: "demo-jwt-acc-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-accountant",
      username: "accountant",
      fullName: "Vũ Mai Hoa (Kế Toán Công Nợ)",
      email: "ketoan@loha.vn",
      roles: ["ACCOUNTANT"],
    },
  },
  "accountant": {
    accessToken: "demo-jwt-acc-access-token",
    refreshToken: "demo-jwt-acc-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-accountant",
      username: "accountant",
      fullName: "Vũ Mai Hoa (Kế Toán Công Nợ)",
      email: "ketoan@loha.vn",
      roles: ["ACCOUNTANT"],
    },
  },

  // 7. Đại lý / Khách hàng B2B (Dealer / Customer)
  "daily@loha.vn": {
    accessToken: "demo-jwt-dealer-access-token",
    refreshToken: "demo-jwt-dealer-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-dealer",
      username: "dealer",
      fullName: "Đại Lý Cửa Hàng Minh Khang (B2B)",
      email: "daily@loha.vn",
      roles: ["CUSTOMER"],
    },
  },
  "khachhang@loha.vn": {
    accessToken: "demo-jwt-dealer-access-token",
    refreshToken: "demo-jwt-dealer-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-dealer",
      username: "dealer",
      fullName: "Đại Lý Cửa Hàng Minh Khang (B2B)",
      email: "daily@loha.vn",
      roles: ["CUSTOMER"],
    },
  },
  "dealer@loha.vn": {
    accessToken: "demo-jwt-dealer-access-token",
    refreshToken: "demo-jwt-dealer-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-dealer",
      username: "dealer",
      fullName: "Đại Lý Cửa Hàng Minh Khang (B2B)",
      email: "daily@loha.vn",
      roles: ["CUSTOMER"],
    },
  },
  "customer@gmail.com": {
    accessToken: "demo-jwt-dealer-access-token",
    refreshToken: "demo-jwt-dealer-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-dealer",
      username: "dealer",
      fullName: "Đại Lý Cửa Hàng Minh Khang (B2B)",
      email: "daily@loha.vn",
      roles: ["CUSTOMER"],
    },
  },
  "customer": {
    accessToken: "demo-jwt-dealer-access-token",
    refreshToken: "demo-jwt-dealer-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-dealer",
      username: "dealer",
      fullName: "Đại Lý Cửa Hàng Minh Khang (B2B)",
      email: "daily@loha.vn",
      roles: ["CUSTOMER"],
    },
  },
};

// Lưu trữ số lần đăng nhập sai cục bộ để mô phỏng khóa 15 phút khi không có backend
const demoFailedAttempts = new Map<string, { count: number; lockedUntil: number }>();

export const authService = {
  /**
   * Gọi API đăng nhập tài khoản (POST /auth/login)
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const identifier = credentials.email.trim().toLowerCase();
    const { password } = credentials;

    // 1. Kiểm tra tài khoản Demo (Hỗ trợ chạy thử nghiệm ngay cả khi chưa bật backend)
    if (DEMO_USERS[identifier]) {
      const lockData = demoFailedAttempts.get(identifier);
      const now = Date.now();

      if (lockData && lockData.lockedUntil > now) {
        throw new Error(
          "Tài khoản bị khóa tạm thời 15 phút do nhập sai quá số lần quy định",
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 400));

      if (password !== "123456") {
        const nextCount = (lockData?.count || 0) + 1;
        if (nextCount >= 5) {
          demoFailedAttempts.set(identifier, {
            count: 5,
            lockedUntil: now + 15 * 60 * 1000,
          });
          throw new Error(
            "Tài khoản bị khóa tạm thời 15 phút do nhập sai quá số lần quy định",
          );
        }

        demoFailedAttempts.set(identifier, { count: nextCount, lockedUntil: 0 });
        throw new Error("Tài khoản hoặc mật khẩu không chính xác");
      }

      // Xóa lịch sử sai khi đăng nhập đúng
      demoFailedAttempts.delete(identifier);
      return DEMO_USERS[identifier];
    }

    // 2. Gọi API Backend thật: POST /auth/login
    try {
      const response = await apiClient.post<LoginResponse>("/auth/login", {
        username: identifier,
        password,
      });

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          throw new Error(
            "Không thể kết nối đến máy chủ Backend. Bạn có thể sử dụng các tài khoản Demo có sẵn để kiểm tra!",
            { cause: error },
          );
        }

        const data = error.response.data as { message?: string | string[]; statusCode?: number };
        const rawMessage = Array.isArray(data?.message)
          ? data.message.join(", ")
          : data?.message || "";

        // Kiểm tra xem có bị khóa do quá 5 lần sai không (mã 423 hoặc message chứa 'tạm khóa' / '15 phút')
        const isLocked =
          error.response.status === 423 ||
          rawMessage.toLowerCase().includes("tạm khóa") ||
          rawMessage.toLowerCase().includes("khoá") ||
          rawMessage.toLowerCase().includes("15 phút");

        if (isLocked) {
          throw new Error(
            "Tài khoản bị khóa tạm thời 15 phút do nhập sai quá số lần quy định",
            { cause: error },
          );
        }

        // Bắt lỗi 401 hoặc 400: Luôn trả về thông báo chung để chống lộ thông tin tồn tại tài khoản
        if (error.response.status === 401 || error.response.status === 400) {
          throw new Error("Tài khoản hoặc mật khẩu không chính xác", { cause: error });
        }

        throw new Error(rawMessage || "Tài khoản hoặc mật khẩu không chính xác", { cause: error });
      }

      const err = error as Error;
      throw new Error(err.message || "Đăng nhập thất bại", { cause: error });
    }
  },

  /**
   * Gọi API làm mới token: POST /auth/refresh
   */
  async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    const cleanToken = refreshToken.trim();

    // Hỗ trợ demo tokens offline
    if (cleanToken.startsWith("demo-jwt-")) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return {
        accessToken: `demo-jwt-refreshed-${Date.now()}-access-token`,
        refreshToken: cleanToken,
        tokenType: "Bearer",
        expiresIn: "3600s",
      };
    }

    const response = await refreshClient.post<TokenResponse>("/auth/refresh", {
      refreshToken: cleanToken,
    });

    return response.data;
  },

  /**
   * Đăng xuất khỏi hệ thống:
   * 1. Gọi API POST /auth/logout để máy chủ thu hồi refresh token / session
   * 2. Dọn sạch toàn bộ localStorage (access_token, refresh_token, user info)
   * 3. Tùy chọn chuyển hướng về trang /auth/login
   */
  async logout(redirect = false): Promise<void> {
    const refreshToken = tokenStorage.getRefreshToken();
    const accessToken = tokenStorage.getAccessToken();

    try {
      // Chỉ gửi request lên máy chủ nếu thiết bị đang có mạng
      const isOnline = typeof navigator === "undefined" || navigator.onLine;

      if (
        isOnline &&
        refreshToken &&
        !refreshToken.startsWith("demo-jwt-")
      ) {
        await refreshClient.post(
          "/auth/logout",
          { refreshToken },
          {
            headers: accessToken
              ? { Authorization: `Bearer ${accessToken}` }
              : undefined,
            timeout: 3000, // Timeout ngắn 3 giây tránh treo khi mạng lag/rớt
          },
        );
      }
    } catch (error: unknown) {
      // Ghi log cảnh báo nhưng không chặn việc dọn dẹp client
      console.warn(
        "Không thể thu hồi token trên máy chủ khi đăng xuất (có thể do mạng chập chờn):",
        error,
      );
    } finally {
      tokenStorage.clearAuthData();

      if (redirect) {
        window.location.href = "/auth/login";
      }
    }
  },

  /**
   * Đổi mật khẩu tài khoản người dùng: POST /auth/change-password
   */
  async changePassword(
    data: ChangePasswordRequest,
  ): Promise<ChangePasswordResponse> {
    const token = tokenStorage.getAccessToken();

    // 1. Kiểm tra tài khoản Demo (hỗ trợ thử nghiệm khi chưa bật backend)
    if (token && token.startsWith("demo-jwt-")) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (data.currentPassword !== "123456") {
        throw new Error("Mật khẩu hiện tại không chính xác");
      }

      return {
        success: true,
        message: "Đổi mật khẩu thành công! Vui lòng đăng nhập lại.",
      };
    }

    // 2. Gọi API Backend thật: POST /auth/change-password
    try {
      const response = await apiClient.post<ChangePasswordResponse>(
        "/auth/change-password",
        {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        },
      );

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          throw new Error(
            "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng!",
            { cause: error },
          );
        }

        const resData = error.response.data as {
          message?: string | string[];
          statusCode?: number;
        };

        const rawMessage = Array.isArray(resData?.message)
          ? resData.message.join(", ")
          : resData?.message || "";

        if (error.response.status === 400 || error.response.status === 401) {
          throw new Error(
            rawMessage || "Mật khẩu hiện tại không chính xác",
            { cause: error },
          );
        }

        throw new Error(
          rawMessage || "Không thể đổi mật khẩu. Vui lòng thử lại sau!",
          { cause: error },
        );
      }

      const err = error as Error;
      throw new Error(err.message || "Đổi mật khẩu thất bại", { cause: error });
    }
  },

  /**
   * Yêu cầu gửi email đặt lại mật khẩu: POST /auth/forgot-password (SN-8)
   */
  async forgotPassword(
    data: ForgotPasswordRequest,
  ): Promise<ForgotPasswordResponse> {
    const email = data.email.trim().toLowerCase();

    try {
      const response = await apiClient.post<ForgotPasswordResponse>(
        "/auth/forgot-password",
        { email },
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          throw new Error(
            "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng!",
            { cause: error },
          );
        }

        const resData = error.response.data as {
          message?: string | string[];
          statusCode?: number;
        };
        const rawMessage = Array.isArray(resData?.message)
          ? resData.message.join(", ")
          : resData?.message;

        throw new Error(
          rawMessage || "Địa chỉ email này chưa được đăng ký trong hệ thống!",
          { cause: error },
        );
      }

      const err = error as Error;
      throw new Error(err.message || "Gửi yêu cầu thất bại", { cause: error });
    }
  },

  /**
   * Đặt lại mật khẩu mới với token từ email: POST /auth/reset-password (SN-8)
   */
  async resetPassword(
    data: ResetPasswordRequest,
  ): Promise<ResetPasswordResponse> {
    const { token, newPassword } = data;

    // Giả lập cho token demo
    if (token.startsWith("demo-reset-token")) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      return {
        success: true,
        message: "Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.",
      };
    }

    try {
      const response = await apiClient.post<ResetPasswordResponse>(
        "/auth/reset-password",
        {
          token: token.trim(),
          newPassword,
        },
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          throw new Error(
            "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng!",
            { cause: error },
          );
        }

        const resData = error.response.data as {
          message?: string | string[];
          statusCode?: number;
        };

        const rawMessage = Array.isArray(resData?.message)
          ? resData.message.join(", ")
          : resData?.message;

        throw new Error(
          rawMessage || "Mã token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn (30 phút).",
          { cause: error },
        );
      }

      const err = error as Error;
      throw new Error(
        err.message || "Không thể đặt lại mật khẩu. Vui lòng thử lại sau!",
        { cause: error },
      );
    }
  },
};
