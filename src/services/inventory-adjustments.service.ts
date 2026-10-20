import { apiClient } from './api';
import type {
  StockAdjustment,
  CreateStockAdjustmentPayload,
  RejectStockAdjustmentPayload,
  QueryStockAdjustmentsParams,
} from '../types/inventory-adjustment.types';
import { getStoredUser } from '../utils/navigation';

const LOCAL_STORAGE_KEY = 'loha_inventory_adjustments_local';

const getInitialDemoAdjustments = (): StockAdjustment[] => {
  const now = Date.now();
  return [
    {
      id: 'adj-seed-001',
      adjustmentCode: 'PDC-20261018-001',
      warehouseId: 'WH01',
      warehouseName: 'Kho Tổng Miền Nam - LOHA WH01',
      reason: 'DAMAGED',
      reasonDetail: 'Hàng bị móp vỏ thùng và bể vỡ trong lúc dỡ hàng từ xe tải',
      totalLossValue: 1100000,
      status: 'APPROVED',
      creatorId: 'usr-wh-keeper',
      creatorName: 'Thủ kho Nguyễn Văn Kho',
      creatorRole: 'WAREHOUSE_KEEPER',
      approverId: 'usr-wh-manager',
      approverName: 'Quản lý kho Trần Văn Quản',
      approvedAt: new Date(now - 86400000 * 2).toISOString(),
      note: 'Đã lập biên bản sự việc và xử lý tồn kho',
      createdAt: new Date(now - 86400000 * 2 - 3600000).toISOString(),
      updatedAt: new Date(now - 86400000 * 2).toISOString(),
      items: [
        {
          id: 'adj-item-001',
          productId: 'prod-001',
          productSku: 'LH-MILK-900G',
          productName: 'Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g',
          unit: 'Lon',
          currentStock: 340,
          adjustedQuantity: 2,
          unitPrice: 550000,
          lossValue: 1100000,
          reason: 'DAMAGED',
          note: 'Móp méo 2 lon',
        },
      ],
    },
    {
      id: 'adj-seed-002',
      adjustmentCode: 'PDC-20261020-002',
      warehouseId: 'WH01',
      warehouseName: 'Kho Tổng Miền Nam - LOHA WH01',
      reason: 'EXPIRED',
      reasonDetail: 'Sản phẩm cận date hỏng màng co và quá hạn sử dụng tại kệ B-02',
      totalLossValue: 560000,
      status: 'PENDING',
      creatorId: 'usr-wh-keeper',
      creatorName: 'Thủ kho Nguyễn Văn Kho',
      creatorRole: 'WAREHOUSE_KEEPER',
      note: 'Đề nghị duyệt huỷ để dọn dẹp kệ kho',
      createdAt: new Date(now - 3600000 * 4).toISOString(),
      updatedAt: new Date(now - 3600000 * 4).toISOString(),
      items: [
        {
          id: 'adj-item-002',
          productId: 'prod-002',
          productSku: 'LH-NUT-180ML',
          productName: 'Sữa Hạt Óc Chó Hạnh Nhân Organic 180ml',
          unit: 'Hộp',
          currentStock: 1200,
          adjustedQuantity: 20,
          unitPrice: 28000,
          lossValue: 560000,
          reason: 'EXPIRED',
          note: 'Hết hạn sử dụng lô EXP-202610',
        },
      ],
    },
  ];
};

const getLocalAdjustments = (): StockAdjustment[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const initial = getInitialDemoAdjustments();
  saveLocalAdjustments(initial);
  return initial;
};

