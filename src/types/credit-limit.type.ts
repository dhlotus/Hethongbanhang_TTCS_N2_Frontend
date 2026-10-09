/**
 * Trạng thái hạn mức công nợ đại lý (CreditStatus - SN-34)
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
 * Điều khoản thanh toán công nợ tiêu chuẩn
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
 * Interface cho thông tin hạn mức công nợ đại lý (AgencyCreditLimit - SN-34)
 */
export interface CreditLimit {
  id: string;
  agencyId: string;
  agencyCode: string;
  agencyName: string;

  /** Aliases hỗ trợ linh hoạt */
  customerId?: string;
  customerCode?: string;
  customerName?: string;

  customerGroup?: string;
  phone?: string;
  email?: string;
  region?: string;
  salesRepId?: string;
  salesRepName?: string;

  /** Hạn mức tiền tối đa (VND) */
  creditLimit: number;

  /** Số ngày nợ tối đa cho phép */
  maxDebtDays: number;

  /** Dư nợ hiện hành của đại lý (VND) */
  currentDebt: number;

  /** Hạn mức tín dụng khả dụng còn lại (VND) */
  availableCredit: number;

  /** Tỷ lệ sử dụng hạn mức công nợ (%) */
  debtUsagePercentage: number;

  /** Điều khoản thanh toán (NET_30, NET_45, COD...) */
  paymentTerms: string;

  /** Hạn mức cấp thêm tạm thời (Mùa vụ) */
  temporaryCreditLimit?: number;

  /** Ngày hết hạn của hạn mức tạm thời */
  temporaryLimitExpiry?: string;

  /** Cho phép tạo đơn hàng vượt hạn mức khi có duyệt đơn */
  allowOverLimitOrder?: boolean;

  /** Trạng thái hạn mức tín dụng */
  status: CreditStatus;

  /** Lý do khóa hạn mức (nếu bị khóa) */
  lockReason?: string;

  /** Thời điểm điều chỉnh gần nhất */
  lastAdjustedAt?: string;

  /** Người thực hiện điều chỉnh gần nhất */
  lastAdjustedBy?: string;

  createdAt: string;
  updatedAt: string;
}

/**
 * Interface cho Lịch sử thay đổi hạn mức công nợ (CreditLimitLog - SN-34)
 */
export interface CreditLimitLog {
  id: string;

  /** ID đại lý */
  agencyId: string;

  /** Mã đại lý */
  agencyCode: string;

  /** Tên đại lý */
  agencyName: string;

  /** Hạn mức tiền tối đa cũ (VND) */
  oldCreditLimit: number;

  /** Hạn mức tiền tối đa mới (VND) */
  newCreditLimit: number;

  /** Số ngày nợ tối đa cũ */
  oldMaxDebtDays: number;

  /** Số ngày nợ tối đa mới */
  newMaxDebtDays: number;

  /** Điều khoản thanh toán cũ */
  oldPaymentTerms?: string;

  /** Điều khoản thanh toán mới */
  newPaymentTerms?: string;

  /** Hạn mức tạm thời cũ */
  oldTemporaryLimit?: number;

  /** Hạn mức tạm thời mới */
  newTemporaryLimit?: number;

  /** Lý do thay đổi hạn mức (BẮT BUỘC) */
  reason: string;

  /** Người thực hiện điều chỉnh */
  performedBy: string;

  /** Vai trò người thực hiện */
  performedByRole: string;

  /** Thời gian thực hiện */
  performedAt: string;

  /** Aliases hỗ trợ tương thích */
  adjustedBy?: string;
  adjustedRole?: string;
  createdAt?: string;
}

/**
 * DTO / Payload cập nhật hạn mức công nợ đại lý (SN-34)
 * Validate: Hạn mức tiền, Số ngày nợ, và BẮT BUỘC có lý do thay đổi
 */
export interface UpdateCreditLimitPayload {
  /** Hạn mức tiền tối đa (VND) */
  creditLimit: number;

  /** Số ngày nợ tối đa */
  maxDebtDays: number;

  /** Lý do thay đổi hạn mức (BẮT BUỘC) */
  reason: string;

  /** Điều khoản thanh toán */
  paymentTerms?: string;

  /** Hạn mức tạm thời */
  temporaryCreditLimit?: number;

  /** Ngày hết hạn hạn mức tạm thời */
  temporaryLimitExpiry?: string;

  /** Cho phép vượt hạn mức */
  allowOverLimitOrder?: boolean;
}

/**
 * Payload Khóa / Mở khóa hạn mức tín dụng
 */
export interface UpdateCreditStatusPayload {
  status: CreditStatus;
  reason: string;
}

/**
 * Thống kê tổng thể hạn mức công nợ
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
 * Tham số tìm kiếm và phân trang
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
 * Kết quả phân trang danh sách hạn mức
 */
export interface PaginatedCreditLimitResponse {
  data: CreditLimit[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Aliases phục vụ tương thích */
export type CreditLimitItem = CreditLimit;
export type CreditLimitHistory = CreditLimitLog;
