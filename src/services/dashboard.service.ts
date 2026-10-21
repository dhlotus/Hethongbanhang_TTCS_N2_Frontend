import { apiClient } from './api';

export interface DailySalesTrendItem {
  date: string;
  value: number;
  ordersCount: number;
}

export interface RegionSalesItem {
  region: string;
  value: number;
  ordersCount: number;
  percentage: number;
}

export interface OverdueAgencyItem {
  customerId: string;
  customerName: string;
  customerCode: string;
  overdueAmount: number;
  oldestOverdueDays: number;
  dueDate?: string;
  salesRepName?: string;
  priorityLabel?: string;
}

export interface DashboardMetrics {
  todaySales: number;
  monthlySales: number;
  pendingOrdersCount: number;
  readyToShipOrdersCount: number;
  totalOverdueDebt: number;
  lowStockAlertCount: number;
  salesGrowthPercent?: number;
  prevMonthSamePeriodSales?: number;
}

export interface DashboardOverviewResponse {
  metrics: DashboardMetrics;
  charts: {
    salesTrend: DailySalesTrendItem[];
    salesByRegion: RegionSalesItem[];
    highRiskAgencies: OverdueAgencyItem[];
  };
  executiveInsights: string;
  scopeInfo?: {
    period: string;
    scopeLabel: string;
    timeRange: string;
  };
  executionTimeMs?: number;
  lastUpdated: string;
}

export const dashboardService = {
  async getOverview(params?: {
    timeRange?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<DashboardOverviewResponse> {
    const res = await apiClient.get<DashboardOverviewResponse>('/dashboard/overview', { params });
    return res.data;
  },
};