const saveLocalAdjustments = (items: StockAdjustment[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch {}
};

export const inventoryAdjustmentsService = {
  /**
   * Lấy danh sách phiếu điều chỉnh tồn kho
   * GET /inventory/stock-adjustments
   */
  async getAdjustments(params?: QueryStockAdjustmentsParams): Promise<StockAdjustment[]> {
    try {
      const response = await apiClient.get<StockAdjustment[]>('/inventory/stock-adjustments', {
        params,
      });
      return response.data;
    } catch {
      let list = getLocalAdjustments();
      if (params?.status && params.status !== 'ALL') {
        list = list.filter((a) => a.status === params.status);
      }
      if (params?.reason && params.reason !== 'ALL') {
        list = list.filter((a) => a.reason === params.reason);
      }
      if (params?.search) {
        const s = params.search.toLowerCase();
        list = list.filter(
          (a) =>
            a.adjustmentCode.toLowerCase().includes(s) ||
            a.creatorName.toLowerCase().includes(s) ||
            (a.approverName && a.approverName.toLowerCase().includes(s)) ||
            (a.note && a.note.toLowerCase().includes(s)),
        );
      }
      return list;
    }
  },

  /**
   * Xem chi tiết phiếu điều chỉnh
   * GET /inventory/stock-adjustments/:id
   */
  async getAdjustmentById(id: string): Promise<StockAdjustment> {
    try {
      const response = await apiClient.get<StockAdjustment>(`/inventory/stock-adjustments/${id}`);
      return response.data;
    } catch {
      const list = getLocalAdjustments();
      const item = list.find((a) => a.id === id || a.adjustmentCode === id);
      if (!item) {
        throw new Error(`Không tìm thấy phiếu điều chỉnh ${id}`);
      }
      return item;
    }
  },

  /**
   * Lập phiếu điều chỉnh tồn kho mới (Chờ duyệt)
   * POST /inventory/stock-adjustments
   */
  async createAdjustment(payload: CreateStockAdjustmentPayload): Promise<StockAdjustment> {
    try {
      const response = await apiClient.post<StockAdjustment>(
        '/inventory/stock-adjustments',
        payload,
      );
      return response.data;
    } catch {
      const list = getLocalAdjustments();
      const user = getStoredUser();
      const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const rand = Math.floor(1000 + Math.random() * 9000);
      const adjustmentCode = `PDC-${dateStr}-${rand}`;
      const newId = `adj-local-${Date.now()}`;

      const items = payload.items.map((it, idx) => ({
        id: `item-${Date.now()}-${idx + 1}`,
        productId: it.productId,
        productSku: it.productSku,
        productName: it.productName,
        unit: it.unit,
        currentStock: it.currentStock,
        adjustedQuantity: it.adjustedQuantity,
        unitPrice: it.unitPrice,
        lossValue: it.lossValue,
        reason: it.reason,
        note: it.note,
      }));

      const newAdjustment: StockAdjustment = {
        id: newId,
        adjustmentCode,
        warehouseId: payload.warehouseId || 'WH01',
        warehouseName: payload.warehouseName || 'Kho Tổng Miền Nam - LOHA WH01',
        reason: payload.reason,
        reasonDetail: payload.reasonDetail,
        totalLossValue: payload.totalLossValue,
        status: 'PENDING',
        items,
        creatorId: user?.id || (user as any)?.userId || 'usr-local',
        creatorName: (user as any)?.fullName || user?.username || 'Thủ kho',
        creatorRole: 'WAREHOUSE_KEEPER',
        note: payload.note,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      list.unshift(newAdjustment);
      saveLocalAdjustments(list);
      return newAdjustment;
    }
  },

  /**
   * Phê duyệt phiếu điều chỉnh tồn kho (Chỉ Quản lý kho, creator !== approver)
   * PATCH /inventory/stock-adjustments/:id/approve
   */
  async approveAdjustment(id: string): Promise<StockAdjustment> {
    try {
      const response = await apiClient.patch<StockAdjustment>(
        `/inventory/stock-adjustments/${id}/approve`,
      );
      return response.data;
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message;
      if (serverMsg) throw new Error(serverMsg);

      const list = getLocalAdjustments();
      const user = getStoredUser();
      const index = list.findIndex((a) => a.id === id || a.adjustmentCode === id);
      if (index === -1) throw new Error(`Không tìm thấy phiếu điều chỉnh ${id}`);

      const item = list[index];
      const approverId = user?.id || (user as any)?.userId;
      if (approverId && item.creatorId && approverId === item.creatorId) {
        throw new Error(
          'Chỉ Quản lý kho được duyệt và người lập với người duyệt không được là một người (Quy tắc SN-214: creatorId !== approverId).',
        );
      }

      item.status = 'APPROVED';
      item.approverId = approverId || 'usr-wh-manager';
      item.approverName = (user as any)?.fullName || user?.username || 'Quản lý kho';
      item.approvedAt = new Date().toISOString();
      item.updatedAt = new Date().toISOString();

      list[index] = item;
      saveLocalAdjustments(list);
      return item;
    }
  },

  /**
   * Từ chối phiếu điều chỉnh tồn kho
   * PATCH /inventory/stock-adjustments/:id/reject
   */
  async rejectAdjustment(
    id: string,
    payload: RejectStockAdjustmentPayload,
  ): Promise<StockAdjustment> {
    try {
      const response = await apiClient.patch<StockAdjustment>(
        `/inventory/stock-adjustments/${id}/reject`,
        payload,
      );
      return response.data;
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message;
      if (serverMsg) throw new Error(serverMsg);

      const list = getLocalAdjustments();
      const user = getStoredUser();
      const index = list.findIndex((a) => a.id === id || a.adjustmentCode === id);
      if (index === -1) throw new Error(`Không tìm thấy phiếu điều chỉnh ${id}`);

      const item = list[index];
      item.status = 'REJECTED';
      item.rejectReason = payload.rejectReason;
      item.approverId = user?.id || (user as any)?.userId || 'usr-wh-manager';
      item.approverName = (user as any)?.fullName || user?.username || 'Quản lý kho';
      item.updatedAt = new Date().toISOString();

      list[index] = item;
      saveLocalAdjustments(list);
      return item;
    }
  },
};
