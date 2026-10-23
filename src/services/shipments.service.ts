import { apiClient } from './api';
import { syncDemoOrderStatus, getStoredDemoOrders } from './orders.service';
import type { Order, OrderStatus } from '../types/order';

export interface ShipmentLine {
  id: string;
  shipmentId: string;
  orderLineId: string;
  productId: string;
  productSku: string;
  productName: string;
  unitName: string;
  conversionRate: number;
  orderedQuantity: number;
  shippedQuantity: number;
  remainingQuantity: number;
  isShortDelivery: boolean;
  shortDeliveryReason?: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  orderCode: string;
  customerId: string;
  customerName: string;
  salesRepId?: string;
  warehouseId?: string;
  status: 'PENDING' | 'PICKING' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  isConfirmed?: boolean;
  confirmedAt?: string;
  confirmedBy?: string;
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
  lines?: ShipmentLine[];
  hasShortDelivery?: boolean;
  note?: string;
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
  const targetCode = shipment.orderCode || shipment.orderId || shipment.id;
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

/**
 * Chuyển một Đơn hàng trong "Quản lý đơn hàng" thành một Phiếu xuất kho đồng bộ
 */
export function buildShipmentFromOrder(order: Order): Shipment {
  let status: Shipment['status'] = 'PENDING';
  if (order.status === 'SHIPPED' || order.status === 'DISPATCHED') {
    status = 'SHIPPED';
  } else if (order.status === 'PACKED') {
    status = 'PACKED';
  } else if (order.status === 'DELIVERED') {
    status = 'DELIVERED';
  } else if (order.status === 'PROCESSING') {
    status = 'PICKING';
  } else if (order.status === 'CANCELLED') {
    status = 'CANCELLED';
  }

  const numPart = (order.orderCode || '').replace(/^[^\d]+/, '') || '10088';
  return {
    id: `shp-${order.id || order.orderCode}`,
    orderId: order.id || '',
    orderCode: order.orderCode || order.id || '',
    customerId: order.customerId,
    customerName: order.customerName || '',
    salesRepId: order.salesRepId,
    warehouseId: (order as any).warehouseId || 'wh-002',
    status,
    deliveryAddress: order.deliveryPoint?.address || 'Kho nhận hàng chính',
    receiverName: order.deliveryPoint?.receiverName || order.customerName || '',
    phone: order.deliveryPoint?.phone || (order as any).phone || '0901234561',
    trackingNumber: (order as any).trackingNumber || `TRK-2026-${numPart}`,
    carrierName: (order as any).carrierName || 'LOHA Fleet Logistics',
    tripCode: (order as any).tripCode || `TRIP-${numPart}`,
    shippedAt: (order as any).shippedAt || (order as any).dispatchedAt || order.createdAt,
    deliveredAt: (order as any).deliveredAt,
    createdAt: order.createdAt || new Date().toISOString(),
    updatedAt: order.updatedAt || order.createdAt || new Date().toISOString(),
    items: (order.lines || []).map((l, i) => ({
      id: l.id || `line-${i}`,
      skuCode: l.productSku,
      productName: l.productName,
      quantity: l.quantity,
      selectedBatchNo: `BATCH-2026-${100 + i}`,
      fefoSuggestedBatchNo: `BATCH-2026-${100 + i}`,
      isOverridden: false,
    })),
  };
}

export interface PaginatedShipmentsResponse {
  data: Shipment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ShipmentQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  orderId?: string;
  orderCode?: string;
}

export interface ConfirmExportLinePayload {
  orderLineId: string;
  shippedQuantity: number;
  shortDeliveryReason?: string;
}

export interface ConfirmExportPayload {
  lines?: ConfirmExportLinePayload[];
  carrierName?: string;
  trackingNumber?: string;
  note?: string;
}

export const shipmentsService = {
  async getShipments(params?: Record<string, string | number | boolean>): Promise<Shipment[]> {
    // 1. Lấy dữ liệu đơn hàng chính thức từ "Quản lý đơn hàng"
    const allOrders = getStoredDemoOrders();
    const orderMap = new Map<string, Order>();
    allOrders.forEach((o) => {
      if (o.orderCode) orderMap.set(o.orderCode.toUpperCase(), o);
      if (o.id) orderMap.set(o.id.toUpperCase(), o);
    });

    // 2. Thử lấy danh sách phiếu từ server
    let serverList: Shipment[] = [];
    try {
      const res = await apiClient.get<Shipment[]>('/shipments', { params });
      if (Array.isArray(res.data)) {
        serverList = res.data;
      }
    } catch {
      serverList = [];
    }

    // 3. Kết hợp cùng các phiếu xuất kho lưu cục bộ
    const localList = getStoredLocalShipments();
    const map = new Map<string, Shipment>();

    // Đưa server items vào map (chỉ giữ các đơn tồn tại trong Quản lý đơn hàng)
    for (const s of serverList) {
      const key = (s.orderCode || s.orderId || s.id).toUpperCase();
      if (orderMap.has(key)) {
        map.set(key, s);
      }
    }

    // Đưa local items vào map
    for (const ls of localList) {
      const key = (ls.orderCode || ls.orderId || ls.id).toUpperCase();
      if (orderMap.has(key)) {
        if (!map.has(key)) {
          map.set(key, ls);
        } else {
          map.set(key, { ...map.get(key)!, ...ls });
        }
      }
    }

    // 4. Đồng bộ hóa với tất cả đơn hàng từ "Quản lý đơn hàng"
    for (const order of allOrders) {
      const key = (order.orderCode || order.id || '').toUpperCase();
      // Tạo phiếu xuất cho các đơn đã qua xét duyệt hoặc đang xử lý kho / giao hàng
      if (['APPROVED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'].includes(order.status)) {
        if (!map.has(key)) {
          map.set(key, buildShipmentFromOrder(order));
        } else {
          // Đồng bộ trạng thái đơn hàng và thông tin khách hàng từ orderMap
          const existing = map.get(key)!;
          let syncedStatus = existing.status;
          if (order.status === 'SHIPPED' || order.status === 'DISPATCHED') {
            syncedStatus = 'SHIPPED';
          } else if (order.status === 'PACKED') {
            syncedStatus = 'PACKED';
          } else if (order.status === 'DELIVERED') {
            syncedStatus = 'DELIVERED';
          } else if (order.status === 'PROCESSING') {
            syncedStatus = existing.status === 'PENDING' ? 'PICKING' : existing.status;
          } else if (order.status === 'CANCELLED') {
            syncedStatus = 'CANCELLED';
          }

          map.set(key, {
            ...existing,
            orderCode: order.orderCode || existing.orderCode,
            customerId: order.customerId || existing.customerId,
            customerName: order.customerName || existing.customerName,
            receiverName: order.deliveryPoint?.receiverName || existing.receiverName,
            phone: order.deliveryPoint?.phone || existing.phone,
            deliveryAddress: order.deliveryPoint?.address || existing.deliveryAddress,
            status: syncedStatus,
          });
        }
      }
    }

    const merged = Array.from(map.values());
    // Sắp xếp các phiếu mới nhất lên đầu
    merged.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());

    if (params?.status && params.status !== 'ALL') {
      return merged.filter((s) => s.status === params.status);
    }
    return merged;
  },

