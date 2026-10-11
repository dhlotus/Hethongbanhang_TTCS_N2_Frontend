import { apiClient } from './api';
import type {
  InventoryAudit,
  CreateInventoryAuditPayload,
  UpdateAuditItemsPayload,
  CompleteAuditPayload,
  QueryAuditsParams,
} from '../types/inventory-audit.types';

// Dữ liệu mẫu demo lưu trong localStorage hoặc in-memory khi không kết nối Backend
const LOCAL_STORAGE_KEY = 'loha_inventory_audits_local';

const getLocalAudits = (): InventoryAudit[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    {
      id: 'audit-demo-001',
      auditCode: 'PKK-20261009-1024',
      warehouseId: 'WH01',
      warehouseName: 'Kho Tổng Miền Nam - LOHA WH01',
      scope: 'ALL',
      status: 'COMPLETED',
      note: 'Kiểm kê định kỳ đầu tháng 10/2026',
      totalBookQuantity: 1540,
      totalActualQuantity: 1538,
      totalDifferenceQuantity: -2,
      creatorId: 'usr-wh-keeper',
      creatorName: 'Thủ kho Nguyễn Văn Kho',
      completedById: 'usr-wh-manager',
      completedByName: 'Quản lý kho Trần Văn Quản',
      completedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      reason: 'Hao hụt tự nhiên do móp méo trong bốc xếp',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      items: [
        {
          id: 'item-demo-001',
          productId: 'prod-001',
          productSku: 'LH-MILK-900G',
          productName: 'Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g',
          categoryName: 'Sữa Bột',
          unit: 'Lon',
          bookQuantity: 340,
          actualQuantity: 338,
          difference: -2,
          differenceAmount: -1100000,
          unitPrice: 550000,
          note: 'Móp méo 2 lon khi bốc dỡ',
        },
        {
          id: 'item-demo-002',
          productId: 'prod-002',
          productSku: 'LH-NUT-180ML',
          productName: 'Sữa Hạt Óc Chó Hạnh Nhân Organic 180ml',
          categoryName: 'Sữa Hạt',
          unit: 'Hộp',
          bookQuantity: 1200,
          actualQuantity: 1200,
          difference: 0,
          differenceAmount: 0,
          unitPrice: 28000,
          note: 'Khớp số lượng sổ sách',
        },
      ],
    },
  ];
};

const saveLocalAudits = (audits: InventoryAudit[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(audits));
  } catch {}
};

