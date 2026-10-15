import { apiClient } from './api';

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
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

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
    return res.data;
  },

  async updateStatus(id: string, status: Shipment['status'], data?: Partial<Shipment>): Promise<Shipment> {
    const res = await apiClient.patch<Shipment>(`/shipments/${id}/status`, { status, ...data });
    return res.data;
  },

  async confirmShipment(id: string): Promise<Shipment> {
    const res = await apiClient.post<Shipment>(`/shipments/${id}/confirm`);
    return res.data;
  },

  async deleteShipment(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/shipments/${id}`);
    return res.data;
  },
};
