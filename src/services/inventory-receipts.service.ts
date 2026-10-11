import { apiClient } from './api';
import type { GoodsReceipt, CreateGoodsReceiptDto, GoodsReceiptStatus } from '../types/inventory-receipt';

export interface QueryGoodsReceiptsDto {
  search?: string;
  warehouseId?: string;
  supplierId?: string;
  status?: GoodsReceiptStatus;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const inventoryReceiptsService = {
  findAll: async (params?: QueryGoodsReceiptsDto): Promise<PaginatedResponse<GoodsReceipt>> => {
    const response = await apiClient.get('/goods-receipts', { params });
    return response.data;
  },

  findOne: async (id: string): Promise<GoodsReceipt> => {
    const response = await apiClient.get(`/goods-receipts/${id}`);
    return response.data;
  },

  create: async (data: CreateGoodsReceiptDto): Promise<{ id: string }> => {
    const response = await apiClient.post('/goods-receipts', data);
    return response.data;
  },

  confirm: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.patch(`/goods-receipts/${id}/confirm`);
    return response.data;
  },

  remove: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/goods-receipts/${id}`);
    return response.data;
  }
};
