/**
 * Kiểu dữ liệu Quản lý Sổ Tồn Kho & Giữ Chỗ Tồn Kho (SN-180, SN-183)
 */

export interface StockUnit {
  unitName: string;
  conversionRate: number;
  isBaseUnit: boolean;
}

export type ReservationStatus = 'ACTIVE' | 'RELEASED' | 'FULFILLED';

export interface StockReservation {
  id: string;
  orderId: string;
  orderCode?: string;
  customerName?: string;
  orderStatus?: string;
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

/** Một dòng Sổ tồn theo SKU tại kho (SN-180, SN-183). */
export interface StockBalance {
  sku: string;
  name: string;
  productId?: string;
  productName?: string;
  /** Tồn khả dụng = tồn thực tế - đang giữ cho đơn */
  stockQuantity: number;
  physicalStockQuantity: number;
  physicalQuantity?: number;
  reservedQuantity: number;
  availableQuantity?: number;
  baseUnit: string;
  units: StockUnit[];
  warehouse: string;
  warehouseId?: string;
  activeReservations?: StockReservation[];
  /** Mức tồn tối thiểu (0 = không cảnh báo) */
  minStockLevel?: number;
  /** stockQuantity <= minStockLevel && minStockLevel > 0 */
  isBelowMinStock?: boolean;
}

export interface StockItem {
  sku: string;
  name: string;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  baseUnit: string;
  warehouse: string;
  warehouseId?: string;
  units?: StockUnit[];
  activeReservations?: StockReservation[];
  minStockLevel?: number;
  isBelowMinStock?: boolean;
}

export interface LowStockAlert extends StockBalance {
  minStockLevel: number;
  isBelowMinStock: true;
  shortage: number;
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
