import { apiClient } from './api';

export type SalesTargetType = 'EMPLOYEE' | 'REGION';

export interface SalesTargetItem {
  id: string;
  period: string; // YYYY-MM
  targetType: SalesTargetType;
  targetId: string;
  targetName: string;
  targetAmount: number;
  note?: string;
  isLocked: boolean;
  actualAmount: number;
  completionRate: number | null;
  shortageOrExcess: number;
  isExceeded: boolean;
  ordersCount: number;
  statusLabel: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesTargetsResponse {
  items: SalesTargetItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    totalEmployeeTarget: number;
    totalEmployeeActual: number;
    employeeCompletionRate: number | null;
    totalRegionTarget: number;
    totalRegionActual: number;
    regionCompletionRate: number | null;
    period: string;
    isPeriodLocked: boolean;
  };
  lastUpdated: string;
}

export interface MyProgressResponse {
  item: SalesTargetItem;
  period: string;
  isLocked: boolean;
  lastUpdated: string;
}

export interface ContributingOrder {
  id: string;
  orderCode: string;
  customerName: string;
  createdAt: string;
  grandTotal: number;
  status: string;
}

export interface SalesTargetDetailResponse {
  item: SalesTargetItem;
  contributingOrders: ContributingOrder[];
  logs: AdjustmentLogItem[];
}

export interface AdjustmentLogItem {
  id: string;
  targetId: string;
  period: string;
  targetType: SalesTargetType;
  targetName: string;
  oldAmount: number;
  newAmount: number;
  reason: string;
  adjustedById: string;
  adjustedByName: string;
  adjustedAt: string;
}

export interface CreateSalesTargetInput {
  period: string;
  targetType: SalesTargetType;
  targetId: string;
  targetName: string;
  targetAmount: number;
  note?: string;
}

export interface UpdateSalesTargetInput {
  targetAmount: number;
  note?: string;
  reason?: string;
}

export interface QuerySalesTargetsParams {
  period?: string;
  targetType?: SalesTargetType;
  targetId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const salesTargetsService = {
  /**
   * Lấy danh sách chỉ tiêu và tiến độ thực tế (Quản lý xem hết, Sales Rep chỉ xem của mình)
   */
  async getSalesTargets(params?: QuerySalesTargetsParams): Promise<SalesTargetsResponse> {
    const res = await apiClient.get<SalesTargetsResponse>('/sales-targets', { params });
    return res.data;
  },

  /**
   * Lấy chi tiết một chỉ tiêu cùng danh sách đơn hàng ghi nhận thực tế và lịch sử điều chỉnh
   */
  async getSalesTargetDetail(id: string): Promise<SalesTargetDetailResponse> {
    const res = await apiClient.get<SalesTargetDetailResponse>(`/sales-targets/${id}`);
    return res.data;
  },

  /**
   * Lấy tiến độ cá nhân của nhân viên đang đăng nhập (Mobile friendly)
   */
  async getMyProgress(period?: string): Promise<MyProgressResponse> {
    const res = await apiClient.get<MyProgressResponse>('/sales-targets/my-progress', {
      params: { period },
    });
    return res.data;
  },

  /**
   * Đặt chỉ tiêu doanh số mới
   */
  async createSalesTarget(data: CreateSalesTargetInput): Promise<SalesTargetItem> {
    const res = await apiClient.post<SalesTargetItem>('/sales-targets', data);
    return res.data;
  },

  /**
   * Cập nhật mức chỉ tiêu (bắt buộc kèm lý do nếu kỳ đã kết thúc/khóa)
   */
  async updateSalesTarget(id: string, data: UpdateSalesTargetInput): Promise<SalesTargetItem> {
    const res = await apiClient.put<SalesTargetItem>(`/sales-targets/${id}`, data);
    return res.data;
  },

  /**
   * Lấy lịch sử nhật ký điều chỉnh chỉ tiêu
   */
  async getAdjustmentLogs(id: string): Promise<AdjustmentLogItem[]> {
    const res = await apiClient.get<AdjustmentLogItem[]>(`/sales-targets/${id}/logs`);
    return res.data;
  },
};
