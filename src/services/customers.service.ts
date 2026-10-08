import { apiClient } from './api';
import type {
  Customer,
  CreateDeliveryPointPayload,
  DeliveryPoint,
  UpdateDeliveryPointPayload,
} from '../types/customer';

/**
 * Service Quản lý Đại lý & Điểm giao hàng (SN-31 & SN-32)
 */
export const customersService = {
  /**
   * Lấy danh sách đại lý
   */
  async getCustomers(search?: string): Promise<Customer[]> {
    const res = await apiClient.get<Customer[]>('/customers', {
      params: search ? { search } : undefined,
    });
    return res.data;
  },

  /**
   * Lấy chi tiết một đại lý
   */
  async getCustomerById(id: string): Promise<Customer> {
    const res = await apiClient.get<Customer>(`/customers/${id}`);
    return res.data;
  },

  /**
   * Lấy danh sách điểm giao hàng của đại lý (SN-31)
   */
  async getDeliveryPoints(customerId: string): Promise<DeliveryPoint[]> {
    const res = await apiClient.get<DeliveryPoint[]>(
      `/customers/${customerId}/delivery-points`,
    );
    return res.data;
  },

  /**
   * Thêm điểm giao hàng mới cho đại lý (SN-31)
   */
  async createDeliveryPoint(
    customerId: string,
    payload: CreateDeliveryPointPayload,
  ): Promise<DeliveryPoint> {
    const res = await apiClient.post<DeliveryPoint>(
      `/customers/${customerId}/delivery-points`,
      payload,
    );
    return res.data;
  },

  /**
   * Cập nhật thông tin điểm giao hàng (SN-31)
   */
  async updateDeliveryPoint(
    customerId: string,
    pointId: string,
    payload: UpdateDeliveryPointPayload,
  ): Promise<DeliveryPoint> {
    const res = await apiClient.put<DeliveryPoint>(
      `/customers/${customerId}/delivery-points/${pointId}`,
      payload,
    );
    return res.data;
  },

  /**
   * Đặt 1 điểm giao hàng làm mặc định (SN-31)
   */
  async setDefaultDeliveryPoint(
    customerId: string,
    pointId: string,
  ): Promise<DeliveryPoint> {
    const res = await apiClient.patch<DeliveryPoint>(
      `/customers/${customerId}/delivery-points/${pointId}/default`,
    );
    return res.data;
  },

  /**
   * Xóa điểm giao hàng của đại lý (SN-31)
   */
  async deleteDeliveryPoint(
    customerId: string,
    pointId: string,
  ): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/customers/${customerId}/delivery-points/${pointId}`,
    );
    return res.data;
  },

  /**
   * Khoá giao dịch với đại lý (SN-36)
   */
  async lockCustomer(id: string, reason: string): Promise<Customer> {
    const res = await apiClient.patch<Customer>(`/customers/${id}/lock`, { reason });
    return res.data;
  },

  /**
   * Mở khoá giao dịch với đại lý (SN-36)
   */
  async unlockCustomer(id: string): Promise<Customer> {
    const res = await apiClient.patch<Customer>(`/customers/${id}/unlock`);
    return res.data;
  },
};
