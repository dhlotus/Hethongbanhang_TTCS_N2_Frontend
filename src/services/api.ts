import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { tokenStorage } from "../utils/token-storage";
import { handleSessionTimeout } from "../utils/session-timeout";
import type { TokenResponse } from "../types/auth";

/**
 * Mở rộng cấu hình request của Axios để theo dõi trạng thái thử lại (retry)
 */
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

/**
 * Kiểu dữ liệu cho các request nằm trong hàng đợi chờ cấp token mới
 */
interface QueueItem {
  resolve: (token: string) => void;
  reject: (reason: unknown) => void;
}

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

/**
 * Axios Instance chính cho toàn bộ các API nghiệp vụ trong hệ thống
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

/**
 * Axios Instance riêng biệt cho các yêu cầu làm mới token (Refresh Token) và đăng xuất (Logout)
 * Tuyệt đối không gắn Response Interceptor xử lý 401 tại đây để ngăn ngừa vòng lặp vô hạn
 */
export const refreshClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Cờ đánh dấu tiến trình refresh token đang diễn ra
let isRefreshing = false;

// Hàng đợi lưu các request đồng thời bị 401 trong thời gian đợi token mới
let failedQueue: QueueItem[] = [];

/**
 * Giải phóng và thực thi hàng đợi các request sau khi refresh token hoàn tất
 */
const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * 1. Request Interceptor:
 * Tự động trích xuất token từ localStorage và gắn vào Authorization Header
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

/**
 * 2. Response Interceptor:
 * Lắng nghe phản hồi từ Server, phát hiện lỗi 401 Unauthorized, kiểm soát mutex refresh token
 * và tự động retry các request đang chờ một cách mượt mà
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig | undefined;

    // Bỏ qua nếu không có cấu hình request hoặc không phải mã 401
    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || "";
    const isAuthEndpoint =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/refresh") ||
      requestUrl.includes("/auth/logout");

    // Nếu endpoint xác thực bị 401, trả lỗi trực tiếp để UI xử lý (tránh lặp vô hạn)
    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    // Nếu tài khoản bị Khóa (LOCKED), lập tức kích hoạt đăng xuất và hiển thị thông báo khóa
    const resData = error.response?.data as { message?: string | string[] } | undefined;
    const rawMessage = Array.isArray(resData?.message)
      ? resData.message.join(", ")
      : resData?.message;
    const isLockedError =
      typeof rawMessage === "string" &&
      (rawMessage.toLowerCase().includes("khóa") ||
        rawMessage.toLowerCase().includes("khoá") ||
        rawMessage.toLowerCase().includes("locked"));

    if (isLockedError) {
      handleSessionTimeout(
        rawMessage || "Tài khoản của bạn đã bị khóa bởi Quản trị viên.",
      );
      return Promise.reject(error);
    }

    // Nếu request này đã retry một lần nhưng vẫn nhận lại 401 -> Phiên không còn giá trị
    if (originalRequest._retry) {
      handleSessionTimeout();
      return Promise.reject(error);
    }

    // Cơ chế chống lặp gọi refresh token khi nhiều API đồng loạt trả về 401:
    // Đẩy request vào hàng đợi và chờ cho đến khi token mới được cấp
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return apiClient(originalRequest);
        })
        .catch((queueError: unknown) => Promise.reject(queueError));
    }

    // Bắt đầu quy trình làm mới token duy nhất
    originalRequest._retry = true;
    isRefreshing = true;

    const currentRefreshToken = tokenStorage.getRefreshToken();

    // Không tồn tại Refresh Token -> Phiên làm việc coi như đã kết thúc
    if (!currentRefreshToken) {
      isRefreshing = false;
      handleSessionTimeout();
      return Promise.reject(error);
    }

    try {
      let newAccessToken = "";
      let newRefreshToken: string | undefined = undefined;

      // Hỗ trợ tài khoản Demo khi chạy thử nghiệm độc lập chưa bật Backend
      if (currentRefreshToken.startsWith("demo-jwt-")) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        newAccessToken = `demo-jwt-refreshed-${Date.now()}-access-token`;
        newRefreshToken = currentRefreshToken;
      } else {
        // Gọi API backend: POST /auth/refresh
        const refreshResponse = await refreshClient.post<TokenResponse>(
          "/auth/refresh",
          {
            refreshToken: currentRefreshToken,
          },
        );

        newAccessToken = refreshResponse.data.accessToken;
        newRefreshToken = refreshResponse.data.refreshToken;
      }

      // Lưu trữ cặp token mới vào localStorage
      tokenStorage.setTokens(newAccessToken, newRefreshToken);

      // Thông báo token mới cho toàn bộ các request đang chờ trong hàng đợi
      processQueue(null, newAccessToken);

      // Cập nhật token mới vào request hiện tại và thực thi lại (retry)
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }

      return apiClient(originalRequest);
    } catch (refreshError: unknown) {
      // Refresh Token thất bại (hết hạn hoặc bị thu hồi) -> Dọn dẹp & thông báo Session Timeout
      processQueue(refreshError, null);
      handleSessionTimeout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
