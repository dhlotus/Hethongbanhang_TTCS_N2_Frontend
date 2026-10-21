/**
 * Enum định nghĩa các phân nhóm tuổi nợ (SN-203 & SN-230)
 * Các dải tuổi nợ KHÔNG CHỒNG LẤN:
 * - CURRENT: Chưa quá hạn (trong hạn)
 * - AGE_1_30: Quá hạn 1–30 ngày
 * - AGE_31_60: Quá hạn 31–60 ngày
 * - AGE_61_90: Quá hạn 61–90 ngày
 * - AGE_OVER_90: Quá hạn trên 90 ngày
 */
export enum AgingDebtGroupEnum {
  ALL = 'ALL',
  CURRENT = 'CURRENT',
  AGE_0_30 = 'AGE_0_30', // Alias tương thích ngược
  AGE_1_30 = 'AGE_1_30',
  AGE_31_60 = 'AGE_31_60',
  AGE_61_90 = 'AGE_61_90',
  AGE_OVER_90 = 'AGE_OVER_90',
}

export const AgingDebtGroup = AgingDebtGroupEnum;
export type AgingDebtGroup = AgingDebtGroupEnum;

/**
 * Nhãn hiển thị tiếng Việt tương ứng với từng nhóm tuổi nợ
 */
export const AGING_DEBT_GROUP_LABELS: Record<string, string> = {
  [AgingDebtGroupEnum.ALL]: 'Tất cả nhóm tuổi nợ',
  [AgingDebtGroupEnum.CURRENT]: 'Chưa quá hạn (Trong hạn)',
  [AgingDebtGroupEnum.AGE_0_30]: 'Chưa quá hạn (0–30 ngày)',
  [AgingDebtGroupEnum.AGE_1_30]: 'Quá hạn 1–30 ngày',
  [AgingDebtGroupEnum.AGE_31_60]: 'Quá hạn 31–60 ngày',
  [AgingDebtGroupEnum.AGE_61_90]: 'Quá hạn 61–90 ngày',
  [AgingDebtGroupEnum.AGE_OVER_90]: 'Quá hạn trên 90 ngày',
};

/**
 * Phân cấp mức độ ưu tiên xử lý thu hồi nợ (SN-230)
 */
export enum DebtPriorityLevelEnum {
  ALL = 'ALL',
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  SETTLED = 'SETTLED',
}

export const DEBT_PRIORITY_LABELS: Record<string, string> = {
  [DebtPriorityLevelEnum.ALL]: 'Tất cả mức ưu tiên',
  [DebtPriorityLevelEnum.CRITICAL]: 'Khẩn cấp (Ưu tiên số 1)',
  [DebtPriorityLevelEnum.HIGH]: 'Cao (Cần đôn đốc)',
  [DebtPriorityLevelEnum.MEDIUM]: 'Trung bình (Theo dõi)',
  [DebtPriorityLevelEnum.LOW]: 'Bình thường (Trong hạn)',
  [DebtPriorityLevelEnum.SETTLED]: 'Đã tất toán (Hết nợ)',
};

export const DEBT_PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: 'bg-rose-50 text-rose-700', text: 'text-rose-700', border: 'border-rose-200' },
  HIGH: { bg: 'bg-amber-50 text-amber-700', text: 'text-amber-700', border: 'border-amber-200' },
  MEDIUM: { bg: 'bg-yellow-50 text-yellow-800', text: 'text-yellow-800', border: 'border-yellow-200' },
  LOW: { bg: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-700', border: 'border-emerald-200' },
  SETTLED: { bg: 'bg-slate-50 text-slate-600', text: 'text-slate-600', border: 'border-slate-200' },
};

/**
 * Bản ghi công nợ & phân tích tuổi nợ của 1 đại lý (SN-230)
 */
export interface AgentDebtReport {
  agencyId: string;
  agencyCode: string;
  agencyName: string;
  customerGroup: string;
  phone: string;
  region: string;
  salesRepId?: string;
  salesRepName: string;
  creditLimit: number;
  maxDebtDays: number;
  asOfDate?: string;

  totalReceivable: number;
  totalPaid: number;
  remainingDebt: number;

  currentInTerm: number;
  age1To30: number;
  age31To60: number;
  age61To90: number;
  ageOver90: number;
  age0To30?: number; // Tương thích ngược

  overdueAmount: number;
  isOverdue: boolean;
  oldestDebtDays: number;
  oldestOverdueDays?: number;
  currentFilterStatus: string;

  priorityLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SETTLED';
  priorityLabel?: string;
  priorityReason?: string;
}

/**
 * Thống kê công nợ theo nhân viên kinh doanh phụ trách (SN-230)
 */
