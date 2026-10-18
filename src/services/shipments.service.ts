import { apiClient } from './api';
import { syncDemoOrderStatus } from './orders.service';
import type { OrderStatus } from '../types/order';

export interface Shipment {
  id: string;
  orderId: string;
  orderCode: string;
  customerId: string;
  customerName: string;
  salesRepId?: string;
  warehouseId?: string;
  status: 'PENDING' | 'PICKING' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  deliveryAddress?: string;
  receiverName?: string;
  phone?: string;
  trackingNumber?: string;
  carrierName?: string;
  proofOfDeliveryUrl?: string;
  deliveryNote?: string;
  failureReason?: string;
  tripId?: string;
  tripCode?: string;
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
  items?: {
    id?: string;
    sku_code?: string;
    skuCode?: string;
    product_name?: string;
    productName?: string;
    quantity_requested?: number;
    quantity?: number;
    selected_batch_no?: string;
    selectedBatchNo?: string;
    fefo_suggested_batch_no?: string;
    fefoSuggestedBatchNo?: string;
    is_overridden?: boolean;
    isOverridden?: boolean;
    override_reason?: string | null;
    overrideReason?: string | null;
  }[];
}

export interface BatchItem {
  id: string;
  batchNumber: string;
  batchNo?: string;
  productSku: string;
  productName?: string;
  manufacturingDate?: string;
  expiryDate: string;
  quantity: number;
  availableQuantity: number;
  warehouseId?: string;
  warehouseName?: string;
  isFefoRecommended?: boolean;
}

export interface FefoSuggestionResult {
  suggestedBatch: BatchItem | null;
  allBatches: BatchItem[];
  isSufficient: boolean;
  requiredQuantity: number;
}

export interface CreateShipmentItemPayload {
  sku_code: string;
  product_name?: string;
  quantity_requested: number;
  selected_batch_no: string;
  fefo_suggested_batch_no?: string;
  is_overridden: boolean;
  override_reason?: string | null;
}

export interface CreateShipmentPayload {
  order_id: string;
  warehouse_id: string;
  customer_name?: string;
  receiver_name?: string;
  phone?: string;
  delivery_address?: string;
  shipping_carrier?: string;
  items: CreateShipmentItemPayload[];
}

export interface ConfirmDeliveryPayload {
  receiverName: string;
  deliveredAt: string;
  proofOfDeliveryUrl?: string; // base64 data URL hoặc hosted URL
  note?: string;
}

export interface ReportFailedDeliveryPayload {
  failureReason: string;
  note?: string;
}

const mapShipmentToOrderStatus = (shipmentStatus: Shipment['status']): OrderStatus => {
  switch (shipmentStatus) {
    case 'PENDING':
    case 'PICKING':
      return 'PROCESSING';
    case 'PACKED':
      return 'PACKED';
    case 'SHIPPED':
      return 'SHIPPED';
    case 'DELIVERED':
      return 'DELIVERED';
    case 'CANCELLED':
      return 'APPROVED';
    default:
      return 'PROCESSING';
  }
};

const notifyOrderSync = (shipment: Partial<Shipment>) => {
  const targetCode = shipment.orderCode || shipment.orderId;
  if (!targetCode) return;
  const orderStatus = shipment.status ? mapShipmentToOrderStatus(shipment.status) : 'PROCESSING';
  syncDemoOrderStatus(targetCode, orderStatus);
};

const LOCAL_SHIPMENTS_KEY = 'loha_local_shipments_list';

