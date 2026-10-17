import { apiClient } from './api';
import type {
  InventoryBatchStats,
  PaginatedBatchesResponse,
  QueryBatchesParams,
  CheckBatchDispatchPayload,
  CheckBatchDispatchResult,
} from '../types/inventory-batch.types';

/**
 * Service gọi API Quản lý Lô & Hạn sử dụng theo chuẩn FEFO (SN-184)
 * Tuân thủ CODE_CONVENTION: camelCase cho method, không dùng any.
 */
export const inventoryBatchesService = {
  /**
   * Lấy danh sách lô hàng phân trang và có lọc theo trạng thái / cận hạn
   * GET /inventory/batches
   */
  async getBatches(params?: QueryBatchesParams): Promise<PaginatedBatchesResponse> {
    const res = await apiClient.get<PaginatedBatchesResponse>('/inventory/batches', {
      params,
    });
    return res.data;
  },

  /**
   * Thống kê số lượng lô hàng theo trạng thái (Hợp lệ, Cận hạn, Đã hết hạn)
   * GET /inventory/batches/stats
   */
  async getBatchStats(
    warehouseId?: string,
    expiryThresholdDays = 30,
  ): Promise<InventoryBatchStats> {
    const res = await apiClient.get<InventoryBatchStats>('/inventory/batches/stats', {
      params: {
        warehouseId: warehouseId === 'ALL' ? undefined : warehouseId,
        expiryThresholdDays,
      },
    });
    return res.data;
  },

  /**
   * Kiểm tra điều kiện xuất kho của lô hàng và cơ chế Ghi Đè Quản Lý Kho (SN-184 AC-4)
   * POST /inventory/batches/check-dispatch
   */
  async checkBatchDispatch(
    payload: CheckBatchDispatchPayload,
  ): Promise<CheckBatchDispatchResult> {
    const res = await apiClient.post<CheckBatchDispatchResult>(
      '/inventory/batches/check-dispatch',
      payload,
    );
    return res.data;
  },
};
