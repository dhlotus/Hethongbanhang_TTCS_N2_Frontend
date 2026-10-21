import { apiClient } from './api';
import type { Receipt, ReceiptPrintData } from '../types/receipt';

export interface PaginatedReceiptsResult {
  data: Receipt[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Service Phiếu thu tiền & In/Tải PDF (SN-209)
 */
export const receiptsService = {
  /**
   * Lấy danh sách phiếu thu có phân trang, tìm kiếm và lọc từ Backend
   */
  async getPaginatedReceipts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    customerId?: string;
    paymentMethod?: string;
  }): Promise<PaginatedReceiptsResult> {
    const res = await apiClient.get<PaginatedReceiptsResult>('/receipts', { params });
    return res.data;
  },

  /**
   * Lấy danh sách phiếu thu đã ghi nhận (toàn bộ)
   */
  async getReceipts(params?: { search?: string; customerId?: string; paymentMethod?: string }): Promise<Receipt[]> {
    const res = await apiClient.get<Receipt[] | PaginatedReceiptsResult>('/receipts', { params });
    if (res.data && 'data' in res.data && Array.isArray((res.data as PaginatedReceiptsResult).data)) {
      return (res.data as PaginatedReceiptsResult).data;
    }
    return (res.data as Receipt[]) || [];
  },

  /**
   * Lấy chi tiết phiếu thu theo ID hoặc mã phiếu
   */
  async getReceiptById(id: string): Promise<Receipt> {
    const res = await apiClient.get<Receipt>(`/receipts/${id}`);
    return res.data;
  },

  /**
   * Lấy dữ liệu chuẩn hóa phục vụ In ấn (Đảm bảo đủ 5 trường thông tin theo SN-209)
   */
  async getReceiptPrintData(id: string): Promise<ReceiptPrintData> {
    const res = await apiClient.get<ReceiptPrintData>(`/receipts/${id}/print`);
    return res.data;
  },

  /**
   * Tải trực tiếp file PDF chính thức từ Backend
   */
  async downloadReceiptPdf(id: string, customFilename?: string): Promise<void> {
    const res = await apiClient.get(`/receipts/${id}/pdf`, {
      responseType: 'blob',
    });

    const blob = new Blob([res.data], { type: 'application/pdf' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = customFilename || `phieu-thu-${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },
};
