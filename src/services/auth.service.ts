import axios from "axios";
import { apiClient } from "./api";
import type { LoginCredentials, LoginResponse } from "../types/auth";

// Danh sách tài khoản demo cho môi trường dev và kiểm thử offline
const DEMO_USERS: Record<string, LoginResponse> = {
  "admin@system.local": {
    accessToken: "demo-jwt-admin-token",
    tokenType: "Bearer",
    user: {
      id: "demo-admin",
      username: "admin",
      fullName: "Quản Trị Viên",
      email: "admin@system.local",
      roles: ["Admin"],
    },
  },
  "sales@system.local": {
    accessToken: "demo-jwt-sales-token",
    tokenType: "Bearer",
    user: {
      id: "demo-sales",
      username: "sales",
      fullName: "Nhân Viên Kinh Doanh",
      email: "sales@system.local",
      roles: ["Sales Rep"],
    },
  },
  "warehouse@system.local": {
    accessToken: "demo-jwt-wh-token",
    tokenType: "Bearer",
    user: {
      id: "demo-wh",
      username: "warehouse",
      fullName: "Thủ Kho",
      email: "warehouse@system.local",
      roles: ["Warehouse"],
    },
  },
  "accountant@system.local": {
    accessToken: "demo-jwt-acc-token",
    tokenType: "Bearer",
    user: {
      id: "demo-acc",
      username: "accountant",
      fullName: "Kế Toán Công Nợ",
      email: "accountant@system.local",
      roles: ["Accountant"],
    },
  },
  "customer@gmail.com": {
    accessToken: "demo-jwt-cus-token",
    tokenType: "Bearer",
    user: {
      id: "demo-cus",
      username: "customer",
      fullName: "Đại Lý Cửa Hàng",
      email: "customer@gmail.com",
      roles: ["Customer"],
    },
  },
};

// Lưu trữ số lần đăng nhập sai cục bộ để mô phỏng khóa 15 phút khi không có backend
const demoFailedAttempts = new Map<string, { count: number; lockedUntil: number }>();

export const authService = {
  /**
   * Gọi API đăng nhập tài khoản
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const email = credentials.email.trim().toLowerCase();
    const { password } = credentials;

    // 1. Kiểm tra tài khoản Demo (Hỗ trợ chạy thử nghiệm ngay cả khi chưa bật backend)
    if (DEMO_USERS[email]) {
      const lockData = demoFailedAttempts.get(email);
      const now = Date.now();

      if (lockData && lockData.lockedUntil > now) {
        throw new Error("Tài khoản bị khóa tạm thời 15 phút");
      }

      await new Promise((resolve) => setTimeout(resolve, 400));

      if (password !== "123456") {
        const nextCount = (lockData?.count || 0) + 1;
        if (nextCount >= 5) {
          demoFailedAttempts.set(email, {
            count: 5,
            lockedUntil: now + 15 * 60 * 1000,
          });
          throw new Error("Tài khoản bị khóa tạm thời 15 phút");
        }

        demoFailedAttempts.set(email, { count: nextCount, lockedUntil: 0 });
        throw new Error("Tài khoản hoặc mật khẩu không chính xác");
      }

      // Xóa lịch sử sai khi đăng nhập đúng
      demoFailedAttempts.delete(email);
      return DEMO_USERS[email];
    }

    // 2. Gọi API Backend thật
    try {
      const response = await apiClient.post<LoginResponse>("/auth/login", {
        username: email,
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

        // Kiểm tra xem có bị khóa do quá 5 lần sai không
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
