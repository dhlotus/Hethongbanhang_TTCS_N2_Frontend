/**
 * Trạng thái hạn mức công nợ đại lý (SN-34)
 */
export enum CreditStatus {
  /** Hoạt động an toàn (Dưới 80% hạn mức) */
  NORMAL = 'NORMAL',
  /** Cảnh báo chạm ngưỡng (Từ 80% đến 100% hạn mức) */
  WARNING = 'WARNING',
  /** Vượt quá hạn mức công nợ cho phép (> 100%) */
  EXCEEDED = 'EXCEEDED',
  /** Bị khóa công nợ (Tạm dừng phát sinh đơn công nợ) */
  BLOCKED = 'BLOCKED',
}

/**
 * Điều khoản thanh toán công nợ tiêu chuẩn (SN-34)
 */
export enum PaymentTerm {
  COD = 'COD',
  NET_15 = 'NET_15',
  NET_30 = 'NET_30',
  NET_45 = 'NET_45',
  NET_60 = 'NET_60',
  EOM_30 = 'EOM_30',
}

/**
 * Kiểu dữ liệu Đại lý kèm Hạn mức Công nợ (SN-34)
 */
export interface CreditLimitItem {
  id: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  customerGroup: string;
  phone: string;
  email?: string;
  region?: string;
  salesRepId?: string;
  salesRepName?: string;
  creditLimit: number;
  currentDebt: number;
  availableCredit: number;
  debtUsagePercentage: number;
  maxDebtDays: number;
  paymentTerms: string;
  temporaryCreditLimit: number;
  temporaryLimitExpiry?: string;
  allowOverLimitOrder: boolean;
  status: CreditStatus;
  lockReason?: string;
  lastAdjustedAt?: string;
  lastAdjustedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Kiểu dữ liệu Lịch sử Điều chỉnh Hạn mức Công nợ (SN-34)
 */
export interface CreditLimitHistory {
  id: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  oldCreditLimit: number;
  newCreditLimit: number;
  oldMaxDebtDays: number;
  newMaxDebtDays: number;
  oldPaymentTerms: string;
  newPaymentTerms: string;
  oldTemporaryLimit: number;
  newTemporaryLimit: number;
  reason: string;
  adjustedBy: string;
  adjustedRole: string;
  createdAt: string;
}

/**
 * Kiểu dữ liệu Thống kê Hạn mức Công nợ Toàn hệ thống (SN-34)
 */
export interface CreditLimitStats {
  totalCreditLimit: number;
  totalCurrentDebt: number;
  totalAvailableCredit: number;
  totalCustomers: number;
  normalCount: number;
  warningCount: number;
  exceededCount: number;
  blockedCount: number;
  averageUsageRate: number;
}

/**
 * Payload Khai báo / Cập nhật Hạn mức Công nợ (SN-34)
 */
export interface UpdateCreditLimitPayload {
  creditLimit: number;
  maxDebtDays?: number;
  paymentTerms?: string;
  temporaryCreditLimit?: number;
  temporaryLimitExpiry?: string;
  allowOverLimitOrder?: boolean;
  reason: string;
}

/**
 * Payload Khóa / Mở khóa Hạn mức Công nợ (SN-34)
 */
export interface UpdateCreditStatusPayload {
  status: CreditStatus;
  reason: string;
}

/**
 * Tham số tìm kiếm và phân trang hạn mức công nợ (SN-34)
 */
export interface QueryCreditLimitParams {
  search?: string;
  status?: CreditStatus;
  customerGroup?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Kết quả phân trang danh sách hạn mức công nợ (SN-34)
 */
export interface PaginatedCreditLimitResponse {
  data: CreditLimitItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
