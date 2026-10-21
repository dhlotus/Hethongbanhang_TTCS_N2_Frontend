import { apiClient } from './api';

/**
 * Chế độ xử lý đơn hàng khi đại lý bị gắn cờ công nợ (SN-204)
 */
export type CreditEnforcementMode = 'BLOCK_ORDER' | 'REQUIRE_APPROVAL';

/**
 * Loại cờ cảnh báo công nợ đại lý (SN-204)
 */
export type AgencyCreditFlag =
  | 'CLEAR'
  | 'EXCEEDED_LIMIT'
  | 'OVERDUE'
  | 'EXCEEDED_AND_OVERDUE';

/**
 * Cấu hình kiểm soát công nợ toàn hệ thống (SN-204)
 */
export interface CreditConfig {
  enforcementMode: CreditEnforcementMode;
  autoFlaggingEnabled: boolean;
  warningThresholdPercentage: number;
  gracePeriodDays: number;
  updatedAt: string;
  updatedBy?: string;
}

/**
 * Dữ liệu cập nhật cấu hình kiểm soát công nợ
 */
export interface UpdateCreditConfigPayload {
  enforcementMode: CreditEnforcementMode;
  autoFlaggingEnabled?: boolean;
  warningThresholdPercentage?: number;
  gracePeriodDays?: number;
}

/**
 * Kết quả đánh giá chi tiết trạng thái cờ công nợ của một đại lý
 */
export interface AgencyCreditEvaluation {
  agencyId: string;
  agencyCode: string;
  agencyName: string;
  isFlagged: boolean;
  flagType: AgencyCreditFlag;
  currentDebt: number;
  creditLimit: number;
  overLimitAmount: number;
  maxDebtDays: number;
  oldestDebtDays: number;
  overdueDays: number;
  overdueAmount: number;
  reasons: string[];
  enforcementMode: CreditEnforcementMode;
  canCreateOrder: boolean;
  requiresApproval: boolean;
  evaluatedAt: string;
}

/**
 * Service gọi API quản lý cấu hình và đánh giá cờ công nợ (SN-204)
 */
export const creditConfigService = {
  /**
   * Lấy cấu hình kiểm soát công nợ toàn hệ thống
   * GET /api/credit-limit/config
   */
  async getConfig(): Promise<CreditConfig> {
    const res = await apiClient.get<CreditConfig>('/credit-limit/config');
    return res.data;
  },

  /**
   * Cập nhật cấu hình kiểm soát công nợ toàn hệ thống
   * PUT /api/credit-limit/config
   */
  async updateConfig(payload: UpdateCreditConfigPayload): Promise<CreditConfig> {
    const res = await apiClient.put<CreditConfig>('/credit-limit/config', payload);
    return res.data;
  },

  /**
   * Đánh giá chi tiết trạng thái cờ công nợ của một đại lý
   * GET /api/credit-limit/evaluation/:agencyId
   */
  async getAgencyCreditEvaluation(agencyId: string): Promise<AgencyCreditEvaluation> {
    const res = await apiClient.get<AgencyCreditEvaluation>(
      `/credit-limit/evaluation/${agencyId}`,
    );
    return res.data;
  },

  /**
   * Kích hoạt quét và đánh giá lại toàn bộ đại lý
   * POST /api/credit-limit/evaluation/trigger-all
   */
  async triggerEvaluateAll(): Promise<AgencyCreditEvaluation[]> {
    const res = await apiClient.post<AgencyCreditEvaluation[]>(
      '/credit-limit/evaluation/trigger-all',
    );
    return res.data;
  },
};
