import { apiClient } from './api';
import type { Receipt, ReceiptPrintData } from '../types/receipt';

/**
 * Service Phiếu thu tiền & In/Tải PDF (SN-209)
 */
export const receiptsService = {
  /**
   * Lấy danh sách phiếu thu đã ghi nhận
   */
  async getReceipts(params?: { search?: string; customerId?: string }): Promise<Receipt[]> {
    const res = await apiClient.get<Receipt[]>('/receipts', { params });
    return res.data || [];
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