export const getStoredLocalShipments = (): Shipment[] => {
  try {
    const raw = localStorage.getItem(LOCAL_SHIPMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveStoredLocalShipments = (list: Shipment[]) => {
  try {
    localStorage.setItem(LOCAL_SHIPMENTS_KEY, JSON.stringify(list));
  } catch {}
};

export const shipmentsService = {
  async getShipments(params?: Record<string, string | number>): Promise<Shipment[]> {
    let serverList: Shipment[] = [];
    try {
      const res = await apiClient.get<Shipment[]>('/shipments', { params });
      if (Array.isArray(res.data)) {
        serverList = res.data;
      }
    } catch {
      serverList = [];
    }

    // Kết hợp cùng các phiếu xuất kho được chuyển từ luồng soạn hàng (Local / Synced)
    const localList = getStoredLocalShipments();
    const map = new Map<string, Shipment>();

    // Đưa server items vào map trước
    for (const s of serverList) {
      const key = s.orderCode || s.orderId || s.id;
      map.set(key, s);
    }

    // Đưa local items vào map (nếu chưa có hoặc để đảm bảo trạng thái mới nhất từ kho)
    for (const ls of localList) {
      const key = ls.orderCode || ls.orderId || ls.id;
      if (!map.has(key)) {
        map.set(key, ls);
      } else {
        map.set(key, { ...map.get(key)!, ...ls });
      }
    }

    const merged = Array.from(map.values());
    if (params?.status && params.status !== 'ALL') {
      return merged.filter((s) => s.status === params.status);
    }
    return merged;
  },

  async getShipmentById(id: string): Promise<Shipment> {
    try {
      const res = await apiClient.get<Shipment>(`/inventory/shipments/${id}`);
      if (res.data) return res.data;
    } catch {
      // Fallback to general shipments endpoint
    }
    try {
      const res = await apiClient.get<Shipment>(`/shipments/${id}`);
      if (res.data) return res.data;
    } catch {}

    const localList = getStoredLocalShipments();
    const found = localList.find((s) => s.id === id || s.orderCode === id);
    if (found) return found;

    throw new Error(`Không tìm thấy phiếu xuất kho ${id}`);
  },

  async createShipment(data: Partial<Shipment>): Promise<Shipment> {
    let created: Shipment;
    try {
      const res = await apiClient.post<Shipment>('/shipments', data);
      created = res.data;
    } catch {
      const id = data.id || `shp-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      created = {
        id,
        orderId: data.orderId || data.orderCode || id,
        orderCode: data.orderCode || data.orderId || id,
        customerId: data.customerId || 'cust-001',
        customerName: data.customerName || 'Đại lý',
        status: data.status || 'PENDING',
        deliveryAddress: data.deliveryAddress || 'Điểm giao kho chính',
        receiverName: data.receiverName || data.customerName || 'Người nhận',
        phone: data.phone || '0988123456',
        trackingNumber:
          data.trackingNumber ||
          `TRK-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
        carrierName: data.carrierName || 'Đội xe nội bộ LOHA',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...data,
      } as Shipment;
    }

    // Lưu vào local cache
    const current = getStoredLocalShipments();
    const filtered = current.filter((s) => s.id !== created.id && s.orderCode !== created.orderCode);
    saveStoredLocalShipments([created, ...filtered]);

    notifyOrderSync(created);
    return created;
  },

  /** SN-188: Tạo phiếu xuất kho kèm chi tiết lô xuất FEFO và kiểm soát ghi đè */
  async createFefoShipment(payload: CreateShipmentPayload): Promise<Shipment> {
    const res = await apiClient.post<Shipment>('/inventory/shipments', payload);
    notifyOrderSync(res.data);
    return res.data;
  },

  /** SN-188: Gợi ý lô xuất kho theo nguyên tắc FEFO */
  async suggestFefo(params: {
    skuCode: string;
    quantity: number;
    warehouseId?: string;
  }): Promise<FefoSuggestionResult> {
    const res = await apiClient.get<FefoSuggestionResult>('/inventory/batches/suggest-fefo', {
      params: {
        skuCode: params.skuCode,
        quantity: params.quantity,
        warehouseId: params.warehouseId,
      },
    });
    return res.data;
  },

  /** SN-188: Lấy danh sách tất cả các lô khả dụng của một SKU tại kho (phục vụ Popup Đổi Lô) */
  async getBatchesBySku(params: {
    skuCode: string;
    warehouseId?: string;
  }): Promise<BatchItem[]> {
    const res = await apiClient.get<any>('/inventory/batches/by-sku', {
      params: {
        skuCode: params.skuCode,
        warehouseId: params.warehouseId,
      },
    });
    if (Array.isArray(res.data)) {
      return res.data;
    }
    if (res.data && Array.isArray(res.data.batches)) {
      return res.data.batches;
    }
    return [];
  },

  async updateStatus(id: string, status: Shipment['status'], data?: Partial<Shipment>): Promise<Shipment> {
    const res = await apiClient.patch<Shipment>(`/shipments/${id}/status`, { status, ...data });
    notifyOrderSync(res.data);
    return res.data;
  },

  /** SN-198: Xác nhận giao hàng thành công kèm ảnh chứng từ */
  async confirmDelivery(id: string, payload: ConfirmDeliveryPayload): Promise<Shipment> {
    const res = await apiClient.post<Shipment>(`/shipments/${id}/confirm-delivery`, payload);
    notifyOrderSync(res.data);
    return res.data;
  },

  /** SN-198: Báo giao hàng không thành công, hàng quay về kho */
  async reportFailedDelivery(id: string, payload: ReportFailedDeliveryPayload): Promise<Shipment> {
    const res = await apiClient.post<Shipment>(`/shipments/${id}/failed-delivery`, payload);
    notifyOrderSync(res.data);
    return res.data;
  },

  async confirmShipment(id: string): Promise<Shipment> {
    const res = await apiClient.post<Shipment>(`/shipments/${id}/confirm`);
    notifyOrderSync(res.data);
    return res.data;
  },

  async deleteShipment(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/shipments/${id}`);
    return res.data;
  },
};


