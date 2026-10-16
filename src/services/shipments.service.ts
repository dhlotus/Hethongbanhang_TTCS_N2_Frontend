import { apiClient } from './api';

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
  shippedAt?: string;
  deliveredAt?: string;
  lines?: ShipmentLine[];
  hasShortDelivery?: boolean;
  note?: string;
  createdAt: string;
  updatedAt: string;
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
    const res = await apiClient.get<Shipment[]>('/shipments', { params });
    return res.data;
  },

  async getBackorders(): Promise<Shipment[]> {
    const res = await apiClient.get<Shipment[]>('/shipments/backorders');
    return res.data;
  },

  async getShipmentById(id: string): Promise<Shipment> {
    const res = await apiClient.get<Shipment>(`/shipments/${id}`);
    return res.data;
  },

  async createShipment(data: Partial<Shipment>): Promise<Shipment> {
    const res = await apiClient.post<Shipment>('/shipments', data);
    return res.data;
  },

  async updateStatus(id: string, status: Shipment['status'], data?: Partial<Shipment>): Promise<Shipment> {
    const res = await apiClient.patch<Shipment>(`/shipments/${id}/status`, { status, ...data });
    return res.data;
  },

  /**
   * Xác nhận xuất kho và xử lý giao thiếu (SN-195)
   */
  async confirmExport(id: string, payload: ConfirmExportPayload): Promise<Shipment> {
    const res = await apiClient.post<Shipment>(`/shipments/${id}/confirm-export`, payload);
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
