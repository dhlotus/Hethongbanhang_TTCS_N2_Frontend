import { apiClient } from './api';
import type {
  CreditLimitHistory,
  CreditLimitItem,
  CreditLimitStats,
  PaginatedCreditLimitResponse,
  QueryCreditLimitParams,
  UpdateCreditLimitPayload,
  UpdateCreditStatusPayload,
} from '../types/credit-limit';

/**
 * Service Quản lý và Khai báo Hạn mức Công nợ Đại lý (SN-34)
 */
export const creditLimitService = {
  /**
   * Lấy danh sách hạn mức công nợ kèm tìm kiếm và phân trang
   */
  async getCreditLimits(
    params?: QueryCreditLimitParams,
  ): Promise<PaginatedCreditLimitResponse> {
    const res = await apiClient.get<PaginatedCreditLimitResponse>(
      '/credit-limit',
      {
        params,
      },
    );
    return res.data;
  },

  /**
   * Lấy số liệu thống kê tổng thể hạn mức công nợ toàn hệ thống
   */
  async getCreditLimitStats(): Promise<CreditLimitStats> {
    const res = await apiClient.get<CreditLimitStats>('/credit-limit/stats');
    return res.data;
  },

  /**
   * Lấy chi tiết hạn mức công nợ của một đại lý
   */
  async getCreditLimitById(customerId: string): Promise<CreditLimitItem> {
    const res = await apiClient.get<CreditLimitItem>(
      `/credit-limit/${customerId}`,
    );
    return res.data;
  },

  /**
   * Lấy lịch sử các lần điều chỉnh hạn mức công nợ của đại lý
   */
  async getCreditLimitHistory(
    customerId: string,
  ): Promise<CreditLimitHistory[]> {
    const res = await apiClient.get<CreditLimitHistory[]>(
      `/credit-limit/${customerId}/history`,
    );
    return res.data;
  },

  /**
   * Khai báo / Cập nhật hạn mức công nợ đại lý
   */
  async updateCreditLimit(
    customerId: string,
    payload: UpdateCreditLimitPayload,
  ): Promise<CreditLimitItem> {
    const res = await apiClient.put<CreditLimitItem>(
      `/credit-limit/${customerId}`,
      payload,
    );
    return res.data;
  },

  /**
   * Khóa hoặc Mở khóa hạn mức tín dụng đại lý
   */
  async updateCreditStatus(
    customerId: string,
    payload: UpdateCreditStatusPayload,
  ): Promise<CreditLimitItem> {
    const res = await apiClient.patch<CreditLimitItem>(
      `/credit-limit/${customerId}/status`,
      payload,
    );
    return res.data;
  },
};
