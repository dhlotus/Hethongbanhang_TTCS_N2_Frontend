/**
 * Service Quản lý Phiếu Soạn Hàng (Wave / Batch Picking) theo đường đi tối ưu trong kho.
 * Kết nối trực tiếp tới Backend API: /api/picking-sheets
 * Tuân thủ quy chuẩn CODE_CONVENTION.docx:
 * - Dữ liệu thật từ Database và Backend API, không dùng mock hay giả lập
 * - Xử lý thông báo lỗi chi tiết, chính xác từ máy chủ
 */

import { apiClient } from './api';
import type { Order } from '../types/order';
import type {
  CreatePickingSheetPayload,
  PickingSheet,
  UpdatePickingLineItemPayload,
} from '../types/order-picking.types';
import type { SelectedBatchAllocation } from '../types/fefo-picking.types';

/**
 * Trích xuất thông báo lỗi chính xác từ phản hồi máy chủ NestJS / Axios
 */
const extractErrorMessage = (err: unknown, defaultMsg: string): string => {
  if (err && typeof err === 'object' && 'response' in err) {
    const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
    const serverMsg = axiosErr.response?.data?.message;
    if (serverMsg) {
      return Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg;
    }
  }
  return err instanceof Error ? err.message : defaultMsg;
};

export const orderPickingService = {
  /**
   * Lấy toàn bộ danh sách phiếu soạn hàng từ Backend Database
   * GET /api/picking-sheets
   */
  async getPickingSheets(query?: { warehouseId?: string; status?: string; search?: string }): Promise<PickingSheet[]> {
    try {
      const response = await apiClient.get<PickingSheet[]>('/picking-sheets', {
        params: query,
      });
      return response.data;
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Không thể tải danh sách phiếu soạn hàng từ máy chủ'));
    }
  },

  /**
   * Lấy chi tiết 1 phiếu soạn hàng theo ID hoặc Mã phiếu
   * GET /api/picking-sheets/:id
   */
  async getPickingSheetById(id: string): Promise<PickingSheet | null> {
    try {
      const response = await apiClient.get<PickingSheet>(`/picking-sheets/${id}`);
      return response.data;
    } catch {
      return null;
    }
  },

  /**
   * Lấy danh sách các đơn hàng đủ điều kiện để soạn hàng (APPROVED / PROCESSING / PENDING)
   * GET /api/picking-sheets/eligible-orders
   */
  async getEligibleOrdersForPicking(): Promise<Order[]> {
    try {
      const response = await apiClient.get<Order[]>('/picking-sheets/eligible-orders');
      return response.data;
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Không thể tải danh sách đơn hàng đã duyệt từ máy chủ'));
    }
  },

  /**
   * Tạo phiếu soạn hàng mới từ 1 hoặc nhiều đơn hàng (Gộp đơn - Wave Picking)
   * POST /api/picking-sheets
   */
  async createPickingSheet(payload: CreatePickingSheetPayload): Promise<PickingSheet> {
    if (!payload.selectedOrderIds || payload.selectedOrderIds.length === 0) {
      throw new Error('Vui lòng chọn ít nhất một đơn hàng để tạo phiếu soạn');
    }

    try {
      const response = await apiClient.post<PickingSheet>('/picking-sheets', payload);
      return response.data;
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Lỗi khi tạo phiếu soạn hàng trên máy chủ'));
    }
  },

  /**
   * Cập nhật số lượng thực soạn của 1 dòng hàng
   * Bắt buộc có lý do nếu soạn thiếu (pickedQuantity < requiredQuantity)
   * PATCH /api/picking-sheets/:sheetId/items/:itemId
   */
  async updateLineItem(
    sheetId: string,
    itemId: string,
    payload: UpdatePickingLineItemPayload,
  ): Promise<PickingSheet> {
    try {
      const response = await apiClient.patch<PickingSheet>(
        `/picking-sheets/${sheetId}/items/${itemId}`,
        payload,
      );
      return response.data;
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Không thể cập nhật dòng hàng'));
    }
  },

  /**
   * Thao tác nhanh 1-chạm: Đánh dấu đã soạn đủ toàn bộ số lượng yêu cầu của dòng hàng
   * POST /api/picking-sheets/:sheetId/quick-pick-all/:itemId
   */
  async quickPickAllItem(sheetId: string, itemId: string): Promise<PickingSheet> {
    try {
      const response = await apiClient.post<PickingSheet>(
        `/picking-sheets/${sheetId}/quick-pick-all/${itemId}`,
      );
      return response.data;
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Không thể đánh dấu soạn đủ dòng hàng'));
    }
  },

  /**
   * Hoàn tất phiếu soạn hàng
   * Kiểm tra tất cả các dòng soạn thiếu phải có đầy đủ lý do
   * POST /api/picking-sheets/:sheetId/complete
   */
  async completePickingSheet(sheetId: string): Promise<PickingSheet> {
    try {
      const response = await apiClient.post<PickingSheet>(
        `/picking-sheets/${sheetId}/complete`,
      );
      return response.data;
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Chưa thể hoàn tất phiếu soạn hàng'));
    }
  },

  /**
   * Cập nhật phân bổ lô xuất FEFO cho dòng hàng (SN-187)
   */
  async updateLineItemBatches(
    sheetId: string,
    itemId: string,
    selectedBatches: SelectedBatchAllocation[],
    isOverride: boolean,
    overrideReason?: string,
    overrideReasonCode?: string,
  ): Promise<PickingSheet> {
    const totalBatchQty = selectedBatches.reduce((sum, b) => sum + b.quantity, 0);
    return this.updateLineItem(sheetId, itemId, {
      pickedQuantity: totalBatchQty,
      shortPickReason: isOverride ? overrideReason : undefined,
      shortPickReasonCode: isOverride ? (overrideReasonCode as any) : undefined,
      notes: `Phân bổ ${selectedBatches.length} lô FEFO: ${selectedBatches.map((b) => `${b.batchNumber} (${b.quantity})`).join(', ')}`,
    });
  },

  /**
   * Xóa / Hủy một phiếu soạn hàng
   * DELETE /api/picking-sheets/:sheetId
   */
  async deletePickingSheet(sheetId: string): Promise<void> {
    try {
      await apiClient.delete(`/picking-sheets/${sheetId}`);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Không thể xóa phiếu soạn hàng'));
    }
  },
};
