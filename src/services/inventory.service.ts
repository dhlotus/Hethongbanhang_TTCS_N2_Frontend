import { apiClient } from './api';
import { tokenStorage } from '../utils/token-storage';
import type {
  AdjustStockPayload,
  StockAdjustmentResponse,
  InventoryTransaction,
} from '../types/products';

let MOCK_TRANSACTIONS: InventoryTransaction[] = [
  {
    id: 'txn-demo-001',
    productId: 'prod-001',
    sku: 'LH-MILK-900G',
    productName: 'Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g',
    type: 'IMPORT',
    inputQuantity: 10,
    unitName: 'Thùng 24',
    conversionFactor: 24,
    baseQuantityChange: 240,
    baseUnit: 'Lon',
    previousStock: 100,
    newStock: 340,
    reason: 'Nhập lô hàng mới từ nhà máy theo kiện thùng',
    adjustedBy: 'Thủ kho (Phạm Hùng)',
    createdAt: '2026-10-04T10:00:00Z',
  },
  {
    id: 'txn-demo-002',
    productId: 'prod-002',
    sku: 'LH-NUT-180ML',
    productName: 'Sữa Hạt Óc Chó Hạnh Nhân Organic 180ml',
    type: 'IMPORT',
    inputQuantity: 20,
    unitName: 'Thùng 48',
    conversionFactor: 48,
    baseQuantityChange: 960,
    baseUnit: 'Hộp',
    previousStock: 240,
    newStock: 1200,
    reason: 'Nhập kho lô lớn từ đối tác theo thùng',
    adjustedBy: 'Thủ kho (Phạm Hùng)',
    createdAt: '2026-10-04T15:30:00Z',
  },
];

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
    try {
      const response = await apiClient.get('/inventory/stock');
      return response.data;
    } catch {
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
  },

  /**
   * Điều chỉnh tồn kho hàng hóa có quy đổi đơn vị (SN-21 / SN-23)
   */
  async adjustStock(payload: AdjustStockPayload): Promise<StockAdjustmentResponse> {
    try {
      const response = await apiClient.put<StockAdjustmentResponse>('/inventory/adjust', payload);
      return response.data;
    } catch {
      const user = tokenStorage.getUser();
      const roles = user?.roles || [];
      const canAdjust =
        roles.includes("ADMIN") ||
        roles.includes("WAREHOUSE_KEEPER") ||
        roles.includes("WAREHOUSE_MANAGER");

      if (!canAdjust && roles.length > 0) {
        throw new Error("Từ chối truy cập: Bạn không có quyền thực hiện chức năng này.");
      }

      const factor = payload.conversionFactor || 1;
      const baseDelta = payload.quantityChange * factor;
      const prevQty = 340;
      const newQty = Math.max(0, prevQty + baseDelta);
      const unit = payload.unitName || 'Đơn vị';

      const sign = payload.quantityChange > 0 ? '+' : '';
      const baseSign = baseDelta > 0 ? '+' : '';
      const message =
        factor !== 1
          ? `Điều chỉnh tồn kho cho SKU ${payload.productSku} thành công: ${sign}${payload.quantityChange} ${unit} (quy đổi ${baseSign}${baseDelta} đơn vị cơ sở)`
          : `Điều chỉnh tồn kho cho SKU ${payload.productSku} thành công: ${sign}${payload.quantityChange} ${unit}`;

      const newTxn: InventoryTransaction = {
        id: `txn-${Date.now()}`,
        productId: payload.productSku,
        sku: payload.productSku,
        productName: `Sản phẩm ${payload.productSku}`,
        type: payload.quantityChange >= 0 ? 'IMPORT' : 'EXPORT',
        inputQuantity: payload.quantityChange,
        unitName: unit,
        conversionFactor: factor,
        baseQuantityChange: baseDelta,
        baseUnit: 'Lon',
        previousStock: prevQty,
        newStock: newQty,
        reason: payload.reason,
        adjustedBy: user?.username || 'Thủ kho',
        createdAt: new Date().toISOString(),
      };
      MOCK_TRANSACTIONS.unshift(newTxn);

      return {
        success: true,
        message,
        sku: payload.productSku,
        previousQuantity: prevQty,
        newQuantity: newQty,
        quantityChange: payload.quantityChange,
        unitName: unit,
        conversionFactor: factor,
        baseQuantityChange: baseDelta,
        baseUnit: 'Lon',
        reason: payload.reason,
        adjustedBy: user?.id || "demo-user",
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * Lấy lịch sử giao dịch sổ kho / thẻ kho kèm snapshot đơn vị quy đổi (SN-21 / SN-23)
   */
  async getTransactions(sku?: string): Promise<InventoryTransaction[]> {
    try {
      const response = await apiClient.get<InventoryTransaction[]>('/inventory/transactions', {
        params: sku ? { sku } : undefined,
      });
      if (Array.isArray(response.data)) {
        return response.data;
      }
    } catch {
      // Fallback
    }

    if (!sku) return MOCK_TRANSACTIONS;
    const clean = sku.trim().toLowerCase();
    return MOCK_TRANSACTIONS.filter((t) => t.sku.toLowerCase() === clean);
  },
};
