import { apiClient } from './api';
import { tokenStorage } from '../utils/token-storage';
import { MOCK_PRODUCTS } from './products.service';
import type {
  Product,
  ProductUnit,
  AdjustStockPayload,
  InventoryTransaction,
  StockAdjustmentResponse,
} from '../types/products';
import type { StockItem, StockReservation } from '../types/inventory.types';

const DEMO_TRANSACTIONS_KEY = 'loha_inventory_transactions';

const getStoredDemoTransactions = (): InventoryTransaction[] => {
  try {
    const raw = localStorage.getItem(DEMO_TRANSACTIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

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

const saveStoredDemoTransactions = (list: InventoryTransaction[]): void => {
  try {
    localStorage.setItem(DEMO_TRANSACTIONS_KEY, JSON.stringify(list));
  } catch {}
};

export const inventoryService = {
  /**
   * Lấy tổng quan tồn kho
   */
  async getStockOverview(): Promise<
    Array<{
      sku: string;
      name: string;
      stockQuantity: number;
      physicalStockQuantity: number;
      reservedQuantity: number;
      baseUnit: string;
      units: Array<{ unitName: string; conversionRate: number; isBaseUnit: boolean }>;
      warehouse: string;
    }>
  > {
    const token = tokenStorage.getAccessToken();
    if (token && token.startsWith('demo-jwt-')) {
      return MOCK_PRODUCTS.map((p: Product) => ({
        sku: p.sku,
        name: p.name,
        stockQuantity: p.stockQuantity,
        physicalStockQuantity: p.stockQuantity,
        reservedQuantity: 0,
        baseUnit: p.baseUnit,
        units: (p.units || []).map((u: ProductUnit) => ({
          unitName: u.unitName,
          conversionRate: u.conversionRate,
          isBaseUnit: Boolean(u.isBaseUnit),
        })),
        warehouse: 'Kho Tổng Miền Nam - LOHA WH01',
      }));
    }

    const response = await apiClient.get('/inventory/stock');
    return response.data;
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

        for (const order of approvedOrders) {
          for (const line of order.lines || []) {
            const lineSku = (line.productSku || line.productId || '').toUpperCase();
            if (lineSku === skuUpper) {
              const qty = line.baseQuantity ?? Math.round(line.quantity * (line.conversionRate || 1));
              reserved += qty;
              activeReservations.push({
                id: `res-demo-${order.id}-${line.productSku || p.sku}`,
                orderId: order.id || '',
                orderCode: order.orderCode || order.id || '',
                productId: p.id,
                productSku: p.sku,
                productName: p.name,
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

        return {
          sku: p.sku,
          name: p.name,
          physicalQuantity: physical,
          reservedQuantity: reserved,
          availableQuantity: available,
          baseUnit: p.baseUnit,
          warehouse: 'Kho Tổng Miền Nam - LOHA WH01',
          units: (p.units || []).map((u: ProductUnit) => ({
            unitName: u.unitName,
            conversionRate: u.conversionRate,
            isBaseUnit: Boolean(u.isBaseUnit),
          })),
          activeReservations,
        };
      });
    }

    try {
      const response = await apiClient.get<StockItem[]>('/inventory/stocks');
      return response.data;
    } catch {
      // Fallback endpoint cũ nếu chưa có /stocks
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
        units?: Array<{ unitName: string; conversionRate: number; isBaseUnit: boolean }>;
        activeReservations?: StockReservation[];
      }>>('/inventory/stock');

      return (response.data || []).map((item) => {
        const physical = item.physicalQuantity ?? item.physicalStockQuantity ?? item.stockQuantity ?? 0;
        const reserved = item.reservedQuantity ?? 0;
        const available = item.availableQuantity ?? Math.max(0, physical - reserved);
        return {
          sku: item.sku,
          name: item.name,
          physicalQuantity: physical,
          reservedQuantity: reserved,
          availableQuantity: available,
          baseUnit: item.baseUnit,
          warehouse: item.warehouse || 'Kho Tổng Miền Nam - LOHA WH01',
          units: item.units,
          activeReservations: item.activeReservations || [],
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
      return [];
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
   * Điều chỉnh tồn kho hàng hóa kèm quy đổi đơn vị (SN-23)
   * Nhập xuất theo thùng/lốc tự động quy về đơn vị cơ sở để ghi sổ tồn
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

      const product = MOCK_PRODUCTS.find(
        (p: Product) => p.sku === payload.productSku || p.id === payload.productSku
      );

      if (!product) {
        throw new Error(`Không tìm thấy sản phẩm có SKU ${payload.productSku}`);
      }

      // Xác định đơn vị và hệ số quy đổi
      let unitName = product.baseUnit;
      let conversionRate = 1;

      if (payload.unit && payload.unit.trim().toLowerCase() !== product.baseUnit.toLowerCase()) {
        const matchingUnit = product.units?.find(
          (u: ProductUnit) => u.unitName.toLowerCase() === payload.unit!.trim().toLowerCase()
        );
        if (!matchingUnit) {
          const validUnits = (product.units || []).map((u: ProductUnit) => u.unitName).join(', ');
          throw new Error(
            `Đơn vị "${payload.unit}" không hợp lệ. Các đơn vị được chấp nhận: ${validUnits || product.baseUnit}`
          );
        }
        unitName = matchingUnit.unitName;
        conversionRate = matchingUnit.conversionRate;
      }

      const baseQuantityChange = Math.round(payload.quantityChange * conversionRate);
      const previousQuantity = product.stockQuantity;

      if (product.stockQuantity + baseQuantityChange < 0) {
        throw new Error(
          `Số lượng xuất (${Math.abs(payload.quantityChange)} ${unitName} = ${Math.abs(baseQuantityChange)} ${product.baseUnit}) vượt quá tồn khả dụng (${product.stockQuantity} ${product.baseUnit}).`
        );
      }

      product.stockQuantity += baseQuantityChange;
      product.hasTransactions = true;

      const refCode =
        payload.referenceCode?.trim() ||
        (payload.quantityChange >= 0
          ? `PNK-${Date.now().toString().slice(-6)}`
          : `PXK-${Date.now().toString().slice(-6)}`);

      // Lưu giao dịch vào Sổ kho demo kèm snapshot conversionRate
      const tx: InventoryTransaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        transactionType: payload.quantityChange >= 0 ? 'IMPORT' : 'EXPORT',
        inputQuantity: payload.quantityChange,
        inputUnit: unitName,
        conversionRate, // SNAPSHOT BẤT BIẾN
        baseQuantityChange,
        baseUnit: product.baseUnit,
        previousStock: previousQuantity,
        newStock: product.stockQuantity,
        reason: payload.reason,
        referenceCode: refCode,
        warehouse: payload.warehouseLocation || 'Kho Tổng Miền Nam - LOHA WH01',
        performedBy: user?.fullName || user?.username || 'Thủ kho Demo',
        createdAt: new Date().toISOString(),
      };

      const transactions = getStoredDemoTransactions();
      transactions.unshift(tx);
      saveStoredDemoTransactions(transactions);

      const action = payload.quantityChange >= 0 ? 'Nhập kho' : 'Xuất kho';
      const sign = payload.quantityChange >= 0 ? '+' : '';

      return {
        success: true,
        message: `${action} thành công: ${sign}${payload.quantityChange} ${unitName} (Quy đổi: ${sign}${baseQuantityChange} ${product.baseUnit}). Tồn mới: ${product.stockQuantity} ${product.baseUnit}.`,
        sku: product.sku,
        productName: product.name,
        inputQuantity: payload.quantityChange,
        inputUnit: unitName,
        conversionRate,
        baseQuantityChange,
        baseUnit: product.baseUnit,
        previousQuantity,
        newQuantity: product.stockQuantity,
        quantityChange: baseQuantityChange,
        reason: payload.reason,
        referenceCode: refCode,
        adjustedBy: user?.id || 'demo-user',
        timestamp: tx.createdAt,
      };
    }

    try {
      const response = await apiClient.put<StockAdjustmentResponse>('/inventory/adjust', payload);
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
   * Truy vấn sổ kho và lịch sử quy đổi giao dịch (SN-23)
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
    } catch {
      const all = getStoredDemoTransactions();
      if (!sku) return all;
      return all.filter((t) => t.sku.toUpperCase() === sku.trim().toUpperCase());
    }
  },
};
