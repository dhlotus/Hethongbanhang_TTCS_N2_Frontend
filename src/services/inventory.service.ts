import { apiClient } from './api';
import { tokenStorage } from '../utils/token-storage';
import { MOCK_PRODUCTS } from './products.service';
import type {
  Product,
  ProductUnit,
  AdjustStockPayload,
  InventoryTransaction,
  StockAdjustmentResponse,
  StockOverviewItem,
} from '../types/products';
import type { LowStockAlert, StockBalance } from '../types/inventory.types';

const DEMO_TRANSACTIONS_KEY = 'loha_inventory_transactions';

const getStoredDemoTransactions = (): InventoryTransaction[] => {
  try {
    const raw = localStorage.getItem(DEMO_TRANSACTIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Không thể đọc dữ liệu demo từ localStorage:', err);
  }

  // Dữ liệu mẫu ban đầu
  const initial: InventoryTransaction[] = [
    {
      id: 'tx-seed-001',
      productId: 'prod-001',
      sku: 'LH-MILK-900G',
      productName: 'Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g',
      transactionType: 'IMPORT',
      inputQuantity: 10,
      inputUnit: 'Thùng',
      conversionRate: 24, // Snapshot 24 lon/thùng
      baseQuantityChange: 240, // 240 lon
      baseUnit: 'Lon',
      previousStock: 100,
      newStock: 340,
      reason: 'Nhập hàng đợt 1 từ nhà máy',
      referenceCode: 'PNK-2026-001',
      warehouse: 'Kho Tổng Miền Nam - LOHA WH01',
      performedBy: 'Trần Văn Thủ Kho',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'tx-seed-002',
      productId: 'prod-002',
      sku: 'LH-NUT-180ML',
      productName: 'Sữa Hạt Óc Chó Hạnh Nhân Organic 180ml',
      transactionType: 'IMPORT',
      inputQuantity: 25,
      inputUnit: 'Thùng',
      conversionRate: 48, // Snapshot 48 hộp/thùng
      baseQuantityChange: 1200,
      baseUnit: 'Hộp',
      previousStock: 0,
      newStock: 1200,
      reason: 'Nhập kho sản xuất đợt 1',
      referenceCode: 'PNK-2026-002',
      warehouse: 'Kho Tổng Miền Nam - LOHA WH01',
      performedBy: 'Trần Văn Thủ Kho',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];
  return initial;
};

const buildMockStockOverview = (): StockOverviewItem[] => {
  return MOCK_PRODUCTS.map((p: Product, index: number) => {
    const physicalStock = p.physicalStock !== undefined ? p.physicalStock : p.stockQuantity;
    const reservedStock =
      p.reservedStock !== undefined
        ? p.reservedStock
        : index % 3 === 0
        ? Math.min(30, Math.floor(physicalStock * 0.2))
        : 0;
    const availableStock = Math.max(0, physicalStock - reservedStock);

    let status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
    if (availableStock <= 0) {
      status = 'OUT_OF_STOCK';
    } else if (availableStock <= 15) {
      status = 'LOW_STOCK';
    }

    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category || `${p.parentCategory || ''} / ${p.subCategory || ''}`,
      parentCategory: p.parentCategory || 'Sữa & Chế phẩm sữa',
      subCategory: p.subCategory || '',
      physicalStock,
      reservedStock,
      availableStock,
      stockQuantity: physicalStock,
      physicalStockQuantity: physicalStock,
      reservedQuantity: reservedStock,
      minStockLevel: 10,
      isBelowMinStock: availableStock <= 10,
      baseUnit: p.baseUnit,
      units: (p.units || []).map((u: ProductUnit) => ({
        unitName: u.unitName,
        conversionRate: u.conversionRate,
        isBaseUnit: Boolean(u.isBaseUnit),
      })),
      warehouse: index % 4 === 1 ? 'Kho Hà Nội - LOHA WH02' : 'Kho Tổng Miền Nam - LOHA WH01',
      warehouseId: index % 4 === 1 ? 'WH02' : 'WH01',
      status,
      imageUrl: p.imageUrl,
    };
  });
};

export const inventoryService = {
  /**
   * Lấy danh sách sổ tồn kho minh bạch 3 cột (thực tế, tạm giữ, khả thi)
   */
  async getStockOverview(
    paramsOrWarehouseId?:
      | string
      | {
          warehouse?: string;
          category?: string;
          status?: string;
          search?: string;
          warehouseId?: string;
        },
  ): Promise<StockOverviewItem[]> {
    const params =
      typeof paramsOrWarehouseId === 'string'
        ? { warehouseId: paramsOrWarehouseId, warehouse: paramsOrWarehouseId }
        : paramsOrWarehouseId;

    const token = tokenStorage.getAccessToken();

    let items: StockOverviewItem[];

    if (token && token.startsWith('demo-jwt-')) {
      items = buildMockStockOverview();
    } else {
      try {
        const response = await apiClient.get<StockOverviewItem[]>('/inventory/stock', {
          params,
        });
        items = response.data;
      } catch {
        items = buildMockStockOverview();
      }
    }

    if (params?.search) {
      const q = params.search.trim().toLowerCase();
      items = items.filter(
        (i) => i.sku.toLowerCase().includes(q) || i.name.toLowerCase().includes(q),
      );
    }

    if (params?.category && params.category !== 'ALL') {
      items = items.filter(
        (i) =>
          i.category.includes(params.category!) ||
          i.parentCategory === params.category ||
          i.subCategory === params.category,
      );
    }

    if (params?.status && params.status !== 'ALL') {
      items = items.filter((i) => i.status === params.status);
    }

    const warehouseFilter = params?.warehouseId || params?.warehouse;
    if (warehouseFilter && warehouseFilter !== 'ALL') {
      items = items.filter(
        (i) => i.warehouse === warehouseFilter || i.warehouseId === warehouseFilter,
      );
    }

    return items;
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
    const token = tokenStorage.getAccessToken();
    if (token && token.startsWith('demo-jwt-')) {
      const user = tokenStorage.getUser();
      const roles = user?.roles || [];
      const canAdjust =
        roles.includes('ADMIN') ||
        roles.includes('WAREHOUSE_KEEPER') ||
        roles.includes('WAREHOUSE_MANAGER');

      if (!canAdjust) {
        throw new Error('Từ chối truy cập: Bạn không có quyền thực hiện chức năng này.');
      }

      return {
        success: true,
        message: `Điều chỉnh tồn kho cho SKU ${payload.productSku} thành công (Demo)`,
        sku: payload.productSku,
        previousQuantity: 340,
        newQuantity: 340 + payload.quantityChange,
        quantityChange: payload.quantityChange,
        reason: payload.reason,
        adjustedBy: user?.id || 'demo-user',
        timestamp: new Date().toISOString(),
      };
    }

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
    const token = tokenStorage.getAccessToken();
    if (token && token.startsWith('demo-jwt-')) {
      const all = getStoredDemoTransactions();
      if (!sku) return all;
      return all.filter((t) => t.sku.toUpperCase() === sku.trim().toUpperCase());
    }

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