export const inventoryAuditsService = {
  /**
   * Lấy danh sách phiếu kiểm kê
   * GET /inventory/audits
   */
  async getAudits(params?: QueryAuditsParams): Promise<InventoryAudit[]> {
    try {
      const response = await apiClient.get<InventoryAudit[]>('/inventory/audits', { params });
      return response.data;
    } catch {
      // Local fallback
      let list = getLocalAudits();
      if (params?.status) {
        list = list.filter((a) => a.status === params.status);
      }
      if (params?.search) {
        const s = params.search.toLowerCase();
        list = list.filter(
          (a) =>
            a.auditCode.toLowerCase().includes(s) ||
            a.creatorName.toLowerCase().includes(s) ||
            (a.note && a.note.toLowerCase().includes(s)),
        );
      }
      return list;
    }
  },

  /**
   * Xem chi tiết phiếu kiểm kê
   * GET /inventory/audits/:id
   */
  async getAuditById(id: string): Promise<InventoryAudit> {
    try {
      const response = await apiClient.get<InventoryAudit>(`/inventory/audits/${id}`);
      return response.data;
    } catch {
      const list = getLocalAudits();
      const item = list.find((a) => a.id === id || a.auditCode === id);
      if (!item) {
        throw new Error(`Không tìm thấy phiếu kiểm kê ${id}`);
      }
      return item;
    }
  },

  /**
   * Tạo phiếu kiểm kê
   * POST /inventory/audits
   */
  async createAudit(payload: CreateInventoryAuditPayload): Promise<InventoryAudit> {
    try {
      const response = await apiClient.post<InventoryAudit>('/inventory/audits', payload);
      return response.data;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
        const serverMsg = axiosErr.response?.data?.message;
        if (serverMsg) {
          throw new Error(Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg);
        }
      }

      // Local fallback tạo phiếu mới
      const list = getLocalAudits();
      const now = new Date();
      const codeDate = now.toISOString().slice(2, 10).replace(/-/g, '');
      const newAudit: InventoryAudit = {
        id: `audit-local-${Date.now()}`,
        auditCode: `PKK-${codeDate}-${Math.floor(1000 + Math.random() * 9000)}`,
        warehouseId: payload.warehouseId || 'WH01',
        warehouseName: payload.warehouseName || 'Kho Tổng Miền Nam - LOHA WH01',
        scope: payload.scope || 'ALL',
        categoryId: payload.categoryId,
        categoryName: payload.categoryName,
        status: 'DRAFT',
        note: payload.note,
        items: [
          {
            id: 'item-local-1',
            productId: 'prod-001',
            productSku: 'LH-MILK-900G',
            productName: 'Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g',
            categoryName: 'Sữa Bột',
            unit: 'Lon',
            bookQuantity: 340,
            actualQuantity: null,
            difference: 0,
            differenceAmount: 0,
            unitPrice: 550000,
          },
          {
            id: 'item-local-2',
            productId: 'prod-002',
            productSku: 'LH-NUT-180ML',
            productName: 'Sữa Hạt Óc Chó Hạnh Nhân Organic 180ml',
            categoryName: 'Sữa Hạt',
            unit: 'Hộp',
            bookQuantity: 1200,
            actualQuantity: null,
            difference: 0,
            differenceAmount: 0,
            unitPrice: 28000,
          },
          {
            id: 'item-local-3',
            productId: 'prod-003',
            productSku: 'LH-NEST-70ML',
            productName: 'Nước Yến Sào Chưng Đường Phèn 70ml',
            categoryName: 'Yến Sào',
            unit: 'Hũ',
            bookQuantity: 450,
            actualQuantity: null,
            difference: 0,
            differenceAmount: 0,
            unitPrice: 42000,
          },
        ],
        totalBookQuantity: 1990,
        totalActualQuantity: 1990,
        totalDifferenceQuantity: 0,
        creatorId: 'current-user',
        creatorName: 'Người dùng hiện tại',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      list.unshift(newAudit);
      saveLocalAudits(list);
      return newAudit;
    }
  },

  /**
   * Cập nhật số đếm thực tế
   * PUT /inventory/audits/:id/items
   */
  async updateAuditItems(id: string, payload: UpdateAuditItemsPayload): Promise<InventoryAudit> {
    try {
      const response = await apiClient.put<InventoryAudit>(`/inventory/audits/${id}/items`, payload);
      return response.data;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
        const serverMsg = axiosErr.response?.data?.message;
        if (serverMsg) {
          throw new Error(Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg);
        }
      }

      // Local fallback
      const list = getLocalAudits();
      const audit = list.find((a) => a.id === id);
      if (!audit) throw new Error('Không tìm thấy phiếu kiểm kê');

      const map = new Map(payload.items.map((i) => [i.productId, i]));
      for (const it of audit.items) {
        const match = map.get(it.productId);
        if (match) {
          it.actualQuantity = match.actualQuantity;
          it.difference = it.actualQuantity - it.bookQuantity;
          it.differenceAmount = it.difference * (it.unitPrice || 0);
          if (match.note !== undefined) it.note = match.note;
        }
      }
      audit.totalActualQuantity = audit.items.reduce(
        (sum, it) => sum + (it.actualQuantity ?? it.bookQuantity),
        0,
      );
      audit.totalDifferenceQuantity = audit.items.reduce((sum, it) => sum + it.difference, 0);
      audit.updatedAt = new Date().toISOString();
      saveLocalAudits(list);
      return audit;
    }
  },

  /**
   * Chốt kiểm kê điều chỉnh tồn về số thực đếm
   * POST /inventory/audits/:id/complete
   */
  async completeAudit(id: string, payload: CompleteAuditPayload): Promise<InventoryAudit> {
    try {
      const response = await apiClient.post<InventoryAudit>(
        `/inventory/audits/${id}/complete`,
        payload,
      );
      try {
        window.dispatchEvent(new CustomEvent('loha_inventory_updated'));
      } catch {}
      return response.data;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as {
          response?: { status?: number; data?: { message?: string | string[] } };
        };
        if (axiosErr.response?.status === 403) {
          throw new Error(
            'Chỉ Quản lý kho (WAREHOUSE_MANAGER) hoặc Quản trị viên mới có quyền chốt phiếu kiểm kê và điều chỉnh tồn kho!',
          );
        }
        const serverMsg = axiosErr.response?.data?.message;
        if (serverMsg) {
          throw new Error(Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg);
        }
      }

      // Local fallback
      const list = getLocalAudits();
      const audit = list.find((a) => a.id === id);
      if (!audit) throw new Error('Không tìm thấy phiếu kiểm kê');

      audit.status = 'COMPLETED';
      audit.reason = payload.reason;
      if (payload.note) audit.note = `${audit.note ? audit.note + ' | ' : ''}${payload.note}`;
      audit.completedAt = new Date().toISOString();
      audit.completedByName = 'Quản lý kho';
      audit.updatedAt = new Date().toISOString();
      saveLocalAudits(list);
      return audit;
    }
  },

  /**
   * Hủy phiếu kiểm kê
   * POST /inventory/audits/:id/cancel
   */
  async cancelAudit(id: string, reason?: string): Promise<InventoryAudit> {
    try {
      const response = await apiClient.post<InventoryAudit>(`/inventory/audits/${id}/cancel`, {
        reason,
      });
      return response.data;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
        const serverMsg = axiosErr.response?.data?.message;
        if (serverMsg) {
          throw new Error(Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg);
        }
      }

      const list = getLocalAudits();
      const audit = list.find((a) => a.id === id);
      if (!audit) throw new Error('Không tìm thấy phiếu kiểm kê');
      audit.status = 'CANCELLED';
      if (reason) audit.note = `${audit.note ? audit.note + ' | ' : ''}Lý do hủy: ${reason}`;
      audit.updatedAt = new Date().toISOString();
      saveLocalAudits(list);
      return audit;
    }
  },
};
