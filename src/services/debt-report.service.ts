import { apiClient } from './api';
import type {
  DebtReportResponse,
  QueryDebtReportParams,
} from '../types/debt-report.type';

/**
 * Service gọi API Sổ công nợ và Phân tích tuổi nợ đại lý (SN-203)
 */
export const debtReportService = {
  /**
   * Lấy danh sách sổ công nợ theo đại lý kèm phân tích tuổi nợ & summary
   * GET /api/debt-report
   */
  async getDebtReport(params?: QueryDebtReportParams): Promise<DebtReportResponse> {
    const res = await apiClient.get<DebtReportResponse>('/debt-report', {
      params,
    });
    return res.data;
  },

  /**
   * Xuất báo cáo sổ công nợ ra file Excel (.xlsx) dưới dạng nhị phân Blob
   * GET /api/debt-report/export
   */
  async exportDebtReportToExcel(params?: QueryDebtReportParams): Promise<Blob> {
    const res = await apiClient.get('/debt-report/export', {
      params,
      responseType: 'blob',
    });
    return res.data as Blob;
  },
};
