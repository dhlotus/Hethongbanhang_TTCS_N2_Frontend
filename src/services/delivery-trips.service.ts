import { apiClient } from './api';
import type {
  CreateDeliveryTripPayload,
  DeliveryTrip,
  DeliveryTripStatus,
  GoodsInTransitStats,
  QueryDeliveryTripsParams,
  TripCheckinReturnPayload,
  UpdateStopStatusPayload,
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
 * Service gọi API quản lý Chuyến đi Giao hàng, Phân tuyến & Theo dõi Hàng trên đường (SN-194 / SN-196 / SN-197)
 * Tuân thủ CODE_CONVENTION.docx:
 * - Không sử dụng `any`
 * - Gửi request qua Axios apiClient chuẩn
 * - Error handling an toàn
 */
export const deliveryTripsService = {
  /**
   * Lấy thống kê tiền hàng đang nằm trên đường & cảnh báo (SN-194 / SN-197)
   */
  async getGoodsInTransitStats(warehouseId?: string): Promise<GoodsInTransitStats> {
    const response = await apiClient.get<GoodsInTransitStats>(
      '/delivery-trips/stats/goods-in-transit',
      {
        params: warehouseId ? { warehouseId } : undefined,
      },
    );
    return response.data;
  },

  /**
   * Lấy danh sách chuyến đi giao hàng (lọc theo kho, trạng thái, quá hạn hoặc phân tuyến)
   */
  async getTrips(
    params?: QueryDeliveryTripsParams | { routeArea?: string; status?: DeliveryTripStatus; search?: string },
  ): Promise<DeliveryTrip[]> {
    if (params && 'routeArea' in params) {
      const res = await apiClient.get<DeliveryTrip[]>('/shipments/trips', { params });
      return res.data;
    }
    const response = await apiClient.get<DeliveryTrip[]>('/delivery-trips', {
      params,
    });
    return response.data;
  },

  /**
   * Lấy chi tiết một chuyến đi
   */
  async getTripById(id: string): Promise<DeliveryTrip> {
    try {
      const response = await apiClient.get<DeliveryTrip>(`/delivery-trips/${id}`);
      return response.data;
    } catch {
      const res = await apiClient.get<DeliveryTrip>(`/shipments/trips/${id}`);
      return res.data;
    }
  },

  /**
   * Tạo chuyến đi giao hàng mới
   */
  async createTrip(payload: CreateDeliveryTripPayload): Promise<DeliveryTrip> {
    if (payload.shipmentIds && payload.shipmentIds.length > 0) {
      const res = await apiClient.post<DeliveryTrip>('/shipments/trips', payload);
      return res.data;
    }
    const response = await apiClient.post<DeliveryTrip>('/delivery-trips', payload);
    return response.data;
  },

  /**
   * Bắt đầu chuyến đi giao hàng (SN-194 / SN-197)
   */
  async startTrip(id: string): Promise<DeliveryTrip> {
    const response = await apiClient.patch<DeliveryTrip>(`/delivery-trips/${id}/start`);
    return response.data;
  },

  /**
   * Cập nhật trạng thái một điểm giao hàng trên chuyến (SN-194 / SN-197)
   * - DELIVERED: Giao thành công
   * - FAILED: Giao thất bại kèm lý do (Hàng vẫn thuộc trách nhiệm chuyến đi, KHÔNG tự về kho)
   */
  async updateStopStatus(
    tripId: string,
    stopId: string,
    payload: UpdateStopStatusPayload,
  ): Promise<DeliveryTrip> {
    const response = await apiClient.patch<DeliveryTrip>(
      `/delivery-trips/${tripId}/stops/${stopId}`,
      payload,
    );
    return response.data;
  },

  /**
   * Quản lý kho xác nhận xe về kho & kiểm đếm đối soát hàng chưa giao nhập lại kho (SN-194 / SN-197)
   */
  async checkinTripReturn(
    id: string,
    payload: TripCheckinReturnPayload,
  ): Promise<DeliveryTrip> {
    const response = await apiClient.post<DeliveryTrip>(
      `/delivery-trips/${id}/return-checkin`,
      payload,
    );
    return response.data;
  },

  /**
   * Cập nhật thông tin chuyến giao hàng (SN-196)
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
   * Xuất phát chuyến giao hàng (SN-196)
   */
  async dispatchTrip(id: string): Promise<DeliveryTrip> {
    const res = await apiClient.post<DeliveryTrip>(`/shipments/trips/${id}/dispatch`);
    return res.data;
  },

  /**
   * Hoàn thành chuyến giao hàng (SN-196)
   */
  async completeTrip(id: string): Promise<DeliveryTrip> {
    const res = await apiClient.post<DeliveryTrip>(`/shipments/trips/${id}/complete`);
    return res.data;
  },

  /**
   * Hủy chuyến giao hàng (SN-196)
   */
  async cancelTrip(id: string, reason?: string): Promise<DeliveryTrip> {
    const res = await apiClient.post<DeliveryTrip>(`/shipments/trips/${id}/cancel`, { reason });
    return res.data;
  },

  /**
   * Xóa chuyến giao hàng (SN-196)
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
