/**
 * SN-196: Types cho Phân tuyến giao hàng và Chuyến giao (Delivery Trips)
 */

export type DeliveryTripStatus = 'DRAFT' | 'ASSIGNED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export interface DeliveryTripStop {
  id: string;
  tripId: string;
  shipmentId: string;
  orderCode: string;
  stopOrder: number;
  customerName: string;
  receiverName: string;
  receiverPhone: string;
  deliveryAddress: string;
  packageCount?: number;
  codAmount?: number;
  status: 'PENDING' | 'DELIVERED' | 'FAILED';
  deliveredAt?: string;
  note?: string;
}

export interface DeliveryTrip {
  id: string;
  tripCode: string;
  code?: string; // Alias for tripCode
  name: string;
  routeArea: string;
  warehouseId?: string;
  warehouseName?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  licensePlate?: string; // Alias for vehicleNumber
  vehicleType?: string;
  departureDate: string;
  completedAt?: string;
  status: DeliveryTripStatus;
  stops: DeliveryTripStop[];
  totalStops: number;
  stopsCount?: number; // Alias for totalStops
  deliveredStops: number;
  totalCodAmount: number;
  note?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeliveryTripPayload {
  tripCode?: string;
  name: string;
  routeArea: string;
  warehouseId?: string;
  warehouseName?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  departureDate?: string;
  note?: string;
  shipmentIds: string[];
}

export interface UpdateDeliveryTripPayload {
  name?: string;
  routeArea?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  departureDate?: string;
  status?: DeliveryTripStatus;
  note?: string;
  shipmentIds?: string[];
}

export interface AssignDriverPayload {
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  vehicleType?: string;
}
