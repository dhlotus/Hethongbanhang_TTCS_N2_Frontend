import { apiClient } from './api';
import type {
  DeliveryTrip,
  DeliveryTripStatus,
  CreateDeliveryTripPayload,
  UpdateDeliveryTripPayload,
  AssignDriverPayload,
  DeliveryTripStop,
} from '../types/delivery-trip';

export interface TripManifestResponse {
  trip: DeliveryTrip;
  stops: DeliveryTripStop[];
  printedAt: string;
}

/**
 * SN-196: Service Quản lý Chuyến giao hàng và Phân tuyến
 */
export const deliveryTripsService = {
  /**
   * Lấy danh sách chuyến giao hàng (kèm bộ lọc)
   */
  async getTrips(params?: {
    routeArea?: string;
    status?: DeliveryTripStatus;
    search?: string;
  }): Promise<DeliveryTrip[]> {
    const res = await apiClient.get<DeliveryTrip[]>('/shipments/trips', { params });
    return res.data;
  },

  /**
   * Chi tiết chuyến giao hàng
   */
  async getTripById(id: string): Promise<DeliveryTrip> {
    const res = await apiClient.get<DeliveryTrip>(`/shipments/trips/${id}`);
    return res.data;
  },

  /**
   * Tạo chuyến giao hàng mới gom nhiều phiếu xuất (SN-196 AC 1 & 2)
   */
  async createTrip(payload: CreateDeliveryTripPayload): Promise<DeliveryTrip> {
    const res = await apiClient.post<DeliveryTrip>('/shipments/trips', payload);
    return res.data;
  },

  /**
   * Cập nhật thông tin chuyến giao hàng
   */
  async updateTrip(id: string, payload: UpdateDeliveryTripPayload): Promise<DeliveryTrip> {
    const res = await apiClient.patch<DeliveryTrip>(`/shipments/trips/${id}`, payload);
    return res.data;
  },

  /**
   * Gán tài xế và phương tiện cho chuyến (SN-196 AC 2)
   */
  async assignDriver(id: string, payload: AssignDriverPayload): Promise<DeliveryTrip> {
    const res = await apiClient.post<DeliveryTrip>(`/shipments/trips/${id}/assign-driver`, payload);
    return res.data;
  },

  /**
   * Xuất phát chuyến giao hàng (chuyển sang IN_TRANSIT và đổi các phiếu sang SHIPPED)
   */
  async dispatchTrip(id: string): Promise<DeliveryTrip> {
    const res = await apiClient.post<DeliveryTrip>(`/shipments/trips/${id}/dispatch`);
    return res.data;
  },

  /**
   * Hoàn thành chuyến giao hàng
   */
  async completeTrip(id: string): Promise<DeliveryTrip> {
    const res = await apiClient.post<DeliveryTrip>(`/shipments/trips/${id}/complete`);
    return res.data;
  },

  /**
   * Hủy chuyến giao hàng
   */
  async cancelTrip(id: string, reason?: string): Promise<DeliveryTrip> {
    const res = await apiClient.post<DeliveryTrip>(`/shipments/trips/${id}/cancel`, { reason });
    return res.data;
  },

  /**
   * Xóa chuyến giao hàng
   */
  async deleteTrip(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/shipments/trips/${id}`);
    return res.data;
  },

  /**
   * Lấy dữ liệu in ấn bảng kê lộ trình điểm giao (SN-196 AC 3)
   */
  async getTripManifest(id: string): Promise<TripManifestResponse> {
    const res = await apiClient.get<TripManifestResponse>(`/shipments/trips/${id}/manifest`);
    return res.data;
  },
};
