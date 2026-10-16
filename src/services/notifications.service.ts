import { apiClient } from './api';

export interface SystemNotification {
  id: string;
  userId?: string;
  recipientName?: string;
  recipientRole?: string;
  orderId?: string;
  orderCode?: string;
  customerName?: string;
  type: 'ORDER' | 'STOCK_ALERT' | 'DELIVERY' | 'PRICING' | 'CREDIT';
  title: string;
  message: string;
  amount?: number;
  link: string;
  isRead: boolean;
  priority: 'high' | 'normal';
  createdAt: string;
}

export const notificationsService = {
  /**
   * Lấy danh sách thông báo của người dùng đang đăng nhập
   */
  async getNotifications(
    limit = 50,
    params?: { userId?: string; role?: string; customerId?: string; username?: string },
  ): Promise<SystemNotification[]> {
    try {
      const res = await apiClient.get<SystemNotification[]>('/notifications', {
        params: { limit, ...params },
      });
      return res.data || [];
    } catch {
      return [];
    }
  },

  /**
   * Đánh dấu 1 thông báo là đã đọc
   */
  async markAsRead(id: string): Promise<boolean> {
    try {
      const res = await apiClient.patch<{ success: boolean }>(`/notifications/${id}/read`);
      return Boolean(res.data?.success);
    } catch {
      return false;
    }
  },

  /**
   * Đánh dấu tất cả thông báo là đã đọc
   */
  async markAllAsRead(): Promise<boolean> {
    try {
      const res = await apiClient.patch<{ success: boolean }>('/notifications/read-all');
      return Boolean(res.data?.success);
    } catch {
      return false;
    }
  },
};
