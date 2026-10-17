import { apiClient } from './api';

export interface InvoiceLineItem {
  productId: string;
  productSku: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  lineTotal: number;
}

export interface InvoicePaymentRecord {
  id: string;
  paymentCode: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  note?: string;
  recordedBy?: string;
}

export interface InvoiceItem {
  id: string;
  invoiceCode: string;
  orderId: string;
  orderCode: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  salesRepId?: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
  issueDate: string;
  dueDate: string;
  note?: string;
  items?: InvoiceLineItem[];
  paymentHistory?: InvoicePaymentRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface DealerDebtSummary {
  customerId: string;
  customerCode: string;
  customerName: string;
  creditLimit: number;
  temporaryCreditLimit: number;
  effectiveLimit: number;
  currentDebt: number;
  availableCredit: number;
  debtUsagePercentage: number;
  overdueDebt: number;
  overdueInvoicesCount: number;
  unpaidInvoicesCount: number;
  totalInvoicesCount: number;
  maxDebtDays: number;
  paymentTerms: string;
  creditStatus: string;
}

export interface DebtReminderLog {
  id: string;
  invoiceId: string;
  invoiceCode: string;
  customerId: string;
  customerName: string;
  recipientEmail: string;
  type: 'UPCOMING_3_DAYS' | 'OVERDUE';
  overdueDays?: number;
  remainingAmount: number;
  sentDate: string;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  previewUrl?: string;
  createdAt: string;
}

export interface InAppDebtNotification {
  id: string;
  customerId: string;
  invoiceId: string;
  invoiceCode: string;
  type: 'DEBT_REMINDER_3_DAYS' | 'DEBT_OVERDUE';
  title: string;
  message: string;
  amount: number;
  dueDate: string;
  overdueDays?: number;
  link: string;
  isRead: boolean;
  priority: 'normal' | 'high';
  createdAt: string;
}

export interface PaginatedInvoicesResponse {
  data: InvoiceItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryInvoicesParams {
  customerId?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export const invoicesService = {
  /**
   * Lấy tổng hợp công nợ và hạn mức khả dụng của đại lý (SN-207 C)
   * GET /api/invoices/my-debt-summary
   */
  async getMyDebtSummary(): Promise<DealerDebtSummary> {
    const res = await apiClient.get<DealerDebtSummary>('/invoices/my-debt-summary');
    return res.data;
  },

  /**
   * Danh sách hóa đơn công nợ phân trang (SN-207 A)
   * GET /api/invoices
   */
  async getPaginatedInvoices(params?: QueryInvoicesParams): Promise<PaginatedInvoicesResponse> {
    const res = await apiClient.get<any>('/invoices', { params });
    if (res.data && Array.isArray(res.data.data)) {
      return res.data;
    }
    const list = Array.isArray(res.data) ? res.data : [];
    const limit = params?.limit || 10;
    const page = params?.page || 1;
    return {
      data: list,
      total: list.length,
      page,
      limit,
      totalPages: Math.ceil(list.length / limit) || 1,
    };
  },

  /**
   * Danh sách hóa đơn công nợ kèm lọc và tìm kiếm (SN-207 A)
   * GET /api/invoices
   */
  async getInvoices(params?: QueryInvoicesParams): Promise<InvoiceItem[]> {
    const res = await apiClient.get<any>('/invoices', { params });
    if (res.data && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return Array.isArray(res.data) ? res.data : [];
  },

  /**
   * Chi tiết hóa đơn bán hàng đã phát hành (SN-207 B)
   * GET /api/invoices/:id
   */
  async getInvoiceById(id: string): Promise<InvoiceItem> {
    const res = await apiClient.get<InvoiceItem>(`/invoices/${id}`);
    return res.data;
  },

  /**
   * Ghi nhận thanh toán hóa đơn công nợ (SN-207 C)
   * POST /api/invoices/:id/payments
   */
  async recordPayment(
    id: string,
    payload: { amount: number; paymentMethod?: string; note?: string }
  ): Promise<{ invoice: InvoiceItem; summary: DealerDebtSummary; message: string }> {
    const res = await apiClient.post<{
      invoice: InvoiceItem;
      summary: DealerDebtSummary;
      message: string;
    }>(`/invoices/${id}/payments`, payload);
    return res.data;
  },

  /**
   * Kích hoạt tác vụ quét và gửi thông báo nhắc nợ tự động (SN-208)
   * POST /api/invoices/reminders/trigger
   */
  async triggerReminders(force = false): Promise<{
    scannedInvoices: number;
    upcomingRemindersSent: number;
    overdueRemindersSent: number;
    skippedAlreadySent: number;
    failedCount: number;
    details: Array<{
      invoiceCode: string;
      customerName: string;
      type: string;
      status: string;
      email: string;
      note?: string;
    }>;
  }> {
    const res = await apiClient.post('/invoices/reminders/trigger', {}, {
      params: { force: force ? 'true' : undefined },
      timeout: 60000,
    });
    return res.data;
  },

  /**
   * Lấy nhật ký nhắc nợ và cảnh báo quá hạn (SN-208 D)
   * GET /api/invoices/reminders/logs
   */
  async getReminderLogs(): Promise<DebtReminderLog[]> {
    const res = await apiClient.get<DebtReminderLog[]>('/invoices/reminders/logs');
    return res.data;
  },

  /**
   * Lấy thông báo trong ứng dụng cho đại lý (SN-208 A, B)
   * GET /api/invoices/notifications
   */
  async getDebtNotifications(): Promise<InAppDebtNotification[]> {
    const res = await apiClient.get<InAppDebtNotification[]>('/invoices/notifications');
    return res.data;
  },

  /**
   * Đánh dấu đã đọc thông báo trong ứng dụng
   * PATCH /api/invoices/notifications/:id/read
   */
  async markNotificationRead(id: string): Promise<{ success: boolean; id: string }> {
    const res = await apiClient.patch(`/invoices/notifications/${id}/read`);
    return res.data;
  },

  /**
   * Tải hóa đơn PDF chuẩn VAT (SN-207 B)
   * Tự động lấy file PDF nhị phân từ backend và tải file .pdf về thiết bị
   */
  async downloadInvoicePdf(id: string, invoiceCode: string): Promise<void> {
    try {
      const res = await apiClient.get(`/invoices/${id}/pdf`, {
        params: { format: 'pdf' },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Hoa_Don_${invoiceCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lỗi khi tải hóa đơn PDF:', err);
      throw err;
    }
  },

  /**
   * Xem và in hóa đơn trực tiếp trên trình duyệt (SN-207 B)
   */
  async printInvoice(id: string): Promise<void> {
    try {
      const res = await apiClient.get<string>(`/invoices/${id}/pdf`, {
        params: { format: 'html' },
        responseType: 'text',
      });
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(res.data);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 300);
      }
    } catch (err) {
      console.error('Lỗi khi mở bản in hóa đơn:', err);
      throw err;
    }
  },
};
