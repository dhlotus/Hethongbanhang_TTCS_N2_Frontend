/**
 * Types cho Phân tuyến giao hàng (SN-196) và Theo dõi Hàng trên đường (SN-194 / SN-197)
 * Tuân thủ CODE_CONVENTION.docx: Không sử dụng kiểu any, PascalCase cho Type/Interface.
 */

export type DeliveryTripStatus = 'DRAFT' | 'ASSIGNED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

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
  orderId?: string;
  orderCode: string;
  shipmentId?: string;
  customerId?: string;
  customerName: string;
  receiverName?: string;
  receiverPhone?: string;
  deliveryAddress: string;
  contactPerson?: string;
  contactPhone?: string;
  orderAmount?: number;
  codAmount?: number;
  packageCount?: number;
  status: StopDeliveryStatus;
  failureReason?: string;
  deliveredAt?: string;
  failedAt?: string;
  proofPhotoUrl?: string;
  notes?: string;
  note?: string;
  items?: IDeliveryStopItem[];
  createdAt?: string;
  updatedAt?: string;
}

/** Alias cho SN-196 */
export type DeliveryTripStop = DeliveryStop;

export interface DeliveryTrip {
  id: string;
  tripCode: string;
  code?: string; // Alias for tripCode
  tripName: string;
  name?: string; // Alias for tripName
  routeArea?: string;
  warehouseId: string;
  warehouseName: string;
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  licensePlate?: string; // Alias for vehicleNumber
  vehicleType?: string;
  carrierName?: string;
  status: DeliveryTripStatus;
  departedAt?: string;
  departureDate?: string;
  estimatedCompletionTime: string;
  actualCompletionTime?: string;
  completedAt?: string;
  returnedToWarehouse?: boolean;
  returnedAt?: string;
  returnedNotes?: string;
  notes?: string;
  note?: string;
  stops: DeliveryStop[];
  totalStops: number;
  stopsCount?: number;
  deliveredStops: number;
  remainingStops: number;
  failedStops: number;
  totalGoodsValue: number;
  deliveredGoodsValue: number;
  inTransitGoodsValue: number;
  retainedGoodsValue: number;
  isOverdue: boolean;
  overdueMinutes: number;
  totalCodAmount?: number;
  createdBy?: string;
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
  tripName?: string;
  name?: string;
  routeArea?: string;
  warehouseId?: string;
  warehouseName?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  carrierName?: string;
  estimatedCompletionTime?: string;
  departureDate?: string;
  orderIds?: string[];
  shipmentIds?: string[];
  startImmediately?: boolean;
  notes?: string;
  note?: string;
}

export interface UpdateDeliveryTripPayload {
  name?: string;
  tripName?: string;
  routeArea?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  departureDate?: string;
  status?: DeliveryTripStatus;
  note?: string;
  notes?: string;
  shipmentIds?: string[];
}

export interface AssignDriverPayload {
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  vehicleType?: string;
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
