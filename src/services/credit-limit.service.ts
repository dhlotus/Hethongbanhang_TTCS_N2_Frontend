import { apiClient } from './api';
import type {
  CreditLimit,
  CreditLimitLog,
  CreditLimitStats,
  PaginatedCreditLimitResponse,
  QueryCreditLimitParams,
  UpdateCreditLimitPayload,
  UpdateCreditStatusPayload,
} from '../types/credit-limit.type';

/**
 * Service Quản lý và Khai báo Hạn mức Công nợ Đại lý (SN-34)
 * Gọi các API endpoint bằng Axios (apiClient)
 */
export const creditLimitService = {
  /**
   * Lấy danh sách hạn mức công nợ kèm tìm kiếm và phân trang
   * GET /api/credit-limit
   */
  async getCreditLimits(params?: QueryCreditLimitParams): Promise<PaginatedCreditLimitResponse> {
    const res = await apiClient.get<PaginatedCreditLimitResponse>('/credit-limit', {
      params,
    });
    return res.data;
  },

  /**
   * Lấy số liệu thống kê tổng thể hạn mức công nợ toàn hệ thống
   * GET /api/credit-limit/stats
   */
  async getCreditLimitStats(): Promise<CreditLimitStats> {
    const res = await apiClient.get<CreditLimitStats>('/credit-limit/stats');
    return res.data;
  },

  /**
   * Lấy chi tiết hạn mức công nợ của một đại lý
   * GET /api/credit-limit/:agencyId
   */
  async getCreditLimitById(agencyId: string): Promise<CreditLimit> {
    const res = await apiClient.get<CreditLimit>(`/credit-limit/${agencyId}`);
    return res.data;
  },

  /**
   * Lấy lịch sử các lần điều chỉnh hạn mức công nợ của đại lý (CreditLimitLog)
   * GET /api/credit-limit/:agencyId/logs
   */
  async getCreditLimitLogs(agencyId: string): Promise<CreditLimitLog[]> {
    const res = await apiClient.get<CreditLimitLog[]>(`/credit-limit/${agencyId}/logs`);
    return res.data;
  },

  /** Alias phục vụ tương thích */
  async getCreditLimitHistory(agencyId: string): Promise<CreditLimitLog[]> {
    return this.getCreditLimitLogs(agencyId);
  },

  /**
   * Khai báo / Cập nhật hạn mức công nợ đại lý
   * PUT /api/credit-limit/:agencyId
   */
  async updateCreditLimit(
    agencyId: string,
    payload: UpdateCreditLimitPayload
  ): Promise<CreditLimit> {
    const res = await apiClient.put<CreditLimit>(`/credit-limit/${agencyId}`, payload);
    return res.data;
  },

  /**
   * Khóa hoặc Mở khóa hạn mức tín dụng đại lý
   * PATCH /api/credit-limit/:agencyId/status
   */
  async updateCreditStatus(
    agencyId: string,
    payload: UpdateCreditStatusPayload
  ): Promise<CreditLimit> {
    const res = await apiClient.patch<CreditLimit>(`/credit-limit/${agencyId}/status`, payload);
    return res.data;
  },
};
