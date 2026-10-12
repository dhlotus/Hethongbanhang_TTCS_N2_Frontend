/**
 * Trạng thái của Phiếu Chuyển kho Nội bộ (SN-181)
 */
export type TransferStatus =
  | 'DRAFT'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'PARTIALLY_RECEIVED'
  | 'CANCELLED';

/**
 * Chi tiết mặt hàng trong Phiếu Chuyển kho
 */
export interface InternalTransferItem {
  id: string;
  transferId: string;
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  conversionRate: number;
  baseUnit: string;
  /** Số lượng gửi theo đơn vị đóng gói (VD: 5 Thùng) */
  transferQuantity: number;
  /** Số lượng gửi quy về đơn vị cơ sở (VD: 120 Lon) */
  baseTransferQuantity: number;
  /** Số lượng thực nhận theo đơn vị đóng gói (kho đến kiểm đếm) */
  receivedQuantity?: number;
  /** Số lượng thực nhận quy về đơn vị cơ sở */
  baseReceivedQuantity?: number;
  /** Chênh lệch = transferQuantity - receivedQuantity */
  discrepancyQuantity?: number;
  /** Bắt buộc nhập khi có chênh lệch */
  discrepancyReason?: string;
  notes?: string;
  createdAt?: string;
}

/**
 * Thông tin Phiếu Chuyển kho Nội bộ
 */
export interface InternalTransfer {
  id: string;
  code: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  status: TransferStatus;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
  /** Thời điểm xuất chuyển kho */
  transferredAt?: string;
  /** Người xác nhận nhận hàng tại kho đến */
  receivedBy?: string;
  receivedByName?: string;
  /** Thời điểm xác nhận nhận hàng */
  receivedAt?: string;
  /** Lý do chênh lệch chung của phiếu */
  discrepancyReason?: string;
  items: InternalTransferItem[];
}

/**
 * Payload tạo từng dòng mặt hàng chuyển kho
 */
export interface CreateTransferItemPayload {
  productId: string;
  unit: string;
  transferQuantity: number;
  notes?: string;
}

/**
 * Payload tạo phiếu chuyển kho mới
 */
export interface CreateTransferPayload {
  fromWarehouseId: string;
  toWarehouseId: string;
  items: CreateTransferItemPayload[];
  notes?: string;
  isDraft?: boolean;
}

/**
 * Payload kiểm đếm từng dòng khi kho đến nhận hàng
 */
export interface ConfirmTransferItemPayload {
  itemId: string;
  receivedQuantity: number;
  discrepancyReason?: string;
}

/**
 * Payload xác nhận nhận hàng kho đến
 */
export interface ConfirmTransferReceiptPayload {
  items: ConfirmTransferItemPayload[];
  generalDiscrepancyReason?: string;
  notes?: string;
}

/**
 * Bộ lọc danh sách phiếu chuyển kho
 */
export interface TransferFilterParams {
  status?: TransferStatus;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}
