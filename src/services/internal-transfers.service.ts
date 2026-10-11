import { apiClient } from './api';
import { tokenStorage } from '../utils/token-storage';
import type {
  ConfirmTransferReceiptPayload,
  CreateTransferPayload,
  InternalTransfer,
  InternalTransferItem,
  TransferFilterParams,
} from '../types/internal-transfer.types';
import { MOCK_PRODUCTS } from './products.service';

const LOCAL_STORAGE_KEY = 'loha_internal_transfers';

/**
 * Dữ liệu mẫu ban đầu cho chuyển kho nội bộ
 */
const INITIAL_MOCK_TRANSFERS: InternalTransfer[] = [
  {
    id: 'itf-seed-001',
    code: 'CK-261011-0001',
    fromWarehouseId: '11111111-0000-0000-0000-000000000001',
    fromWarehouseName: 'Kho Tổng Miền Nam',
    toWarehouseId: '11111111-0000-0000-0000-000000000002',
    toWarehouseName: 'Kho Phân Phối Hà Nội',
    status: 'IN_TRANSIT',
    notes: 'Điều chuyển bổ sung hàng dự trữ đợt khuyến mãi miền Bắc',
    createdBy: 'user-001',
    createdByName: 'Nguyễn Văn Kho',
    transferredAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    items: [
      {
        id: 'iti-001',
        transferId: 'itf-seed-001',
        productId: 'prod-001',
        sku: 'LH-MILK-900G',
        productName: 'Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g',
        unit: 'Thùng',
        conversionRate: 24,
        baseUnit: 'Lon',
        transferQuantity: 10,
        baseTransferQuantity: 240,
      },
      {
        id: 'iti-002',
        transferId: 'itf-seed-001',
        productId: 'prod-004',
        sku: 'LH-CEREAL-500G',
        productName: 'Ngũ Cốc Dinh Dưỡng Cao Cấp Loha Cereal 500g',
        unit: 'Thùng',
        conversionRate: 20,
        baseUnit: 'Gói',
        transferQuantity: 15,
        baseTransferQuantity: 300,
      },
    ],
  },
  {
    id: 'itf-seed-002',
    code: 'CK-261010-0002',
    fromWarehouseId: '11111111-0000-0000-0000-000000000001',
    fromWarehouseName: 'Kho Tổng Miền Nam',
    toWarehouseId: '11111111-0000-0000-0000-000000000003',
    toWarehouseName: 'Kho Vùng Tây Nam Bộ',
    status: 'COMPLETED',
    notes: 'Cấp hàng định kỳ cho kho Cần Thơ',
    createdBy: 'user-001',
    createdByName: 'Nguyễn Văn Kho',
    transferredAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    receivedBy: 'user-002',
    receivedByName: 'Trần Thị Nhận',
    receivedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    items: [
      {
        id: 'iti-003',
        transferId: 'itf-seed-002',
        productId: 'prod-002',
        sku: 'LH-NUT-180ML',
        productName: 'Sữa Hạt Óc Chó Nguyên Chất Loha Nut 180ml',
        unit: 'Thùng',
        conversionRate: 48,
        baseUnit: 'Hộp',
        transferQuantity: 20,
        baseTransferQuantity: 960,
        receivedQuantity: 20,
        baseReceivedQuantity: 960,
        discrepancyQuantity: 0,
      },
    ],
  },
  {
    id: 'itf-seed-003',
    code: 'CK-261009-0003',
    fromWarehouseId: '11111111-0000-0000-0000-000000000002',
    fromWarehouseName: 'Kho Phân Phối Hà Nội',
    toWarehouseId: '11111111-0000-0000-0000-000000000001',
    toWarehouseName: 'Kho Tổng Miền Nam',
    status: 'PARTIALLY_RECEIVED',
    notes: 'Hồi chuyển hàng thừa từ kho Hà Nội về kho tổng',
    createdBy: 'user-003',
    createdByName: 'Lê Văn Bắc',
    transferredAt: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
    receivedBy: 'user-001',
    receivedByName: 'Nguyễn Văn Kho',
    receivedAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    discrepancyReason: 'Xe chở hàng phanh gấp làm bẹp 2 thùng sữa bột khi dỡ hàng',
    createdAt: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
    items: [
      {
        id: 'iti-004',
        transferId: 'itf-seed-003',
        productId: 'prod-001',
        sku: 'LH-MILK-900G',
        productName: 'Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g',
        unit: 'Thùng',
        conversionRate: 24,
        baseUnit: 'Lon',
        transferQuantity: 25,
        baseTransferQuantity: 600,
        receivedQuantity: 23,
        baseReceivedQuantity: 552,
        discrepancyQuantity: 2,
        discrepancyReason: 'Bị bẹp móp biến dạng nặng 2 thùng khi vận chuyển, không đạt chuẩn nhập kho',
      },
    ],
  },
];

/**
 * Đọc dữ liệu local fallback
 */
