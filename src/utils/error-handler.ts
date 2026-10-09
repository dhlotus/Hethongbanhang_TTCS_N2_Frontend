import { isAxiosError } from 'axios';
import { toast } from '../components/toast';

/**
 * Trích xuất thông điệp lỗi thân thiện với người dùng (UI_GUIDELINES Section 82 & 90)
 * - Phân loại lỗi: Lỗi mạng, Xác thực (401), Phân quyền (403), Dữ liệu (404/409), Lỗi nghiệp vụ (400/422), Máy chủ (500)
 * - Tuyệt đối không hiển thị Stack trace, mã lỗi kỹ thuật hoặc thông tin nhạy cảm
 */
export function getFriendlyErrorMessage(
  error: unknown,
  fallbackMessage: string = 'Đã xảy ra lỗi, vui lòng thử lại sau'
): string {
  if (!error) return fallbackMessage;

  // Lỗi mạng hoặc ngắt kết nối (Network Error / Timeout)
  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return 'Yêu cầu quá thời gian chờ (Timeout). Vui lòng kiểm tra lại kết nối mạng.';
    }

    if (!error.response && error.request) {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra đường truyền Internet của bạn.';
    }

    const status = error.response?.status;
    const data = error.response?.data as any;

    // Lỗi phân quyền / bảo mật (403 Forbidden)
    if (status === 403) {
      return 'Bạn không có quyền thực hiện chức năng này trong hệ thống.';
    }

    // Không tìm thấy tài nguyên (404 Not Found)
    if (status === 404) {
      return data?.message &&
        typeof data.message === 'string' &&
        !data.message.includes('Cannot GET')
        ? data.message
        : 'Không tìm thấy dữ liệu yêu cầu trên hệ thống.';
    }

    // Xung đột dữ liệu / Trùng mã (409 Conflict)
    if (status === 409) {
      return data?.message && typeof data.message === 'string'
        ? data.message
        : 'Dữ liệu đã tồn tại hoặc đang bị xung đột với phiên làm việc khác.';
    }

    // Lỗi dữ liệu nhập / Nghiệp vụ không hợp lệ (400 Bad Request / 422 Unprocessable)
    if (status === 400 || status === 422) {
      if (typeof data?.message === 'string') {
        return data.message;
      }
      if (Array.isArray(data?.message) && data.message.length > 0) {
        return data.message[0];
      }
      return 'Dữ liệu gửi lên chưa hợp lệ. Vui lòng kiểm tra lại các trường thông tin.';
    }

    // Lỗi máy chủ nội bộ (500 Server Error)
    if (status && status >= 500) {
      return 'Máy chủ đang gặp sự cố tạm thời. Đội ngũ kỹ thuật đã được thông báo, vui lòng thử lại sau.';
    }

    // Trường hợp thông báo rõ nghĩa từ Backend
    if (data?.message && typeof data.message === 'string') {
      return data.message;
    }
  }

  if (error instanceof Error && error.message) {
    // Lọc bỏ các thông điệp kỹ thuật thuần túy
    if (
      !error.message.includes('Network Error') &&
      !error.message.includes('Failed to fetch') &&
      !error.message.includes('undefined') &&
      !error.message.includes('null')
    ) {
      return error.message;
    }
  }

  return fallbackMessage;
}

/**
 * Hiển thị Toast Error chuẩn LOHA SALES cho các lỗi API phát sinh (Quy tắc 82)
 */
export function notifyApiError(error: unknown, fallbackMessage?: string): void {
  const message = getFriendlyErrorMessage(error, fallbackMessage);
  toast.error(message);
}
