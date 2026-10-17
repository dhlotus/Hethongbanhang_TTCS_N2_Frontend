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

export const shipmentsService = {
  async getShipments(params?: Record<string, string | number>): Promise<Shipment[]> {
    const res = await apiClient.get<Shipment[]>('/shipments', { params });
    return res.data;
  },

  async getShipmentById(id: string): Promise<Shipment> {
    const res = await apiClient.get<Shipment>(`/shipments/${id}`);
    return res.data;
  },

  async createShipment(data: Partial<Shipment>): Promise<Shipment> {
    const res = await apiClient.post<Shipment>('/shipments', data);
    notifyOrderSync(res.data);
    return res.data;
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

