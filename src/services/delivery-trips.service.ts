import { apiClient } from './api';
import type {
  CreateDeliveryTripPayload,
  DeliveryTrip,
  GoodsInTransitStats,
  QueryDeliveryTripsParams,
  TripCheckinReturnPayload,
  UpdateStopStatusPayload,
} from '../types/delivery-trip';

/**
 * Service gọi API quản lý Chuyến đi Giao hàng & Theo dõi Hàng trên đường (SN-194 / SN-197)
 * Tuân thủ CODE_CONVENTION.md:
 * - Không sử dụng `any`
 * - Gửi request qua Axios apiClient chuẩn
 * - Error handling an toàn
 */
export const deliveryTripsService = {
  /**
   * Lấy thống kê tiền hàng đang nằm trên đường & cảnh báo
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
   * Lấy danh sách chuyến đi giao hàng (lọc theo kho, trạng thái, quá hạn)
   */
  async getTrips(params?: QueryDeliveryTripsParams): Promise<DeliveryTrip[]> {
    const response = await apiClient.get<DeliveryTrip[]>('/delivery-trips', {
      params,
    });
    return response.data;
  },

  /**
   * Lấy chi tiết một chuyến đi
   */
  async getTripById(id: string): Promise<DeliveryTrip> {
    const response = await apiClient.get<DeliveryTrip>(`/delivery-trips/${id}`);
    return response.data;
  },

  /**
   * Tạo chuyến đi giao hàng mới
   */
  async createTrip(payload: CreateDeliveryTripPayload): Promise<DeliveryTrip> {
    const response = await apiClient.post<DeliveryTrip>('/delivery-trips', payload);
    return response.data;
  },

  /**
   * Bắt đầu chuyến đi giao hàng
   */
  async startTrip(id: string): Promise<DeliveryTrip> {
    const response = await apiClient.patch<DeliveryTrip>(`/delivery-trips/${id}/start`);
    return response.data;
  },

  /**
   * Cập nhật trạng thái một điểm giao hàng trên chuyến
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
   * Quản lý kho xác nhận xe về kho & kiểm đếm đối soát hàng chưa giao nhập lại kho
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
};