export interface SalesRepDebtSummary {
  salesRepName: string;
  agencyCount: number;
  totalReceivable: number;
  totalPaid: number;
  remainingDebt: number;
  overdueAmount: number;
  criticalAgenciesCount: number;
}

/**
 * Tổng cộng các chỉ số công nợ phục vụ hiển thị chân bảng (Footer) & KPI cards (SN-230)
 */
export interface DebtReportSummary {
  asOfDate?: string;
  totalAgencies: number;
  totalReceivable: number;
  totalPaid: number;
  remainingDebt: number;
  totalCurrentInTerm?: number;
  totalAge0To30?: number;
  totalAge1To30?: number;
  totalAge31To60: number;
  totalAge61To90: number;
  totalAgeOver90: number;
  totalOverdueAmount: number;
  overdueAgenciesCount: number;
  inTermAgenciesCount?: number;
  criticalAgenciesCount?: number;
  highPriorityCount?: number;
  mediumPriorityCount?: number;
  normalPriorityCount?: number;
  salesRepSummary?: SalesRepDebtSummary[];
}

/**
 * Tham số tìm kiếm và lọc sổ công nợ theo tuổi nợ (SN-230)
 */
export interface QueryDebtReportParams {
  asOfDate?: string; // Ngày chốt báo cáo YYYY-MM-DD
  agencyId?: string;
  salesRepName?: string;
  salesRepId?: string;
  priority?: string;
  search?: string;
  isOverdueOnly?: boolean;
  isOverdue?: boolean;
  debtStatus?: 'IN_TERM' | 'OVERDUE' | 'ALL';
  agingGroup?: AgingDebtGroupEnum | string;
  customerGroup?: string;
  region?: string;
  page?: number;
  limit?: number;
  sortBy?: 'oldestDebtDays' | 'remainingDebt' | 'overdueAmount' | 'agencyName' | 'code' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Cấu trúc thông tin hóa đơn thực tế của đại lý theo dải tuổi nợ
 */
export interface AgencyInvoice {
  id: string;
  invoiceCode: string;
  orderCode: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  daysOld: number;
  overdueDays: number;
  isOverdue: boolean;
  agingGroup: AgingDebtGroupEnum;
  agingLabel: string;
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
}

/**
 * Cấu trúc phản hồi từ API Sổ công nợ và Tuổi nợ (SN-230)
 */
export interface DebtReportResponse {
  data: AgentDebtReport[];
  summary: DebtReportSummary;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SN-231: SỔ CHI TIẾT CÔNG NỢ ĐẠI LÝ (RECEIVABLE LEDGER STATEMENT)
// ─────────────────────────────────────────────────────────────────────────────

export interface DebtLedgerAgencyInfo {
  id: string;
  code: string;
  name: string;
  taxCode: string;
  phone: string;
  email: string;
  address: string;
  creditLimit: number;
  maxDebtDays: number;
  salesRepName: string;
  region: string;
}

export interface DebtLedgerPeriodInfo {
  fromDate: string;
  toDate: string;
}

export interface DebtLedgerTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  documentCode: string;
  documentType: 'INVOICE' | 'PAYMENT' | 'RETURN' | 'ADJUSTMENT';
  documentTypeLabel: string;
  description: string;
  debit: number; // Phát sinh tăng (+)
  credit: number; // Phát sinh giảm (-)
  runningBalance: number; // Số dư lũy kế
  status: 'CONFIRMED' | 'PAID' | 'PARTIAL' | 'CANCELLED';
  dueDate?: string;
  referenceCode?: string;
  createdAt?: string;
}

export interface DebtLedgerStatement {
  agency: DebtLedgerAgencyInfo;
  period: DebtLedgerPeriodInfo;
  openingBalance: number; // Số dư đầu kỳ
  totalDebit: number; // Tổng phát sinh tăng
  totalCredit: number; // Tổng phát sinh giảm
  closingBalance: number; // Số dư cuối kỳ = Đầu kỳ + Tăng - Giảm
  isBalanced: boolean;
  transactions: DebtLedgerTransaction[];
  generatedAt: string;
}

export interface QueryDebtLedgerParams {
  agencyId: string;
  fromDate?: string;
  toDate?: string;
  documentType?: 'ALL' | 'INVOICE' | 'PAYMENT' | 'RETURN' | 'ADJUSTMENT';
  search?: string;
}

export interface SalesRepOption {
  id: string;
  name: string;
}

export interface AgencyOption {
  id: string;
  code: string;
  name: string;
  phone: string;
  salesRepName: string;
  creditLimit: number;
  maxDebtDays: number;
}
