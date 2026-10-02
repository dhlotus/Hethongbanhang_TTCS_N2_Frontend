/**
 * Tiện ích xử lý URL ảnh đại diện (SN-144 / SN-145)
 */

/**
 * Chuyển đổi đường dẫn ảnh đại diện (tương đối hoặc tuyệt đối) thành URL đầy đủ hợp lệ
 * - Giữ nguyên URL ngoài (http/https/blob/data)
 * - Nối đúng origin backend nếu là đường dẫn tương đối (ví dụ: /uploads/avatars/...)
 */
export const resolveAvatarUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;

  // Nếu là URL tuyệt đối hoặc blob URL (preview tạm thời / blob object)
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url;
  }

  // Nếu là đường dẫn tương đối từ backend
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    try {
      const origin = new URL(apiUrl).origin;
      return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
    } catch {
      // Bỏ qua lỗi parse URL
    }
  }

  // Fallback: trả về đường dẫn tương đối (được proxy qua Vite /uploads)
  return url;
};
