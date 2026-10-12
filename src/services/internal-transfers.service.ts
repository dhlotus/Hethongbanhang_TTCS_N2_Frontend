import { apiClient } from './api';
import type {
  ConfirmTransferReceiptPayload,
  CreateTransferPayload,
  InternalTransfer,
  TransferFilterParams,
} from '../types/internal-transfer.types';

/**
 * Service gọi API quản lý Phiếu Chuyển kho Nội bộ (SN-181)
 * Tuân thủ CODE_CONVENTION.md:
 * - Gọi trực tiếp backend API qua apiClient
 * - Không nuốt lỗi hoặc dùng localStorage fallback, để UI hiển thị Toast chính xác
 * - Type-safe 100%
 */
export const internalTransfersService = {
  /**
   * Lấy danh sách phiếu chuyển kho theo bộ lọc
   */
  async getTransfers(params?: TransferFilterParams): Promise<InternalTransfer[]> {
    const response = await apiClient.get<InternalTransfer[]>('/internal-transfers', {
      params,
    });
    return response.data;
  },

  /**
   * Lấy chi tiết một phiếu chuyển kho theo ID hoặc Mã phiếu
   */
  async getTransferById(id: string): Promise<InternalTransfer> {
    const response = await apiClient.get<InternalTransfer>(`/internal-transfers/${id}`);
    return response.data;
  },

  /**
   * Lập phiếu chuyển kho mới
   */
  async createTransfer(payload: CreateTransferPayload): Promise<InternalTransfer> {
    const response = await apiClient.post<InternalTransfer>('/internal-transfers', payload);
    return response.data;
  },

  /**
   * Kho đến xác nhận nhận hàng
   */
  async confirmReceipt(
    id: string,
    payload: ConfirmTransferReceiptPayload,
  ): Promise<InternalTransfer> {
    const response = await apiClient.patch<InternalTransfer>(
      `/internal-transfers/${id}/confirm`,
      payload,
    );
    return response.data;
  },

  /**
   * Hủy phiếu chuyển kho
   */
  async cancelTransfer(id: string): Promise<InternalTransfer> {
    const response = await apiClient.patch<InternalTransfer>(
      `/internal-transfers/${id}/cancel`,
    );
    return response.data;
  },
};
