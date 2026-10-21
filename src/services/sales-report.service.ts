import { apiClient } from './api';

export type SalesReportGroupBy =
  | 'sales_rep'
  | 'region'
  | 'customer'
  | 'category'
  | 'product';

export interface SalesReportRowItem {
  id: string;
  code: string;
  name: string;
  unit?: string;
  categoryName?: string;
  ordersCount: number;
  quantity: number;
  currentSales: number;
  previousSales: number;
  diffAmount: number;
  growthRatePercent: number | null;
  isNewSales?: boolean;
  cogs?: number;
  grossProfit?: number;
  grossMarginPercent?: number;
}

export interface MultidimensionalSalesReportResponse {
  groupBy: SalesReportGroupBy;
  groupByLabel: string;
  currentRange: {
    startDate: string;
    endDate: string;
    label: string;
  };
  previousRange: {
    startDate: string;
    endDate: string;
    label: string;
  };
  hasProfitAccess: boolean;
  items: SalesReportRowItem[];
  summary: {
    totalOrdersCount: number;
    totalQuantity: number;
    totalCurrentSales: number;
    totalPreviousSales: number;
    totalDiffAmount: number;
    totalGrowthRatePercent: number | null;
    totalCogs?: number;
    totalGrossProfit?: number;
    totalGrossMarginPercent?: number;
  };
  generatedAt: string;
}

export interface QuerySalesReportParams {
  groupBy?: SalesReportGroupBy;
  timeRange?: string;
  startDate?: string;
  endDate?: string;
  salesRepId?: string;
  region?: string;
  customerId?: string;
  categoryId?: string;
  productId?: string;
  search?: string;
}

export const salesReportService = {
  /**
   * Lấy dữ liệu báo cáo doanh số nhiều chiều
   */
  async getMultidimensionalSalesReport(
    params?: QuerySalesReportParams,
  ): Promise<MultidimensionalSalesReportResponse> {
    const res = await apiClient.get<MultidimensionalSalesReportResponse>(
      '/reports/sales/multidimensional',
      { params },
    );
    return res.data;
  },

  /**
   * Tải file Excel (.xlsx) báo cáo doanh số nhiều chiều
   */
  async exportMultidimensionalSalesExcel(params?: QuerySalesReportParams): Promise<void> {
    const res = await apiClient.get('/reports/sales/export-excel', {
      params,
      responseType: 'blob',
    });

    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `Bao_cao_doanh_so_${params?.groupBy || 'sales_rep'}_${dateStr}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
