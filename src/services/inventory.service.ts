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
import type { LowStockAlert, StockBalance, StockItem, StockReservation } from '../types/inventory.types';

const DEMO_TRANSACTIONS_KEY = 'loha_inventory_transactions';

const getStoredDemoTransactions = (): InventoryTransaction[] => {
  try {
    const raw = localStorage.getItem(DEMO_TRANSACTIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Không thể đọc dữ liệu demo từ localStorage:', err);
  }

  // Dữ liệu mẫu ban đầu phục vụ Thẻ kho (SN-185 & SN-23)
  const now = Date.now();
  const day = 86400000;
  const initial: InventoryTransaction[] = [
    // 1. LH-MILK-900G
    {
      id: 'tx-seed-milk-01',
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
      reason: 'Nhập lô hàng mới từ Nhà máy Dược Loha',
      referenceCode: 'PNK-2026-0891',
      warehouse: 'Kho Tổng Miền Nam - LOHA WH01',
      performedBy: 'Thủ kho Nguyễn Văn Kho',
      createdAt: new Date(now - day * 6).toISOString(),
    },
    {
      id: 'tx-seed-milk-02',
      productId: 'prod-001',
      sku: 'LH-MILK-900G',
      productName: 'Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g',
      transactionType: 'ORDER',
      inputQuantity: -50,
      inputUnit: 'Lon',
      conversionRate: 1,
      baseQuantityChange: -50,
      baseUnit: 'Lon',
      previousStock: 340,
      newStock: 290,
      reason: 'Xuất bán đơn hàng đại lý #DH-2026-1002 (Đại lý Sữa Miền Nam)',
      referenceCode: 'DH-2026-1002',
      warehouse: 'Kho Tổng Miền Nam - LOHA WH01',
      performedBy: 'Nhân viên kho Trần Văn Kho',
      createdAt: new Date(now - day * 4.5).toISOString(),
    },
    {
      id: 'tx-seed-milk-03',
      productId: 'prod-001',
      sku: 'LH-MILK-900G',
      productName: 'Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g',
      transactionType: 'TRANSFER',
      inputQuantity: -30,
      inputUnit: 'Lon',
      conversionRate: 1,
      baseQuantityChange: -30,
      baseUnit: 'Lon',
      previousStock: 290,
      newStock: 260,
      reason: 'Điều chuyển nội bộ sang Kho Vận Hà Nội phục vụ thị trường phía Bắc',
      referenceCode: 'PCK-2026-0045',
      warehouse: 'Kho Tổng Miền Nam - LOHA WH01',
      performedBy: 'Quản lý kho Đỗ Quốc Bảo',
      createdAt: new Date(now - day * 3).toISOString(),
    },
    {
      id: 'tx-seed-milk-04',
      productId: 'prod-001',
      sku: 'LH-MILK-900G',
      productName: 'Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g',
      transactionType: 'ADJUSTMENT',
      inputQuantity: -2,
      inputUnit: 'Lon',
      conversionRate: 1,
      baseQuantityChange: -2,
      baseUnit: 'Lon',
      previousStock: 260,
      newStock: 258,
      reason: 'Điều chỉnh kiểm kê định kỳ: Hao hụt 2 lon do móp méo khi bốc xếp',
      referenceCode: 'PKK-20261008-001',
      warehouse: 'Kho Tổng Miền Nam - LOHA WH01',
      performedBy: 'Quản lý kho Đỗ Quốc Bảo',
      createdAt: new Date(now - day * 2).toISOString(),
    },
    {
      id: 'tx-seed-milk-05',
      productId: 'prod-001',
      sku: 'LH-MILK-900G',
      productName: 'Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g',
      transactionType: 'IMPORT',
      inputQuantity: 1242,
      inputUnit: 'Lon',
      conversionRate: 1,
      baseQuantityChange: 1242,
      baseUnit: 'Lon',
      previousStock: 258,
      newStock: 1500,
      reason: 'Nhập bổ sung lượng lớn theo hợp đồng cung ứng số HD-2026-44',
      referenceCode: 'PNK-2026-0905',
      warehouse: 'Kho Tổng Miền Nam - LOHA WH01',
      performedBy: 'Thủ kho Nguyễn Văn Kho',
      createdAt: new Date(now - day * 1).toISOString(),
    },

    // 2. LH-NUT-180ML
    {
      id: 'tx-seed-nut-01',
      productId: 'prod-002',
      sku: 'LH-NUT-180ML',
      productName: 'Sữa Hạt Óc Chó Hạnh Nhân Organic 180ml',
      transactionType: 'IMPORT',
      inputQuantity: 25,
      inputUnit: 'Thùng',
      conversionRate: 48,
      baseQuantityChange: 1200,
      baseUnit: 'Hộp',
      previousStock: 0,
      newStock: 1200,
      reason: 'Nhập kho thành phẩm theo lệnh sản xuất #LSX-1102',
      referenceCode: 'PNK-2026-0892',
      warehouse: 'Kho Tổng Miền Nam - LOHA WH01',
      performedBy: 'Thủ kho Nguyễn Văn Kho',
      createdAt: new Date(now - day * 5).toISOString(),
    },
    {
      id: 'tx-seed-nut-02',
      productId: 'prod-002',
      sku: 'LH-NUT-180ML',
      productName: 'Sữa Hạt Óc Chó Hạnh Nhân Organic 180ml',
      transactionType: 'ORDER',
      inputQuantity: -120,
      inputUnit: 'Hộp',
      conversionRate: 1,
      baseQuantityChange: -120,
      baseUnit: 'Hộp',
      previousStock: 1200,
      newStock: 1080,
      reason: 'Xuất bán theo đơn hàng #DH-2026-1008 cho Chuỗi siêu thị Loha Mart',
      referenceCode: 'DH-2026-1008',
      warehouse: 'Kho Tổng Miền Nam - LOHA WH01',
      performedBy: 'Nhân viên kho Trần Văn Kho',
      createdAt: new Date(now - day * 3).toISOString(),
    },

    // 3. LH-BIRD-NEST
    {
      id: 'tx-seed-bird-01',
      productId: 'prod-003',
      sku: 'LH-BIRD-NEST',
      productName: 'Tổ Yến Chưng Đông Trùng Hạ Thảo Cao Cấp 70ml',
      transactionType: 'IMPORT',
      inputQuantity: 600,
      inputUnit: 'Hũ',
      conversionRate: 1,
      baseQuantityChange: 600,
      baseUnit: 'Hũ',
      previousStock: 0,
      newStock: 600,
      reason: 'Nhập kho thành phẩm cao cấp từ Xưởng Yến Sào Nha Trang',
      referenceCode: 'PNK-2026-0895',
      warehouse: 'Kho Tổng Miền Nam - LOHA WH01',
      performedBy: 'Thủ kho Nguyễn Văn Kho',
      createdAt: new Date(now - day * 4).toISOString(),
    },
    {
      id: 'tx-seed-bird-02',
      productId: 'prod-003',
      sku: 'LH-BIRD-NEST',
      productName: 'Tổ Yến Chưng Đông Trùng Hạ Thảo Cao Cấp 70ml',
      transactionType: 'ORDER',
      inputQuantity: -20,
      inputUnit: 'Hũ',
      conversionRate: 1,
      baseQuantityChange: -20,
      baseUnit: 'Hũ',
      previousStock: 600,
      newStock: 580,
      reason: 'Xuất giao hàng đơn VIP #DH-2026-1015 (Đại lý Dinh Dưỡng An Tâm)',
      referenceCode: 'DH-2026-1015',
      warehouse: 'Kho Tổng Miền Nam - LOHA WH01',
      performedBy: 'Nhân viên kho Trần Văn Kho',
      createdAt: new Date(now - day * 2).toISOString(),
    },

    // 4. LH-COFFEE-250G
    {
      id: 'tx-seed-coffee-01',
      productId: 'prod-004',
      sku: 'LH-COFFEE-250G',
      productName: 'Cà Phê Rang Xay Nguyên Chất Robusta & Arabica 250g',
      transactionType: 'IMPORT',
      inputQuantity: 500,
      inputUnit: 'Gói',
      conversionRate: 1,
      baseQuantityChange: 500,
      baseUnit: 'Gói',
      previousStock: 0,
      newStock: 500,
      reason: 'Nhập lô cà phê thu hoạch mới từ Nông trại Buôn Ma Thuột',
      referenceCode: 'PNK-2026-0898',
      warehouse: 'Kho Tổng Miền Nam - LOHA WH01',
      performedBy: 'Thủ kho Nguyễn Văn Kho',
      createdAt: new Date(now - day * 5).toISOString(),
    },
    {
      id: 'tx-seed-coffee-02',
      productId: 'prod-004',
      sku: 'LH-COFFEE-250G',
      productName: 'Cà Phê Rang Xay Nguyên Chất Robusta & Arabica 250g',
      transactionType: 'TRANSFER',
      inputQuantity: -90,
      inputUnit: 'Gói',
      conversionRate: 1,
      baseQuantityChange: -90,
      baseUnit: 'Gói',
      previousStock: 500,
      newStock: 410,
      reason: 'Điều chuyển kho nội bộ sang Kho Trung Chuyển Đà Nẵng',
      referenceCode: 'PCK-2026-0048',
      warehouse: 'Kho Tổng Miền Nam - LOHA WH01',
      performedBy: 'Quản lý kho Đỗ Quốc Bảo',
      createdAt: new Date(now - day * 2.5).toISOString(),
    },

    // 5. LH-TEA-350ML
    {
      id: 'tx-seed-tea-01',
      productId: 'prod-005',
      sku: 'LH-TEA-350ML',
      productName: 'Trà Thảo Mộc Hoa Cúc & Kỷ Tử Thanh Nhiệt 350ml',
      transactionType: 'IMPORT',
      inputQuantity: 300,
      inputUnit: 'Chai',
      conversionRate: 1,
      baseQuantityChange: 300,
      baseUnit: 'Chai',
      previousStock: 0,
      newStock: 300,
      reason: 'Nhập hàng đợt 1 từ Công ty Trà Thảo Dược Thiên Nhiên',
      referenceCode: 'PNK-2026-0901',
      warehouse: 'Kho Tổng Miền Nam - LOHA WH01',
      performedBy: 'Thủ kho Nguyễn Văn Kho',
      createdAt: new Date(now - day * 4).toISOString(),
    },
    {
      id: 'tx-seed-tea-02',
      productId: 'prod-005',
      sku: 'LH-TEA-350ML',
      productName: 'Trà Thảo Mộc Hoa Cúc & Kỷ Tử Thanh Nhiệt 350ml',
      transactionType: 'EXPORT',
      inputQuantity: -40,
      inputUnit: 'Chai',
      conversionRate: 1,
      baseQuantityChange: -40,
      baseUnit: 'Chai',
      previousStock: 300,
      newStock: 260,
      reason: 'Xuất mẫu thử nghiệm và giới thiệu sản phẩm tại Hội chợ Thương mại',
      referenceCode: 'PXK-2026-0015',
      warehouse: 'Kho Tổng Miền Nam - LOHA WH01',
      performedBy: 'Nhân viên kho Trần Văn Kho',
      createdAt: new Date(now - day * 1.5).toISOString(),
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

    let minStockLevel = 10;
    try {
      const rawMin = localStorage.getItem('loha_min_stock_levels');
      if (rawMin) {
        const minMap = JSON.parse(rawMin);
        if (minMap[p.sku] !== undefined) minStockLevel = Number(minMap[p.sku]);
        else if (minMap[p.sku.toUpperCase()] !== undefined) minStockLevel = Number(minMap[p.sku.toUpperCase()]);
      }
    } catch {}
    const isBelowMinStock = minStockLevel > 0 && availableStock <= minStockLevel;

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
      minStockLevel,
      isBelowMinStock,
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

    const cleanParams: Record<string, string> = {};
    if (params) {
      if (params.search?.trim()) cleanParams.search = params.search.trim();
      if (params.category && params.category !== 'ALL') cleanParams.category = params.category;
      if (params.status && params.status !== 'ALL') cleanParams.status = params.status;
      const wh = params.warehouseId || params.warehouse;
      if (wh && wh !== 'ALL') {
        cleanParams.warehouse = wh;
        cleanParams.warehouseId = wh;
      }
    }

    if (token && token.startsWith('demo-jwt-')) {
      items = buildMockStockOverview();
    } else {
      try {
        const response = await apiClient.get<StockOverviewItem[]>('/inventory/stock', {
          params: cleanParams,
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
      if (params.status === 'BELOW_MIN_STOCK') {
        items = items.filter(
          (i) =>
            i.isBelowMinStock ||
            ((i.minStockLevel || 0) > 0 && i.availableStock <= (i.minStockLevel || 0)),
        );
      } else {
        items = items.filter((i) => i.status === params.status);
      }
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
   * Truy vấn sổ kho và lịch sử biến động giao dịch / Thẻ kho hàng hóa (SN-185 & SN-23)
   * GET /inventory/transactions?sku=...&warehouse=...&startDate=...&endDate=...&type=...&search=...
   */
  async getTransactions(
    queryOrSku?: string | {
      sku?: string;
      warehouse?: string;
      startDate?: string;
      endDate?: string;
      type?: string;
      search?: string;
      limit?: number;
    },
  ): Promise<InventoryTransaction[]> {
    const q = typeof queryOrSku === 'string' ? { sku: queryOrSku } : (queryOrSku || {});
    const token = tokenStorage.getAccessToken();

    if (token && token.startsWith('demo-jwt-')) {
      let all = getStoredDemoTransactions();

      if (q.sku && q.sku.trim() !== '') {
        const skuUpper = q.sku.trim().toUpperCase();
        all = all.filter((t) => t.sku.toUpperCase() === skuUpper);
      }

      if (q.warehouse && q.warehouse.trim() !== '' && q.warehouse.toUpperCase() !== 'ALL') {
        const whQuery = q.warehouse.trim().toLowerCase();
        all = all.filter((t) => {
          const tWh = (t.warehouse || '').toLowerCase();
          if (tWh.includes(whQuery) || whQuery.includes(tWh)) return true;
          const isSouth = (s: string) => s.includes('nam') || s.includes('mn') || s.includes('wh01') || s.includes('hồ chí minh');
          const isNorth = (s: string) => s.includes('bắc') || s.includes('bac') || s.includes('mb') || s.includes('wh02') || s.includes('hà nội');
          const isCentral = (s: string) => s.includes('trung') || s.includes('mt') || s.includes('wh03') || s.includes('đà nẵng');
          const isWest = (s: string) => s.includes('tây') || s.includes('tay') || s.includes('west') || s.includes('cần thơ');
          if (isSouth(whQuery) && isSouth(tWh)) return true;
          if (isNorth(whQuery) && isNorth(tWh)) return true;
          if (isCentral(whQuery) && isCentral(tWh)) return true;
          if (isWest(whQuery) && isWest(tWh)) return true;
          return false;
        });
      }

      if (q.type && q.type.trim() !== '' && q.type.toUpperCase() !== 'ALL') {
        const typeUpper = q.type.trim().toUpperCase();
        all = all.filter((t) => t.transactionType === typeUpper);
      }

      if (q.startDate && q.startDate.trim() !== '') {
        const start = new Date(q.startDate);
        if (!isNaN(start.getTime())) {
          start.setHours(0, 0, 0, 0);
          all = all.filter((t) => new Date(t.createdAt).getTime() >= start.getTime());
        }
      }

      if (q.endDate && q.endDate.trim() !== '') {
        const end = new Date(q.endDate);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          all = all.filter((t) => new Date(t.createdAt).getTime() <= end.getTime());
        }
      }

      if (q.search && q.search.trim() !== '') {
        const s = q.search.trim().toLowerCase();
        all = all.filter((t) =>
          (t.referenceCode || '').toLowerCase().includes(s) ||
          (t.productName || '').toLowerCase().includes(s) ||
          (t.sku || '').toLowerCase().includes(s) ||
          (t.reason || '').toLowerCase().includes(s) ||
          (t.performedBy || '').toLowerCase().includes(s)
        );
      }

      const limit = q.limit && q.limit > 0 ? q.limit : 500;
      return all.slice(0, limit);
    }

    try {
      const response = await apiClient.get<InventoryTransaction[]>('/inventory/transactions', {
        params: q,
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
  /**
   * Xóa sản phẩm khỏi kho (Yêu cầu mới):
   * - Chỉ Admin và Quản lý kho
   * - Ràng buộc: Hết mọi loại tồn (thực tế, tạm giữ, khả dụng = 0)
   */
  async removeProductFromWarehouse(
    warehouseId: string,
    sku: string,
    productId?: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      '/inventory/stock',
      {
        params: {
          warehouseId,
          sku,
          productId,
        },
      }
    );
    return response.data;
  },
};
