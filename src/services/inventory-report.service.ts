import { apiClient } from './api';

export type TurnoverStatus = 'ALL' | 'SLOW_MOVING' | 'NORMAL' | 'FAST_MOVING' | 'DEAD_STOCK';

export interface InventoryTurnoverSkuItem {
  productId: string;
  sku: string;
  productName: string;
  categoryId?: number;
  categoryName: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  baseUnit: string;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  costPrice: number;
  inventoryValue: number;
  outboundQuantity: number;
  outboundValue: number;
  dailyOutbound: number;
  turnoverRate: number;
  daysOfInventory: number;
  lastOutboundDate?: string;
  turnoverStatus: 'FAST_MOVING' | 'NORMAL' | 'SLOW_MOVING' | 'DEAD_STOCK';
  turnoverStatusLabel: string;
  isSlowMoving: boolean;
  holdingCapitalWarning?: string;
}

export interface InventoryValueBreakdown {
  id: string;
  code: string;
  name: string;
  totalQuantity: number;
  totalValue: number;
  percentage: number;
  skuCount: number;
  slowMovingSkuCount: number;
  slowMovingValue: number;
}

export interface InventoryTurnoverReportResponse {
  generatedAt: string;
  calculationDays: number;
  fromDate?: string;
  toDate?: string;
  summary: {
    totalSkus: number;
    totalPhysicalQuantity: number;
    totalAvailableQuantity: number;
    totalInventoryValue: number;
    slowMovingCount: number;
    slowMovingValue: number;
    averageDaysOfInventory: number;
    overallTurnoverRate: number;
  };
  valueByWarehouse: InventoryValueBreakdown[];
  valueByCategory: InventoryValueBreakdown[];
  items: InventoryTurnoverSkuItem[];
}

export interface QueryInventoryReportParams {
  warehouseId?: string;
  categoryId?: string;
  turnoverStatus?: TurnoverStatus;
  days?: number | string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  sortBy?: 'inventoryValue' | 'daysOfInventory' | 'physicalQuantity' | 'turnoverRate';
  sortOrder?: 'ASC' | 'DESC';
}

export const inventoryReportService = {
  /**
   * Lấy báo cáo tồn kho & vòng quay hàng (SN-219)
   */
  async getInventoryReport(
    params?: QueryInventoryReportParams,
  ): Promise<InventoryTurnoverReportResponse> {
    const res = await apiClient.get<InventoryTurnoverReportResponse>('/reports/inventory', {
      params,
    });
    return res.data;
  },

  /**
   * Xuất báo cáo tồn kho & vòng quay hàng ra Excel (.xlsx) chuẩn nghiệp vụ
   */
  async exportInventoryReportExcel(params?: QueryInventoryReportParams): Promise<void> {
    const res = await apiClient.get('/reports/inventory/export-excel', {
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
    link.download = `Bao_cao_ton_kho_vong_quay_${dateStr}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
