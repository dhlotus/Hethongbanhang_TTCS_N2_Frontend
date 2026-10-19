import { apiClient } from './api';
import type { GoodsReceipt, CreateGoodsReceiptDto, GoodsReceiptStatus } from '../types/inventory-receipt';
import {
  normalizeProductIdToUuid,
  normalizeWarehouseIdToUuid,
  normalizeSupplierIdToUuid,
} from '../utils/uuid-utils';

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

export interface UpdateGoodsReceiptDto {
  warehouseId?: string;
  warehouseName?: string;
  supplierId?: string;
  supplierName?: string;
  referenceDocument?: string;
  receiptDate?: string;
  notes?: string;
  items?: CreateGoodsReceiptDto['items'];
}

export const goodsReceiptService = {
  /**
   * Lấy danh sách phiếu nhập kho (có phân trang và bộ lọc)
   */
  getReceipts: async (params?: QueryGoodsReceiptsDto): Promise<PaginatedResponse<GoodsReceipt>> => {
    const response = await apiClient.get<PaginatedResponse<GoodsReceipt>>('/goods-receipts', { params });
    return response.data;
  },

  /**
   * Xem chi tiết 1 phiếu nhập kho theo ID (kèm chi tiết các dòng hàng)
   */
  getReceiptById: async (id: string): Promise<GoodsReceipt> => {
    const response = await apiClient.get<GoodsReceipt>(`/goods-receipts/${id}`);
    return response.data;
  },

  /**
   * Tạo mới phiếu nhập kho (Mặc định ở trạng thái DRAFT)
   * Tự động chuẩn hóa các mã định danh (warehouseId, supplierId, productId) về UUID chuẩn
   */
  createReceipt: async (data: CreateGoodsReceiptDto): Promise<{ id: string }> => {
    const payload: CreateGoodsReceiptDto = {
      ...data,
      warehouseId: normalizeWarehouseIdToUuid(data.warehouseId),
      supplierId: normalizeSupplierIdToUuid(data.supplierId),
      warehouseName: data.warehouseName,
      supplierName: data.supplierName,
      items: (data.items || []).map((item) => ({
        ...item,
        productId: normalizeProductIdToUuid(item.productId),
      })),
    };
    const response = await apiClient.post<{ id: string }>('/goods-receipts', payload);
    return response.data;
  },

  /**
   * Cập nhật thông tin phiếu nhập kho (chỉ áp dụng khi phiếu còn ở trạng thái DRAFT)
   */
  updateReceipt: async (id: string, data: UpdateGoodsReceiptDto): Promise<{ success: boolean; message: string }> => {
    const payload: UpdateGoodsReceiptDto = {
      ...data,
      warehouseId: data.warehouseId ? normalizeWarehouseIdToUuid(data.warehouseId) : undefined,
      warehouseName: data.warehouseName,
      supplierId: normalizeSupplierIdToUuid(data.supplierId),
      supplierName: data.supplierName,
      items: data.items?.map((item) => ({
        ...item,
        productId: normalizeProductIdToUuid(item.productId),
      })),
    };
    const response = await apiClient.put<{ success: boolean; message: string }>(`/goods-receipts/${id}`, payload);
    return response.data;
  },

  /**
   * Xác nhận nhập kho chính thức (Trạng thái CONFIRMED, cộng tồn kho và phát sinh thẻ kho)
   */
  confirmReceipt: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.patch<{ success: boolean; message: string }>(`/goods-receipts/${id}/confirm`);
    return response.data;
  },

  /**
   * Xóa phiếu nhập kho (chỉ áp dụng khi phiếu còn ở trạng thái DRAFT)
   */
  deleteReceipt: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/goods-receipts/${id}`);
    return response.data;
  },

  // Phương thức alias tương thích ngược với inventoryReceiptsService
  findAll: async (params?: QueryGoodsReceiptsDto): Promise<PaginatedResponse<GoodsReceipt>> => {
    return goodsReceiptService.getReceipts(params);
  },

  findOne: async (id: string): Promise<GoodsReceipt> => {
    return goodsReceiptService.getReceiptById(id);
  },

  create: async (data: CreateGoodsReceiptDto): Promise<{ id: string }> => {
    return goodsReceiptService.createReceipt(data);
  },

  confirm: async (id: string): Promise<{ success: boolean; message: string }> => {
    return goodsReceiptService.confirmReceipt(id);
  },

  remove: async (id: string): Promise<{ success: boolean; message: string }> => {
    return goodsReceiptService.deleteReceipt(id);
  },
};

export const inventoryReceiptsService = goodsReceiptService;
