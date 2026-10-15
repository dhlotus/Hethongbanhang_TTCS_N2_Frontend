/**
 * Enum định nghĩa các phân nhóm tuổi nợ (SN-203)
 */
export enum AgingDebtGroupEnum {
  ALL = 'ALL',
  AGE_0_30 = 'AGE_0_30',
  AGE_31_60 = 'AGE_31_60',
  AGE_61_90 = 'AGE_61_90',
  AGE_OVER_90 = 'AGE_OVER_90',
}

/** Alias phục vụ tương thích ngược */
export const AgingDebtGroup = AgingDebtGroupEnum;
export type AgingDebtGroup = AgingDebtGroupEnum;

/**
 * Nhãn hiển thị tiếng Việt tương ứng với từng nhóm tuổi nợ
 */
export const AGING_DEBT_GROUP_LABELS: Record<AgingDebtGroupEnum, string> = {
  [AgingDebtGroupEnum.ALL]: 'Tất cả',
  [AgingDebtGroupEnum.AGE_0_30]: '0–30 ngày',
  [AgingDebtGroupEnum.AGE_31_60]: '31–60 ngày',
  [AgingDebtGroupEnum.AGE_61_90]: '61–90 ngày',
  [AgingDebtGroupEnum.AGE_OVER_90]: 'Trên 90 ngày',
};

/**
 * Bản ghi công nợ & phân tích tuổi nợ của 1 đại lý
 */
export interface AgentDebtReport {
  agencyId: string;
  agencyCode: string;
  agencyName: string;
  customerGroup: string;
  phone: string;
  region: string;
  salesRepName: string;
  totalReceivable: number;
  totalPaid: number;
  remainingDebt: number;
  age0To30: number;
  age31To60: number;
  age61To90: number;
  ageOver90: number;
  creditLimit: number;
  maxDebtDays: number;
  overdueAmount: number;
  isOverdue: boolean;
  oldestDebtDays: number;
  currentFilterStatus: string;
}

/**
 * Tổng cộng các chỉ số công nợ phục vụ hiển thị chân bảng (Footer)
 */
export interface DebtReportSummary {
  totalAgencies: number;
  totalReceivable: number;
  totalPaid: number;
  remainingDebt: number;
  totalAge0To30: number;
  totalAge31To60: number;
  totalAge61To90: number;
  totalAgeOver90: number;
  totalOverdueAmount: number;
  overdueAgenciesCount: number;
}

/**
 * Tham số tìm kiếm và lọc sổ công nợ
 */
export interface QueryDebtReportParams {
  search?: string;
  isOverdueOnly?: boolean;
  agingGroup?: AgingDebtGroupEnum;
  customerGroup?: string;
  region?: string;
  page?: number;
  limit?: number;
}

/**
 * Cấu trúc phản hồi từ API Sổ công nợ và Tuổi nợ
 */
export interface DebtReportResponse {
  data: AgentDebtReport[];
  summary: DebtReportSummary;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
