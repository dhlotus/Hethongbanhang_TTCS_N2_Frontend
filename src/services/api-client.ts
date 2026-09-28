import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { STORAGE_KEYS, AUTH_EVENTS } from "../constants/storage-keys";

// Tạo instance axios tiêu chuẩn cho toàn bộ ứng dụng
export const apiClient = axios.create({
    baseURL: "/api",
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 10000,
});

/**
 * 1. REQUEST INTERCEPTOR:
 * Tự động gắn token JWT vào header Authorization trước khi gửi request
 */
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

/**
 * 2. RESPONSE INTERCEPTOR:
 * Bắt mã lỗi 401 Unauthorized:
 * - Tự động xóa token và phiên đăng nhập
 * - Đặt cờ thông báo "Phiên đã hết hạn"
 * - Chuyển hướng người dùng về trang đăng nhập
 */
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error: AxiosError) => {
        const status = error.response?.status;
        const requestUrl = error.config?.url || "";

        // Nếu mã lỗi trả về là 401 (Unauthorized / Token hết hạn)
        if (status === 401) {
            // Loại trừ request đăng nhập (đăng nhập sai username/pass cũng trả về 401, cái này do LoginForm xử lý)
            const isLoginRequest = requestUrl.includes("/auth/login");

            if (!isLoginRequest) {
                console.warn("[Interceptor 401] Token không hợp lệ hoặc đã hết hạn. Đang chuyển hướng về /login...");

                // 1. Xóa dữ liệu phiên đăng nhập
                localStorage.removeItem(STORAGE_KEYS.TOKEN);
                localStorage.removeItem(STORAGE_KEYS.USER);

                // 2. Lưu cờ thông báo để trang /login hiển thị
                const expiredMessage = "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.";
                sessionStorage.setItem(STORAGE_KEYS.SESSION_EXPIRED, expiredMessage);

                // 3. Phát event nội bộ để các component đang mount cập nhật state
                window.dispatchEvent(
                    new CustomEvent(AUTH_EVENTS.SESSION_EXPIRED, {
                        detail: { message: expiredMessage },
                    }),
                );

                // 4. Tự động điều hướng về /login kèm param expired=true
                if (!window.location.pathname.includes("/login")) {
                    window.location.href = "/login?expired=true";
                }
            }
        }

        return Promise.reject(error);
    },
);

/**
 * Hàm hỗ trợ kiểm thử tính năng 401 Interceptor:
 * Giả lập hành vi khi backend trả về lỗi 401 Unauthorized do token hết hạn
 */
export const triggerMock401Error = () => {
    // Tạo giả lập một AxiosError với mã status 401
    const mockError = new AxiosError(
        "Unauthorized access - Token expired",
        "ERR_BAD_REQUEST",
        {
            url: "/api/users/profile",
            headers: {} as never,
        },
        null,
        {
            status: 401,
            statusText: "Unauthorized",
            headers: {},
            config: {} as never,
            data: { message: "Token has expired or is invalid." },
        },
    );

    // Kích hoạt qua handler interceptor 401
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    sessionStorage.setItem(STORAGE_KEYS.SESSION_EXPIRED, "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");

    window.dispatchEvent(
        new CustomEvent(AUTH_EVENTS.SESSION_EXPIRED, {
            detail: { message: "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại." },
        }),
    );

    window.location.href = "/login?expired=true";
    return Promise.reject(mockError);
};
