/**
 * Kiểu dữ liệu Quản lý Sổ Tồn Kho & Giữ Chỗ Tồn Kho (SN-180 - Sprint 5)
 */

export type ReservationStatus = 'ACTIVE' | 'RELEASED' | 'FULFILLED';

export interface StockReservation {
  id: string;
  orderId: string;
  orderCode?: string;
  customerName?: string;
  productId: string;
  productSku?: string;
  productName?: string;
  warehouseId?: string;
  warehouseName?: string;
  quantity: number;
  status: ReservationStatus;
  expiredAt: string;
  createdAt: string;
  releasedAt?: string;
}

export interface StockItem {
  sku: string;
  name: string;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  baseUnit: string;
  warehouse: string;
  units?: Array<{ unitName: string; conversionRate: number; isBaseUnit: boolean }>;
  activeReservations?: StockReservation[];
}

export interface ApproveOrderResponse {
  success: boolean;
  message: string;
  orderId: string;
  status: string;
  reservedUntil?: string;
  itemsReserved?: number;
}

export interface CancelOrderPayload {
  reason: string;
}
