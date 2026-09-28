import axios from "axios";
import type { LoginResponse } from "../models/auth-user";
import { UserRole } from "../constants/roles";
import { apiClient } from "./api-client";

// Danh sách tài khoản demo tiện lợi cho kiểm thử trực tiếp trên Frontend
export const DEMO_ACCOUNTS: Record<string, LoginResponse> = {
    "admin": {
        accessToken: "demo-jwt-token-admin",
        tokenType: "Bearer",
        user: {
            id: "user-admin-01",
            username: "admin",
            fullName: "Nguyễn Quản Trị",
            email: "admin@system.local",
            roles: [UserRole.ADMIN],
        },
    },
    "sales_manager": {
        accessToken: "demo-jwt-token-sales-manager",
        tokenType: "Bearer",
        user: {
            id: "user-sm-01",
            username: "sales_manager",
            fullName: "Trần Quản Lý Kinh Doanh",
            email: "sales_manager@system.local",
            roles: [UserRole.SALES_MANAGER],
        },
    },
    "sales": {
        accessToken: "demo-jwt-token-sales",
        tokenType: "Bearer",
        user: {
            id: "user-sales-01",
            username: "sales",
            fullName: "Phạm Nhân Viên Sale",
            email: "sales@system.local",
            roles: [UserRole.SALES_REP],
        },
    },
    "warehouse": {
        accessToken: "demo-jwt-token-warehouse",
        tokenType: "Bearer",
        user: {
            id: "user-wh-01",
            username: "thukho",
            fullName: "Vũ Thủ Kho",
            email: "warehouse@system.local",
            roles: [UserRole.WAREHOUSE],
        },
    },
    "wh_manager": {
        accessToken: "demo-jwt-token-wh-manager",
        tokenType: "Bearer",
        user: {
            id: "user-whm-01",
            username: "quanlykho",
            fullName: "Đỗ Quản Lý Kho",
            email: "whmanager@system.local",
            roles: [UserRole.WH_MANAGER],
        },
    },
    "accountant": {
        accessToken: "demo-jwt-token-accountant",
        tokenType: "Bearer",
        user: {
            id: "user-acc-01",
            username: "ketoan",
            fullName: "Lê Kế Toán",
            email: "accountant@system.local",
            roles: [UserRole.ACCOUNTANT],
        },
    },
    "customer": {
        accessToken: "demo-jwt-token-customer",
        tokenType: "Bearer",
        user: {
            id: "user-cus-01",
            username: "customer",
            fullName: "Vũ Khách Hàng",
            email: "customer@gmail.com",
            roles: [UserRole.CUSTOMER],
        },
    },
};

export const AuthService = {
    async login(username: string, password: string): Promise<LoginResponse> {
        const trimmedUser = username.trim();
        const lowerUser = trimmedUser.toLowerCase();

        // 1. Kiểm tra tài khoản test demo nhanh (hoạt động kể cả khi chưa bật backend)
        for (const [key, demoData] of Object.entries(DEMO_ACCOUNTS)) {
            if (
                lowerUser === key ||
                lowerUser === demoData.user.username.toLowerCase() ||
                lowerUser === (demoData.user.email?.toLowerCase() ?? "")
            ) {
                // Giả lập độ trễ mạng nhẹ cho mượt mà
                await new Promise((resolve) => setTimeout(resolve, 350));
                return demoData;
            }
        }

        // 2. Gọi API Backend thật thông qua apiClient (đã gắn interceptor)
        try {
            const response = await apiClient.post<LoginResponse>("/auth/login", {
                username: trimmedUser,
                password: password,
            });

            return response.data;
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                if (!error.response) {
                    throw new Error(
                        "Không thể kết nối đến máy chủ Backend (Port 3000). Bạn có thể đăng nhập bằng các tài khoản Demo có sẵn (admin, warehouse, accountant, sales, customer) để kiểm tra luồng!",
                    );
                }

                const responseData = error.response.data as { message?: string | string[] };
                const message = Array.isArray(responseData?.message)
                    ? responseData.message.join(", ")
                    : responseData?.message || "Tên đăng nhập hoặc mật khẩu không chính xác.";
                throw new Error(message);
            }

            const err = error as Error;
            throw new Error(err.message || "Đăng nhập thất bại.");
        }
    },
};
