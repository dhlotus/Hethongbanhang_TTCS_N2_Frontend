import { apiClient } from './api';
import { updateStoredCustomerDebt } from './customer.service';
import type {
  DebtAdjustmentVoucher,
  DebtAdjustmentsListResponse,
  PendingReturnReceipt,
  CreateDebtAdjustmentPayload,
  QueryDebtAdjustmentsParams,
} from '../types/debt-adjustment';

export const debtAdjustmentsService = {
  /**
   * Lấy danh sách chứng từ điều chỉnh giảm trừ công nợ có phân trang và lọc (SN-212)
   * GET /api/debt-adjustments
   */
  async getDebtAdjustments(
    params?: QueryDebtAdjustmentsParams,
  ): Promise<DebtAdjustmentsListResponse> {
    const cleanParams: Record<string, any> = {};
    if (params) {
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
      if (params.search?.trim()) cleanParams.search = params.search.trim();
      if (params.agency_id && params.agency_id !== 'ALL') cleanParams.agency_id = params.agency_id;
      if (params.status && params.status !== 'ALL') cleanParams.status = params.status;
      if (params.start_date) cleanParams.start_date = params.start_date;
      if (params.end_date) cleanParams.end_date = params.end_date;
    }

    try {
      const response = await apiClient.get<DebtAdjustmentsListResponse>(
        '/debt-adjustments',
        { params: cleanParams },
      );
      return response.data;
    } catch {
      // Thử fallback sang endpoint /v1/debt-adjustments nếu cần
      const response = await apiClient.get<DebtAdjustmentsListResponse>(
        '/v1/debt-adjustments',
        { params: cleanParams },
      );
      return response.data;
    }
  },

  /**
   * Xem chi tiết 1 chứng từ điều chỉnh giảm trừ công nợ & bút toán hạch toán
   * GET /api/debt-adjustments/:id
   */
  async getDebtAdjustmentById(id: string): Promise<DebtAdjustmentVoucher> {
    const response = await apiClient.get<DebtAdjustmentVoucher>(
      `/debt-adjustments/${encodeURIComponent(id)}`,
    );
    return response.data;
  },

  /**
   * Lập chứng từ điều chỉnh giảm trừ công nợ khi trả hàng
   * POST /api/debt-adjustments
   */
  async createDebtAdjustment(
    payload: CreateDebtAdjustmentPayload,
  ): Promise<DebtAdjustmentVoucher> {
    const response = await apiClient.post<DebtAdjustmentVoucher>(
      '/debt-adjustments',
      payload,
    );
    const voucher = response.data;
    if (voucher?.agencyId) {
      const amount = Number(voucher.adjustmentAmount || voucher.totalAdjustment || 0);
      if (amount > 0) {
        updateStoredCustomerDebt(voucher.agencyId, -amount);
      }
    }
    return voucher;
  },

  /**
   * Lấy danh sách các phiếu trả hàng đã duyệt (APPROVED) nhưng chưa lập chứng từ
   * GET /api/debt-adjustments/pending-returns
   */
  async getPendingReturns(): Promise<PendingReturnReceipt[]> {
    const response = await apiClient.get<PendingReturnReceipt[]>(
      '/debt-adjustments/pending-returns',
    );
    return response.data;
  },
};