  async getPaginatedShipments(params?: ShipmentQueryParams | Record<string, string | number | boolean>): Promise<PaginatedShipmentsResponse> {
    const res = await apiClient.get<any>('/shipments', { params });
    if (Array.isArray(res.data)) {
      const page = Number(params?.page) || 1;
      const limit = Number(params?.limit) || 10;
      const total = res.data.length;
      return {
        data: res.data.slice((page - 1) * limit, page * limit),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }
    return {
      data: res.data?.data || [],
      total: typeof res.data?.total === 'number' ? res.data.total : (res.data?.data?.length || 0),
      page: Number(res.data?.page) || Number(params?.page) || 1,
      limit: Number(res.data?.limit) || Number(params?.limit) || 10,
      totalPages: Number(res.data?.totalPages) || 1,
    };
  },

  async getBackorders(): Promise<Shipment[]> {
    const res = await apiClient.get<Shipment[]>('/shipments/backorders');
    return res.data;
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
    let result: Shipment;
    try {
      const res = await apiClient.patch<Shipment>(`/shipments/${id}/status`, { status, ...data });
      result = res.data;
    } catch {
      const current = getStoredLocalShipments();
      let found = current.find((s) => s.id === id);
      if (found) {
        found = { ...found, status, ...data, updatedAt: new Date().toISOString() };
        result = found;
      } else {
        result = { id, status, ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Shipment;
      }
    }

    const current = getStoredLocalShipments();
    const exists = current.some((s) => s.id === id || s.id === result.id);
    const updated = exists
      ? current.map((s) => (s.id === id || s.id === result.id ? { ...s, ...result, status } : s))
      : [result, ...current];
    saveStoredLocalShipments(updated);

    notifyOrderSync(result);

    try {
      window.dispatchEvent(new CustomEvent('loha_shipments_updated', { detail: { id, status } }));
      window.dispatchEvent(new CustomEvent('loha_orders_updated', { detail: { orderCode: result.orderCode, status } }));
    } catch {}

    return result;
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

  /**
   * Xác nhận xuất kho và xử lý giao thiếu (SN-195)
   */
  async confirmExport(id: string, payload: ConfirmExportPayload): Promise<Shipment> {
    const res = await apiClient.post<Shipment>(`/shipments/${id}/confirm-export`, payload);
    notifyOrderSync(res.data);
    return res.data;
  },

  /**
   * Tạo phiếu xuất đợt sau (Backorder) cho đơn còn nợ hàng (SN-195)
   */
  async createBackorder(orderId: string): Promise<Shipment> {
    const res = await apiClient.post<Shipment>(`/shipments/create-backorder/${orderId}`);
    return res.data;
  },

  async confirmShipment(id: string): Promise<Shipment> {
    return this.confirmExport(id, {});
  },

  async deleteShipment(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/shipments/${id}`);
    return res.data;
  },
};


