import { apiClient } from './api';

export interface ReturnRequest {
  id: string;
  requestCode: string;
  orderId: string;
  orderCode: string;
  customerId: string;
  customerName: string;
  salesRepId?: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'RECEIVED' | 'ADJUSTED' | 'REJECTED';
  refundAmount?: number;
  warehouseNote?: string;
  accountantNote?: string;
  createdAt: string;
  updatedAt: string;
}

export const returnsService = {
  async getReturns(params?: Record<string, string | number>): Promise<ReturnRequest[]> {
    const res = await apiClient.get<ReturnRequest[]>('/returns', { params });
    return res.data;
  },

  async getReturnById(id: string): Promise<ReturnRequest> {
    const res = await apiClient.get<ReturnRequest>(`/returns/${id}`);
    return res.data;
  },

  async createReturn(data: Partial<ReturnRequest>): Promise<ReturnRequest> {
    const res = await apiClient.post<ReturnRequest>('/returns', data);
    return res.data;
  },

  async approveReturn(id: string): Promise<ReturnRequest> {
    const res = await apiClient.post<ReturnRequest>(`/returns/${id}/approve`);
    return res.data;
  },

  async receiveStock(id: string, note?: string): Promise<ReturnRequest> {
    const res = await apiClient.post<ReturnRequest>(`/returns/${id}/receive`, { note });
    return res.data;
  },

  async adjustDebt(id: string, refundAmount?: number, note?: string): Promise<ReturnRequest> {
    const res = await apiClient.post<ReturnRequest>(`/returns/${id}/adjustment`, { refundAmount, note });
    return res.data;
  },

  async deleteReturn(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/returns/${id}`);
    return res.data;
  },
};
