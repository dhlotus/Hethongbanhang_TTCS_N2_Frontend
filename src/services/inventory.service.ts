import { apiClient } from './api';
import type {
  AdjustStockPayload,
  InventoryTransaction,
  StockAdjustmentResponse,
} from '../types/products';
import type { LowStockAlert, StockBalance } from '../types/inventory.types';

export const inventoryService = {
  /**
   * Lấy tổng quan tồn kho khả dụng và đơn vị quy đổi
   * GET /inventory/stock
   */
  async getStockOverview(warehouseId?: string): Promise<StockBalance[]> {
    const response = await apiClient.get<StockBalance[]>('/inventory/stock', {
      params: warehouseId ? { warehouseId } : undefined,
    });
    return response.data;
  },

  /**
   * Khai báo mức tồn tối thiểu theo SKU tại kho (SN-183)
   * PATCH /inventory/stock-balances/warehouses/:warehouseId/sku/:sku/min-stock
   */
  async updateMinStockLevel(
    warehouseId: string,
    sku: string,
    minStock: number,
  ): Promise<StockBalance> {
    try {
      const response = await apiClient.patch<StockBalance>(
        `/inventory/stock-balances/warehouses/${encodeURIComponent(warehouseId)}/sku/${encodeURIComponent(sku)}/min-stock`,
        { minStock },
      );
      return response.data;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
        const serverMsg = axiosErr.response?.data?.message;
        if (serverMsg) {
          throw new Error(Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg);
        }
      }
      throw err;
    }
  },

  /**
   * Danh sách SKU dưới mức tồn tối thiểu, hụt nhiều nhất lên đầu (SN-183)
   * GET /inventory/alerts/low-stock
   */
  async getLowStockAlerts(warehouseId?: string): Promise<LowStockAlert[]> {
    const response = await apiClient.get<LowStockAlert[]>('/inventory/alerts/low-stock', {
      params: warehouseId ? { warehouseId } : undefined,
    });
    return response.data;
  },

  /**
   * Điều chỉnh tồn kho hàng hóa kèm quy đổi đơn vị (SN-23 & EP-04)
   * PUT /inventory/adjust
   * Quyền: ADMIN, WAREHOUSE_KEEPER, WAREHOUSE_MANAGER
   */
  async adjustStock(payload: AdjustStockPayload): Promise<StockAdjustmentResponse> {
    try {
      const response = await apiClient.put<StockAdjustmentResponse>('/inventory/adjust', payload);
      try {
        window.dispatchEvent(new CustomEvent('loha_inventory_updated', { detail: response.data }));
        window.dispatchEvent(new CustomEvent('loha_products_updated', { detail: response.data }));
      } catch {}
      return response.data;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
        const serverMsg = axiosErr.response?.data?.message;
        if (serverMsg) {
          const msg = Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg;
          throw new Error(msg);
        }
      }
      throw err;
    }
  },

  /**
   * Truy vấn sổ kho và lịch sử quy đổi giao dịch nhập/xuất (SN-23)
   * GET /inventory/transactions?sku=...
   */
  async getTransactions(sku?: string): Promise<InventoryTransaction[]> {
    try {
      const response = await apiClient.get<InventoryTransaction[]>('/inventory/transactions', {
        params: sku ? { sku } : undefined,
      });
      return response.data;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
        const serverMsg = axiosErr.response?.data?.message;
        if (serverMsg) {
          const msg = Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg;
          throw new Error(msg);
        }
      }
      throw err;
    }
  },
};
