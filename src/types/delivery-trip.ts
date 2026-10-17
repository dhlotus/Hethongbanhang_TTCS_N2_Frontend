/**
 * Khai báo kiểu dữ liệu cho phân hệ Theo dõi Chuyến đi & Hàng trên đường (SN-194 / SN-197)
 * Tuân thủ CODE_CONVENTION.md: Không sử dụng kiểu any, PascalCase cho Type/Interface.
 */

export type DeliveryTripStatus = 'DRAFT' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export type StopDeliveryStatus = 'PENDING' | 'DELIVERED' | 'FAILED';

export interface IDeliveryStopItem {
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface DeliveryStop {
  id: string;
  tripId: string;
  stopOrder: number;
  orderId: string;
  orderCode: string;
  customerId: string;
  customerName: string;
  deliveryAddress: string;
  contactPerson: string;
  contactPhone: string;
  orderAmount: number;
  status: StopDeliveryStatus;
  failureReason?: string;
  deliveredAt?: string;
  failedAt?: string;
  proofPhotoUrl?: string;
  notes?: string;
  items?: IDeliveryStopItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryTrip {
  id: string;
  tripCode: string;
  tripName: string;
  warehouseId: string;
  warehouseName: string;
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  carrierName?: string;
  status: DeliveryTripStatus;
  departedAt?: string;
  estimatedCompletionTime: string;
  actualCompletionTime?: string;
  returnedToWarehouse: boolean;
  returnedAt?: string;
  returnedNotes?: string;
  notes?: string;
  stops: DeliveryStop[];
  totalStops: number;
  deliveredStops: number;
  remainingStops: number;
  failedStops: number;
  totalGoodsValue: number;
  deliveredGoodsValue: number;
  inTransitGoodsValue: number;
  retainedGoodsValue: number;
  isOverdue: boolean;
  overdueMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface GoodsInTransitStats {
  totalGoodsValueInTransit: number;
  activeTripsCount: number;
  overdueTripsCount: number;
  totalRemainingStops: number;
  totalRetainedUndeliveredValue: number;
  completedTripsToday: number;
}

export interface CreateDeliveryTripPayload {
  tripCode?: string;
  tripName: string;
  warehouseId: string;
  warehouseName?: string;
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  carrierName?: string;
  estimatedCompletionTime: string;
  orderIds: string[];
  startImmediately?: boolean;
  notes?: string;
}

export interface QueryDeliveryTripsParams {
  status?: DeliveryTripStatus;
  warehouseId?: string;
  isOverdue?: 'true' | 'false';
  search?: string;
}

export interface UpdateStopStatusPayload {
  status: StopDeliveryStatus;
  failureReason?: string;
  proofPhotoUrl?: string;
  notes?: string;
}

export interface TripCheckinReturnPayload {
  confirmReturnAllFailedGoods: boolean;
  returnedNotes?: string;
}
