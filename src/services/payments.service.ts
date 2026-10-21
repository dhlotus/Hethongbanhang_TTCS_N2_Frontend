import { apiClient } from './api';
import type {
  Payment,
  CreatePaymentPayload,
  PaginatedPaymentsResponse,
} from '../types/payment';

/**
 * Service Ghi nhận thanh toán & Đối trừ công nợ (SN-202)
 */
export const paymentsService = {
  /**
   * Tạo bút toán ghi nhận thanh toán và đối trừ vào công nợ hóa đơn
   * POST /api/payments
   */
  async createPayment(payload: CreatePaymentPayload): Promise<{
    success: boolean;
    message: string;
    data: Payment;
  }> {
    const res = await apiClient.post<{
      success: boolean;
      message: string;
      data: Payment;
    }>('/payments', payload);
    return res.data;
  },

  /**
   * Lấy danh sách bút toán thanh toán có phân trang
   * GET /api/payments
   */
  async getPayments(params?: {
    page?: number;
    limit?: number;
    search?: string;
    customerId?: string;
    paymentMethod?: string;
  }): Promise<PaginatedPaymentsResponse> {
    const res = await apiClient.get<PaginatedPaymentsResponse>('/payments', {
      params,
    });
    return res.data;
  },

  /**
   * Lấy chi tiết bút toán thanh toán và lịch sử đối trừ
   * GET /api/payments/:id
   */
  async getPaymentById(id: string): Promise<Payment> {
    const res = await apiClient.get<Payment>(`/payments/${id}`);
    return res.data;
  },
};
