import { apiClient } from './api';
import type {
  DebtReconciliationReport,
  ReconciliationPreview,
  DebtReconciliationSummary,
  PaginatedDebtReconciliationsResult,
  CreateDebtReconciliationInput,
  RespondDebtReconciliationInput,
} from '../types/debt-reconciliation';

/**
 * Service Lập biên bản đối chiếu công nợ định kỳ (SN-206)
 */
export const debtReconciliationService = {
  /**
   * Lấy danh sách biên bản đối chiếu có phân trang và lọc
   */
  async getReports(params?: {
    page?: number;
    limit?: number;
    agency_id?: string;
    period?: string;
    status?: string;
    search?: string;
  }): Promise<PaginatedDebtReconciliationsResult> {
    const res = await apiClient.get<PaginatedDebtReconciliationsResult>(
      '/debt-reconciliations',
      { params },
    );
    return res.data;
  },

  /**
   * Lấy tổng hợp KPI biên bản
   */
  async getSummary(): Promise<DebtReconciliationSummary> {
    const res = await apiClient.get<DebtReconciliationSummary>(
      '/debt-reconciliations/summary',
    );
    return res.data;
  },

  /**
   * Bóc tách tính toán trước số liệu cho đại lý và kỳ đối chiếu
   */
  async calculatePreview(
    agencyId: string,
    period: string,
  ): Promise<ReconciliationPreview> {
    const res = await apiClient.get<ReconciliationPreview>(
      '/debt-reconciliations/calculate',
      { params: { agency_id: agencyId, period } },
    );
    return res.data;
  },

  /**
   * Tạo mới biên bản đối chiếu
   */
  async createReport(
    input: CreateDebtReconciliationInput,
  ): Promise<DebtReconciliationReport> {
    const res = await apiClient.post<DebtReconciliationReport>(
      '/debt-reconciliations',
      input,
    );
    return res.data;
  },

  /**
   * Lấy chi tiết biên bản theo ID
   */
  async getReportById(id: string): Promise<DebtReconciliationReport> {
    const res = await apiClient.get<DebtReconciliationReport>(
      `/debt-reconciliations/${id}`,
    );
    return res.data;
  },

  /**
   * Tải trực tiếp file PDF biên bản đối chiếu từ Backend
   */
  async downloadPdf(id: string, code?: string): Promise<void> {
    const res = await apiClient.get(`/debt-reconciliations/${id}/pdf`, {
      responseType: 'blob',
    });

    const blob = new Blob([res.data], { type: 'application/pdf' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `bien-ban-doi-chieu-${code || id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * Đại lý xác nhận hoặc phản hồi lệch biên bản
   */
  async respond(
    id: string,
    input: RespondDebtReconciliationInput,
  ): Promise<DebtReconciliationReport> {
    const res = await apiClient.patch<DebtReconciliationReport>(
      `/debt-reconciliations/${id}/response`,
      input,
    );
    return res.data;
  },

  /**
   * Xóa biên bản
   */
  async deleteReport(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete(`/debt-reconciliations/${id}`);
    return res.data;
  },

  /**
   * Đồng bộ dư nợ hiện tại theo số dư cuối kỳ thực tế cho tất cả đại lý (SN-206)
   */
  async syncDebts(period?: string): Promise<{ syncedCount: number; results: any[] }> {
    const res = await apiClient.post<{ syncedCount: number; results: any[] }>(
      '/debt-reconciliations/sync-debts',
      {},
      { params: { period } },
    );
    return res.data;
  },
};
