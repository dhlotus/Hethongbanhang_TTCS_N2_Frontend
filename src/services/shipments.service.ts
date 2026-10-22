import { apiClient } from './api';
import { syncDemoOrderStatus } from './orders.service';
import type { OrderStatus } from '../types/order';

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
  locationCode?: string;
  location_code?: string;
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
    const res = await apiClient.get<any>('/shipments', { params });
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
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
    const res = await apiClient.get<Shipment>(`/shipments/${id}`);
    return res.data;
  },

  async createShipment(data: Partial<Shipment>): Promise<Shipment> {
    const res = await apiClient.post<Shipment>('/shipments', data);
    notifyOrderSync(res.data);
    return res.data;
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


