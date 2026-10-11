import { apiClient } from './api';
import type {
  AdjustStockPayload,
  InventoryTransaction,
  StockAdjustmentResponse,
} from '../types/products';
import type { LowStockAlert, StockBalance, StockItem, StockReservation } from '../types/inventory.types';
import { MOCK_PRODUCTS } from './products.service';
import { tokenStorage } from '../utils/token-storage';
import type { Product, ProductUnit } from '../types/products';

export const inventoryService = {
  /**
   * Lấy tổng quan tồn kho khả dụng và đơn vị quy đổi
   * GET /inventory/stock
   */
  async getStockOverview(warehouseId?: string): Promise<StockBalance[]> {
    const token = tokenStorage.getAccessToken();
    if (token && token.startsWith('demo-jwt-')) {
      const stocks = await this.getStocks();
      return stocks.map((s) => ({
        sku: s.sku,
        name: s.name,
        stockQuantity: s.availableQuantity,
        physicalStockQuantity: s.physicalQuantity,
        physicalQuantity: s.physicalQuantity,
        reservedQuantity: s.reservedQuantity,
        availableQuantity: s.availableQuantity,
        baseUnit: s.baseUnit,
        units: (s.units || []).map((u) => ({
          unitName: u.unitName,
          conversionRate: u.conversionRate,
          isBaseUnit: u.isBaseUnit,
        })),
        warehouse: s.warehouse,
        warehouseId: warehouseId || 'wh-main',
        activeReservations: s.activeReservations,
        minStockLevel: s.minStockLevel,
        isBelowMinStock: s.isBelowMinStock,
      }));
    }

    try {
      const response = await apiClient.get<StockBalance[]>('/inventory/stock', {
        params: warehouseId ? { warehouseId } : undefined,
      });
      return response.data;
    } catch {
      const stocks = await this.getStocks();
      return stocks.map((s) => ({
        sku: s.sku,
        name: s.name,
        stockQuantity: s.availableQuantity,
        physicalStockQuantity: s.physicalQuantity,
        physicalQuantity: s.physicalQuantity,
        reservedQuantity: s.reservedQuantity,
        availableQuantity: s.availableQuantity,
        baseUnit: s.baseUnit,
        units: (s.units || []).map((u) => ({
          unitName: u.unitName,
          conversionRate: u.conversionRate,
          isBaseUnit: u.isBaseUnit,
        })),
        warehouse: s.warehouse,
        warehouseId: warehouseId || 'wh-main',
        activeReservations: s.activeReservations,
      }));
    }
  },

  /**
   * Lấy sổ tồn kho chuẩn 3 cột: Tồn thực tế, Đang giữ chỗ, Tồn khả dụng (SN-180)
   */
  async getStocks(): Promise<StockItem[]> {
    const token = tokenStorage.getAccessToken();
    if (token && token.startsWith('demo-jwt-')) {
      let demoOrders: Array<{
        id?: string;
        orderCode?: string;
        status?: string;
        reservedUntil?: string;
        createdAt?: string;
        lines?: Array<{ productSku?: string; productId?: string; quantity: number; baseQuantity?: number; conversionRate?: number }>;
      }> = [];
      try {
        const rawOrders = localStorage.getItem('loha_demo_orders');
        if (rawOrders) demoOrders = JSON.parse(rawOrders);
      } catch {}

      // Lọc các đơn đang giữ chỗ (APPROVED)
      const approvedOrders = demoOrders.filter((o) => o.status === 'APPROVED');

      return MOCK_PRODUCTS.map((p: Product) => {
        const physical = p.stockQuantity || 100;
        const skuUpper = p.sku.toUpperCase();

        const activeReservations: StockReservation[] = [];
        let reserved = 0;

        const isSkuMatch = (a: string, b: string) => {
          const sa = (a || '').trim().toUpperCase();
          const sb = (b || '').trim().toUpperCase();
          if (sa === sb) return true;
          if (
            (sa === 'LH-MILK-900G' || sa === 'LH-MILK-POWDER-900G') &&
            (sb === 'LH-MILK-900G' || sb === 'LH-MILK-POWDER-900G')
          ) {
            return true;
          }
          return false;
        };

        for (const order of approvedOrders) {
          for (const line of order.lines || []) {
            const lineSku = (line.productSku || line.productId || '').toUpperCase();
            if (isSkuMatch(lineSku, skuUpper) || (line.productId && line.productId === p.id)) {
              const qty = line.baseQuantity ?? Math.round(line.quantity * (line.conversionRate || 1));
              reserved += qty;
              activeReservations.push({
                id: `res-demo-${order.id}-${line.productSku || p.sku}`,
                orderId: order.id || '',
                orderCode: order.orderCode || order.id || '',
                productId: p.id,
                productSku: p.sku,
                productName: p.name,
                customerName: (order as { customerName?: string }).customerName,
                warehouseId: 'wh-main',
                quantity: qty,
                status: 'ACTIVE',
                expiredAt: order.reservedUntil || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
                createdAt: order.createdAt || new Date().toISOString(),
              });
            }
          }
        }

        const available = Math.max(0, physical - reserved);

        let minStockLevel = 0;
        try {
          const rawMin = localStorage.getItem('loha_min_stock_levels');
          if (rawMin) {
            const minMap = JSON.parse(rawMin);
            minStockLevel = Number(minMap[p.sku] ?? minMap[p.sku.toUpperCase()] ?? 0);
          } else {
            // Mặc định mẫu cho môi trường demo
            if (p.sku.toUpperCase() === 'LH-MILK-900G') minStockLevel = 50;
            if (p.sku.toUpperCase() === 'LH-OLD-COFFEE-CAN') minStockLevel = 20;
          }
        } catch {}

        const isBelowMinStock = minStockLevel > 0 && available <= minStockLevel;

        return {
          sku: p.sku,
          name: p.name,
          physicalQuantity: physical,
          reservedQuantity: reserved,
          availableQuantity: available,
          baseUnit: p.baseUnit,
          warehouse: 'Kho Tổng Miền Nam - LOHA WH01',
          warehouseId: '11111111-0000-0000-0000-000000000001',
          units: (p.units || []).map((u: ProductUnit) => ({
            unitName: u.unitName,
            conversionRate: u.conversionRate,
            isBaseUnit: Boolean(u.isBaseUnit),
          })),
          activeReservations,
          minStockLevel,
          isBelowMinStock,
        };
      });
    }

    try {
      const response = await apiClient.get<StockItem[]>('/inventory/stocks');
      return response.data;
    } catch {
      const response = await apiClient.get<Array<{
        sku: string;
        name: string;
        physicalQuantity?: number;
        physicalStockQuantity?: number;
        stockQuantity?: number;
        reservedQuantity?: number;
        availableQuantity?: number;
        baseUnit: string;
        warehouse?: string;
        warehouseId?: string;
        units?: Array<{ unitName: string; conversionRate: number; isBaseUnit: boolean }>;
        activeReservations?: StockReservation[];
        minStockLevel?: number;
        isBelowMinStock?: boolean;
      }>>('/inventory/stock');

      return (response.data || []).map((item) => {
        const physical = item.physicalQuantity ?? item.physicalStockQuantity ?? item.stockQuantity ?? 0;
        const reserved = item.reservedQuantity ?? 0;
        const available = item.availableQuantity ?? Math.max(0, physical - reserved);
        const minStockLevel = item.minStockLevel ?? 0;
        const isBelowMinStock = item.isBelowMinStock ?? (minStockLevel > 0 && available <= minStockLevel);
        return {
          sku: item.sku,
          name: item.name,
          physicalQuantity: physical,
          reservedQuantity: reserved,
          availableQuantity: available,
          baseUnit: item.baseUnit,
          warehouse: item.warehouse || 'Kho Tổng Miền Nam - LOHA WH01',
          warehouseId: item.warehouseId || '11111111-0000-0000-0000-000000000001',
          units: item.units,
          activeReservations: item.activeReservations || [],
          minStockLevel,
          isBelowMinStock,
        };
      });
    }
  },

  /**
   * Lấy danh sách nhật ký giữ chỗ tồn kho (SN-180)
   */
  async getReservations(orderId?: string): Promise<StockReservation[]> {
    const token = tokenStorage.getAccessToken();
    if (token && token.startsWith('demo-jwt-')) {
      const stocks = await this.getStocks();
      const allRes: StockReservation[] = [];
      for (const s of stocks) {
        if (s.activeReservations) {
          allRes.push(...s.activeReservations);
        }
      }
      if (orderId) {
        return allRes.filter((r) => r.orderId === orderId);
      }
      return allRes;
    }

    try {
      const response = await apiClient.get<StockReservation[]>('/inventory/reservations', {
        params: orderId ? { orderId } : undefined,
      });
      return response.data;
    } catch {
      return [];
    }
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
    const token = tokenStorage.getAccessToken();
    const isDemo = token && token.startsWith('demo-jwt-');

    if (isDemo) {
      try {
        const rawMin = localStorage.getItem('loha_min_stock_levels');
        const minMap = rawMin ? JSON.parse(rawMin) : {};
        minMap[sku] = minStock;
        minMap[sku.toUpperCase()] = minStock;
        localStorage.setItem('loha_min_stock_levels', JSON.stringify(minMap));
      } catch {}

      const stocks = await this.getStocks();
      const matched = stocks.find((s) => s.sku.toUpperCase() === sku.toUpperCase());
      return {
        sku,
        name: matched?.name || sku,
        stockQuantity: matched?.availableQuantity || 0,
        physicalStockQuantity: matched?.physicalQuantity || 0,
        reservedQuantity: matched?.reservedQuantity || 0,
        baseUnit: matched?.baseUnit || 'Cái',
        units: matched?.units || [],
        warehouse: matched?.warehouse || 'Kho Tổng Miền Nam',
        warehouseId: warehouseId || '11111111-0000-0000-0000-000000000001',
        minStockLevel: minStock,
        isBelowMinStock: minStock > 0 && (matched?.availableQuantity || 0) <= minStock,
      };
    }

    try {
      const response = await apiClient.patch<StockBalance>(
        `/inventory/stock-balances/warehouses/${encodeURIComponent(warehouseId)}/sku/${encodeURIComponent(sku)}/min-stock`,
        { minStock },
      );
      return response.data;
    } catch (err: unknown) {
      // Fallback local storage nếu demo hoặc offline
      try {
        const rawMin = localStorage.getItem('loha_min_stock_levels');
        const minMap = rawMin ? JSON.parse(rawMin) : {};
        minMap[sku] = minStock;
        minMap[sku.toUpperCase()] = minStock;
        localStorage.setItem('loha_min_stock_levels', JSON.stringify(minMap));
      } catch {}

      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
        const serverMsg = axiosErr.response?.data?.message;
        if (serverMsg) {
          throw new Error(Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg, { cause: err });
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
    try {
      const response = await apiClient.get<LowStockAlert[]>('/inventory/alerts/low-stock', {
        params: warehouseId ? { warehouseId } : undefined,
      });
      return response.data;
    } catch {
      // Fallback tính toán từ danh sách sổ tồn
      const stocks = await this.getStocks();
      return stocks
        .filter((s) => s.isBelowMinStock === true && (s.minStockLevel ?? 0) > 0)
        .map((s) => ({
          sku: s.sku,
          name: s.name,
          stockQuantity: s.availableQuantity,
          physicalStockQuantity: s.physicalQuantity,
          physicalQuantity: s.physicalQuantity,
          reservedQuantity: s.reservedQuantity,
          availableQuantity: s.availableQuantity,
          baseUnit: s.baseUnit,
          units: s.units || [],
          warehouse: s.warehouse,
          warehouseId: s.warehouseId || warehouseId || '11111111-0000-0000-0000-000000000001',
          minStockLevel: s.minStockLevel || 0,
          isBelowMinStock: true as const,
          shortage: Math.max(0, (s.minStockLevel || 0) - s.availableQuantity),
        }))
        .sort((a, b) => b.shortage - a.shortage);
    }
  },

  /**
   * Điều chỉnh tồn kho hàng hóa kèm quy đổi đơn vị (SN-23 & EP-04)
   * PUT /inventory/adjust
   * Quyền: ADMIN, WAREHOUSE_KEEPER, WAREHOUSE_MANAGER
   */
  async adjustStock(payload: AdjustStockPayload): Promise<StockAdjustmentResponse> {
    try {
      const response = await apiClient.put<StockAdjustmentResponse>('/inventory/adjust', payload);
      window.dispatchEvent(new CustomEvent('loha_inventory_updated', { detail: response.data }));
      window.dispatchEvent(new CustomEvent('loha_products_updated', { detail: response.data }));
      return response.data;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
        const serverMsg = axiosErr.response?.data?.message;
        if (serverMsg) {
          const msg = Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg;
          throw new Error(msg, { cause: err });
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
          throw new Error(msg, { cause: err });
        }
      }
      throw err;
    }
  },
};