const getStoredTransfers = (): InternalTransfer[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_TRANSFERS));
      return INITIAL_MOCK_TRANSFERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_MOCK_TRANSFERS;
  }
};

/**
 * Lưu dữ liệu local fallback
 */
const saveStoredTransfers = (transfers: InternalTransfer[]): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(transfers));
  } catch (error) {
    console.error('Không thể lưu phiếu chuyển kho vào localStorage:', error);
  }
};

/**
 * Service gọi API và quản lý Phiếu Chuyển kho Nội bộ (SN-181)
 */
export const internalTransfersService = {
  /**
   * Lấy danh sách phiếu chuyển kho theo bộ lọc
   */
  async getTransfers(params?: TransferFilterParams): Promise<InternalTransfer[]> {
    const token = tokenStorage.getAccessToken();
    const isDemoToken = Boolean(token && token.startsWith('demo-jwt-'));

    if (isDemoToken) {
      let list = getStoredTransfers();
      if (params?.status) {
        list = list.filter((t) => t.status === params.status);
      }
      if (params?.fromWarehouseId) {
        list = list.filter((t) => t.fromWarehouseId === params.fromWarehouseId);
      }
      if (params?.toWarehouseId) {
        list = list.filter((t) => t.toWarehouseId === params.toWarehouseId);
      }
      if (params?.search?.trim()) {
        const q = params.search.trim().toLowerCase();
        list = list.filter(
          (t) =>
            t.code.toLowerCase().includes(q) ||
            t.fromWarehouseName.toLowerCase().includes(q) ||
            t.toWarehouseName.toLowerCase().includes(q) ||
            t.items.some(
              (i) => i.sku.toLowerCase().includes(q) || i.productName.toLowerCase().includes(q),
            ),
        );
      }
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    try {
      const response = await apiClient.get<InternalTransfer[]>('/internal-transfers', {
        params,
      });
      return response.data;
    } catch {
      // Fallback khi backend chưa kết nối
      let list = getStoredTransfers();
      if (params?.status) {
        list = list.filter((t) => t.status === params.status);
      }
      if (params?.fromWarehouseId) {
        list = list.filter((t) => t.fromWarehouseId === params.fromWarehouseId);
      }
      if (params?.toWarehouseId) {
        list = list.filter((t) => t.toWarehouseId === params.toWarehouseId);
      }
      if (params?.search?.trim()) {
        const q = params.search.trim().toLowerCase();
        list = list.filter(
          (t) =>
            t.code.toLowerCase().includes(q) ||
            t.fromWarehouseName.toLowerCase().includes(q) ||
            t.toWarehouseName.toLowerCase().includes(q) ||
            t.items.some(
              (i) => i.sku.toLowerCase().includes(q) || i.productName.toLowerCase().includes(q),
            ),
        );
      }
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  },

  /**
   * Lấy chi tiết một phiếu chuyển kho
   */
  async getTransferById(id: string): Promise<InternalTransfer> {
    const token = tokenStorage.getAccessToken();
    const isDemoToken = Boolean(token && token.startsWith('demo-jwt-'));

    if (isDemoToken) {
      const list = getStoredTransfers();
      const found = list.find((t) => t.id === id || t.code === id);
      if (!found) throw new Error(`Không tìm thấy phiếu chuyển kho "${id}"`);
      return found;
    }

    try {
      const response = await apiClient.get<InternalTransfer>(`/internal-transfers/${id}`);
      return response.data;
    } catch {
      const list = getStoredTransfers();
      const found = list.find((t) => t.id === id || t.code === id);
      if (!found) throw new Error(`Không tìm thấy phiếu chuyển kho "${id}"`);
      return found;
    }
  },

  /**
   * Lập phiếu chuyển kho mới
   */
  async createTransfer(payload: CreateTransferPayload): Promise<InternalTransfer> {
    const token = tokenStorage.getAccessToken();
    const isDemoToken = Boolean(token && token.startsWith('demo-jwt-'));

    if (!isDemoToken) {
      try {
        const response = await apiClient.post<InternalTransfer>('/internal-transfers', payload);
        return response.data;
      } catch (err) {
        // Nếu lỗi mạng, thử fallback dưới local
        console.warn('API error, falling back to local storage handler', err);
      }
    }

    // Xử lý tạo chuyển kho offline/demo
    const list = getStoredTransfers();
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const code = `CK-${yy}${mm}${dd}-${String(list.length + 1).padStart(4, '0')}`;

    const warehouseNames: Record<string, string> = {
      '11111111-0000-0000-0000-000000000001': 'Kho Tổng Miền Nam',
      '11111111-0000-0000-0000-000000000002': 'Kho Phân Phối Hà Nội',
      '11111111-0000-0000-0000-000000000003': 'Kho Vùng Tây Nam Bộ',
    };

    const items: InternalTransferItem[] = payload.items.map((raw, idx) => {
      const prod = MOCK_PRODUCTS.find((p) => p.id === raw.productId || p.sku === raw.productId) || {
        id: raw.productId,
        sku: raw.productId,
        name: raw.productId,
        baseUnit: 'Đơn vị',
        units: [],
      };

      const unitObj = prod.units?.find((u) => u.unitName === raw.unit);
      const rate = unitObj?.conversionRate || 1;

      return {
        id: `iti-${Date.now()}-${idx}`,
        transferId: '',
        productId: prod.id,
        sku: prod.sku,
        productName: prod.name,
        unit: raw.unit,
        conversionRate: rate,
        baseUnit: prod.baseUnit || 'Đơn vị',
        transferQuantity: raw.transferQuantity,
        baseTransferQuantity: Math.round(raw.transferQuantity * rate),
        notes: raw.notes || '',
      };
    });

    const isDraft = Boolean(payload.isDraft);
    const newTransfer: InternalTransfer = {
      id: `itf-${Date.now()}`,
      code,
      fromWarehouseId: payload.fromWarehouseId,
      fromWarehouseName: warehouseNames[payload.fromWarehouseId] || 'Kho Xuất',
      toWarehouseId: payload.toWarehouseId,
      toWarehouseName: warehouseNames[payload.toWarehouseId] || 'Kho Nhập',
      status: isDraft ? 'DRAFT' : 'IN_TRANSIT',
      notes: payload.notes || '',
      createdBy: 'user-current',
      createdByName: 'Nhân viên kho',
      createdAt: now.toISOString(),
      transferredAt: isDraft ? undefined : now.toISOString(),
      items,
    };

    items.forEach((item) => {
      item.transferId = newTransfer.id;
    });

    list.unshift(newTransfer);
    saveStoredTransfers(list);
    return newTransfer;
  },

  /**
   * Kho đến xác nhận nhận hàng và xử lý chênh lệch
   */
  async confirmReceipt(
    id: string,
    payload: ConfirmTransferReceiptPayload,
  ): Promise<InternalTransfer> {
    const token = tokenStorage.getAccessToken();
    const isDemoToken = Boolean(token && token.startsWith('demo-jwt-'));

    if (!isDemoToken) {
      try {
        const response = await apiClient.patch<InternalTransfer>(
          `/internal-transfers/${id}/confirm`,
          payload,
        );
        return response.data;
      } catch (err) {
        console.warn('API error, falling back to local storage handler', err);
      }
    }

    // Xử lý xác nhận nhận hàng offline/demo
    const list = getStoredTransfers();
    const transfer = list.find((t) => t.id === id || t.code === id);
    if (!transfer) throw new Error('Không tìm thấy phiếu chuyển kho');

    const itemMap = new Map(payload.items.map((i) => [i.itemId, i]));

    for (const item of transfer.items) {
      const confirmItem = itemMap.get(item.id) || itemMap.get(item.productId);
      if (!confirmItem) continue;

      const received = confirmItem.receivedQuantity;
      const discrepancy = item.transferQuantity - received;

      if (discrepancy !== 0) {
        const reason = confirmItem.discrepancyReason?.trim() || payload.generalDiscrepancyReason?.trim();
        if (!reason) {
          throw new Error(
            `Mặt hàng "${item.productName}" có chênh lệch ${discrepancy > 0 ? 'thiếu' : 'thừa'} ${Math.abs(discrepancy)} ${item.unit}. Bắt buộc phải nhập lý do chênh lệch!`,
          );
        }
        item.discrepancyReason = reason;
      }

      item.receivedQuantity = received;
      item.baseReceivedQuantity = Math.round(received * item.conversionRate);
      item.discrepancyQuantity = discrepancy;
    }

    const hasDiscrepancy = transfer.items.some((item) => (item.discrepancyQuantity ?? 0) !== 0);
    transfer.status = hasDiscrepancy ? 'PARTIALLY_RECEIVED' : 'COMPLETED';
    transfer.receivedBy = 'user-current';
    transfer.receivedByName = 'Thủ kho nhận';
    transfer.receivedAt = new Date().toISOString();
    transfer.discrepancyReason = payload.generalDiscrepancyReason?.trim() || transfer.discrepancyReason;
    transfer.updatedAt = new Date().toISOString();

    saveStoredTransfers(list);
    return transfer;
  },

  /**
   * Hủy phiếu chuyển kho
   */
  async cancelTransfer(id: string): Promise<InternalTransfer> {
    const token = tokenStorage.getAccessToken();
    const isDemoToken = Boolean(token && token.startsWith('demo-jwt-'));

    if (!isDemoToken) {
      try {
        const response = await apiClient.patch<InternalTransfer>(
          `/internal-transfers/${id}/cancel`,
        );
        return response.data;
      } catch (err) {
        console.warn('API error, falling back to local storage handler', err);
      }
    }

    const list = getStoredTransfers();
    const transfer = list.find((t) => t.id === id || t.code === id);
    if (!transfer) throw new Error('Không tìm thấy phiếu chuyển kho');

    transfer.status = 'CANCELLED';
    transfer.updatedAt = new Date().toISOString();
    saveStoredTransfers(list);
    return transfer;
  },
};
