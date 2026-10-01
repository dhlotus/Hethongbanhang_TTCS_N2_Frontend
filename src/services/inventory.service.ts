import { apiClient } from './api';
import { tokenStorage } from '../utils/token-storage';
import type { AdjustStockPayload, StockAdjustmentResponse } from '../types/products';

export const inventoryService = {
  /**
   * Lấy tổng quan tồn kho
   */
  async getStockOverview(): Promise<
    Array<{
      sku: string;
      name: string;
      stockQuantity: number;
      baseUnit: string;
      warehouse: string;
    }>
  > {
    const token = tokenStorage.getAccessToken();
    if (token && token.startsWith("demo-jwt-")) {
      return [
        {
          sku: "LH-MILK-900G",
          name: "Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g",
          stockQuantity: 340,
          baseUnit: "Lon",
          warehouse: "Kho Tổng Miền Nam - LOHA WH01",
        },
        {
          sku: "LH-NUT-180ML",
          name: "Sữa Hạt Óc Chó Hạnh Nhân Organic 180ml",
          stockQuantity: 1200,
          baseUnit: "Hộp",
          warehouse: "Kho Tổng Miền Nam - LOHA WH01",
        },
      ];
    }

    const response = await apiClient.get('/inventory/stock');
    return response.data;
  },

  /**
   * Điều chỉnh tồn kho hàng hóa (Chỉ ADMIN, WAREHOUSE_KEEPER)
   */
  async adjustStock(payload: AdjustStockPayload): Promise<StockAdjustmentResponse> {
    const token = tokenStorage.getAccessToken();
    if (token && token.startsWith("demo-jwt-")) {
      const user = tokenStorage.getUser();
      const roles = user?.roles || [];
      const canAdjust =
        roles.includes("ADMIN") ||
        roles.includes("WAREHOUSE_KEEPER") ||
        roles.includes("WAREHOUSE_MANAGER");

      if (!canAdjust) {
        throw new Error("Từ chối truy cập: Bạn không có quyền thực hiện chức năng này.");
      }

      return {
        success: true,
        message: `Điều chỉnh tồn kho cho SKU ${payload.productSku} thành công (Demo)`,
        sku: payload.productSku,
        previousQuantity: 340,
        newQuantity: 340 + payload.quantityChange,
        quantityChange: payload.quantityChange,
        reason: payload.reason,
        adjustedBy: user?.id || "demo-user",
        timestamp: new Date().toISOString(),
      };
    }

    const response = await apiClient.put<StockAdjustmentResponse>('/inventory/adjust', payload);
    return response.data;
  },
};
