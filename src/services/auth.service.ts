import axios from "axios";
import { apiClient } from "./api";
import type { LoginCredentials, LoginResponse } from "../types/auth";

// Danh sách 7 tài khoản demo theo đúng 7 vai trò của hệ thống LOHA SALES (Mật khẩu chung: 123456)
const DEMO_USERS: Record<string, LoginResponse> = {
  // 1. Quản trị hệ thống (Admin)
  "admin@loha.vn": {
    accessToken: "demo-jwt-admin-access-token",
    refreshToken: "demo-jwt-admin-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-admin",
      username: "admin",
      fullName: "Nguyễn Văn Admin (Quản Trị Viên)",
      email: "admin@loha.vn",
      roles: ["ADMIN"],
    },
  },
  "admin@system.local": {
    accessToken: "demo-jwt-admin-access-token",
    refreshToken: "demo-jwt-admin-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-admin",
      username: "admin",
      fullName: "Nguyễn Văn Admin (Quản Trị Viên)",
      email: "admin@loha.vn",
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
      email: "admin@loha.vn",
      roles: ["ADMIN"],
    },
  },

  // 2. Nhân viên kinh doanh (Sales Rep)
  "sales@loha.vn": {
    accessToken: "demo-jwt-sales-access-token",
    refreshToken: "demo-jwt-sales-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-sales-rep",
      username: "sales",
      fullName: "Trần Văn Nam (Nhân Viên Kinh Doanh)",
      email: "sales@loha.vn",
      roles: ["SALES_REP"],
    },
  },
  "sales@system.local": {
    accessToken: "demo-jwt-sales-access-token",
    refreshToken: "demo-jwt-sales-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-sales-rep",
      username: "sales",
      fullName: "Trần Văn Nam (Nhân Viên Kinh Doanh)",
      email: "sales@loha.vn",
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
      email: "sales@loha.vn",
      roles: ["SALES_REP"],
    },
  },

  // 3. Quản lý kinh doanh (Sales Manager)
  "salesmanager@loha.vn": {
    accessToken: "demo-jwt-salesmanager-access-token",
    refreshToken: "demo-jwt-salesmanager-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-sales-manager",
      username: "salesmanager",
      fullName: "Lê Hoàng Trưởng Phòng (Quản Lý Kinh Doanh)",
      email: "salesmanager@loha.vn",
      roles: ["SALES_MANAGER"],
    },
  },

  // 4. Thủ kho (Warehouse Keeper)
  "warehouse@loha.vn": {
    accessToken: "demo-jwt-wh-keeper-access-token",
    refreshToken: "demo-jwt-wh-keeper-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-warehouse-keeper",
      username: "warehouse",
      fullName: "Phạm Hùng Kho (Thủ Kho)",
      email: "warehouse@loha.vn",
      roles: ["WAREHOUSE_KEEPER"],
    },
  },
  "warehouse@system.local": {
    accessToken: "demo-jwt-wh-keeper-access-token",
    refreshToken: "demo-jwt-wh-keeper-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-warehouse-keeper",
      username: "warehouse",
      fullName: "Phạm Hùng Kho (Thủ Kho)",
      email: "warehouse@loha.vn",
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
      email: "warehouse@loha.vn",
      roles: ["WAREHOUSE_KEEPER"],
    },
  },

  // 5. Quản lý kho (Warehouse Manager)
  "warehousemanager@loha.vn": {
    accessToken: "demo-jwt-wh-manager-access-token",
    refreshToken: "demo-jwt-wh-manager-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-warehouse-manager",
      username: "warehousemanager",
      fullName: "Đỗ Quốc Bảo (Quản Lý Kho)",
      email: "warehousemanager@loha.vn",
      roles: ["WAREHOUSE_MANAGER"],
    },
  },

  // 6. Kế toán (Accountant)
  "accountant@loha.vn": {
    accessToken: "demo-jwt-acc-access-token",
    refreshToken: "demo-jwt-acc-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-accountant",
      username: "accountant",
      fullName: "Vũ Mai Hoa (Kế Toán Công Nợ)",
      email: "accountant@loha.vn",
      roles: ["ACCOUNTANT"],
    },
  },
  "accountant@system.local": {
    accessToken: "demo-jwt-acc-access-token",
    refreshToken: "demo-jwt-acc-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-accountant",
      username: "accountant",
      fullName: "Vũ Mai Hoa (Kế Toán Công Nợ)",
      email: "accountant@loha.vn",
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
      email: "accountant@loha.vn",
      roles: ["ACCOUNTANT"],
    },
  },

  // 7. Đại lý / Khách hàng B2B (Dealer / Customer)
  "dealer@loha.vn": {
    accessToken: "demo-jwt-dealer-access-token",
    refreshToken: "demo-jwt-dealer-refresh-token",
    tokenType: "Bearer",
    expiresIn: "3600s",
    user: {
      id: "demo-dealer",
      username: "dealer",
      fullName: "Đại Lý Cửa Hàng Minh Khang (B2B)",
      email: "dealer@loha.vn",
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
      email: "dealer@loha.vn",
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
      email: "dealer@loha.vn",
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
        throw new Error("Tài khoản bị khóa tạm thời 15 phút");
      }

      await new Promise((resolve) => setTimeout(resolve, 400));

      if (password !== "123456") {
        const nextCount = (lockData?.count || 0) + 1;
        if (nextCount >= 5) {
          demoFailedAttempts.set(identifier, {
            count: 5,
            lockedUntil: now + 15 * 60 * 1000,
          });
          throw new Error("Tài khoản bị khóa tạm thời 15 phút");
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
          throw new Error("Tài khoản bị khóa tạm thời 15 phút", { cause: error });
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
};
