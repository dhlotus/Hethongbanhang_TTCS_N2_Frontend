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

      try {
        window.dispatchEvent(
          new CustomEvent('loha_inventory_updated', {
            detail: {
              sku: product.sku,
              id: product.id,
              newStock: product.stockQuantity,
              previousStock: previousQuantity,
            },
          })
        );
        window.dispatchEvent(
          new CustomEvent('loha_products_updated', {
            detail: product,
          })
        );
      } catch {}

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
