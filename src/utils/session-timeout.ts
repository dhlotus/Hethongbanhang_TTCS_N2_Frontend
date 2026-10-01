import { tokenStorage } from "./token-storage";

export const SESSION_TIMEOUT_EVENT = "loha:session-timeout";
export const SESSION_TIMEOUT_STORAGE_KEY = "loha_session_timeout_message";
export const DEFAULT_SESSION_TIMEOUT_MESSAGE =
  "Phiên làm việc đã hết hạn, vui lòng đăng nhập lại";

/**
 * Điều phối xử lý sự cố hết hạn phiên làm việc (Session Timeout):
 * 1. Xóa sạch thông tin token và profile trong localStorage
 * 2. Lưu tin nhắn thông báo vào sessionStorage để hiển thị Toast tại trang Login
 * 3. Phát CustomEvent cho toàn bộ ứng dụng lắng nghe
 * 4. Chuyển hướng người dùng về trang đăng nhập /auth/login
 */
export const handleSessionTimeout = (
  message: string = DEFAULT_SESSION_TIMEOUT_MESSAGE,
): void => {
  // 1. Dọn sạch dữ liệu xác thực
  tokenStorage.clearAuthData();

  // 2. Ghi nhận cờ hiển thị Toast thông báo tại sessionStorage
  try {
    sessionStorage.setItem(SESSION_TIMEOUT_STORAGE_KEY, message);
  } catch {
    // Bỏ qua lỗi hạn mức lưu trữ nếu có
  }

  // 3. Phát sự kiện toàn cục để các Component/Layout đang hiển thị có thể phản ứng
  try {
    window.dispatchEvent(
      new CustomEvent(SESSION_TIMEOUT_EVENT, {
        detail: { message },
      }),
    );
  } catch {
    // Môi trường SSR hoặc trình duyệt cũ
  }

  // 4. Chuyển hướng người dùng về trang đăng nhập
  const currentPath = window.location.pathname;
  const isLoginPage =
    currentPath === "/login" || currentPath === "/auth/login";

  if (!isLoginPage) {
    window.location.href = "/auth/login?expired=1";
  }
};
