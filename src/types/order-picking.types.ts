/**
 * Kiểu dữ liệu cho Quản lý Phiếu Soạn Hàng Trong Kho (Order Picking)
 * Tuân thủ quy chuẩn CODE_CONVENTION: PascalCase cho Type/Interface, UPPER_SNAKE_CASE cho Constants, không dùng any.
 */

/** Trạng thái từng dòng hàng cần soạn */
export type PickingItemStatus = 'PENDING' | 'PICKED' | 'SHORT_PICKED';

/** Trạng thái tổng thể của phiếu soạn hàng */
export type PickingSheetStatus = 'IN_PROGRESS' | 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'CANCELLED';

/** Mã lý do soạn thiếu hàng chuẩn hóa */
export type ShortPickReasonCode =
  | 'DAMAGED_GOODS'
  | 'INSUFFICIENT_STOCK'
  | 'EXPIRED_OR_NEAR_EXPIRY'
  | 'LOCATION_MISMATCH'
  | 'OTHER';

/** Cấu hình hiển thị lý do soạn thiếu */
export interface ShortPickReasonOption {
  code: ShortPickReasonCode;
  label: string;
  description: string;
}

/** Danh mục các lý do soạn thiếu chuẩn mực trong quản lý kho */
export const SHORT_PICK_REASONS: ShortPickReasonOption[] = [
  {
    code: 'DAMAGED_GOODS',
    label: 'Hàng hư hỏng / Bể vỡ / Móp méo',
    description: 'Sản phẩm tại vị trí kệ bị rách bao bì, móp méo hoặc chảy nước không đủ tiêu chuẩn xuất',
  },
  {
    code: 'INSUFFICIENT_STOCK',
    label: 'Tồn kho thực tế không đủ',
    description: 'Số lượng thực tế tại ô kệ ít hơn số lượng ghi nhận trên hệ thống',
  },
  {
    code: 'EXPIRED_OR_NEAR_EXPIRY',
    label: 'Hàng cận hạn sử dụng (Cận Date)',
    description: 'Lô hàng không thỏa mãn điều kiện hạn sử dụng cam kết với khách hàng',
  },
  {
    code: 'LOCATION_MISMATCH',
    label: 'Vị trí sai / Không tìm thấy hàng',
    description: 'Không tìm thấy sản phẩm tại vị trí chỉ định trên đường đi soạn hàng',
  },
  {
    code: 'OTHER',
    label: 'Lý do khác (Nhập chi tiết)',
    description: 'Trường hợp đặc biệt khác cần ghi chú cụ thể',
  },
];

/** Chi tiết vị trí lưu trữ trong kho vật lý */
export interface WarehouseLocationDetail {
  zone: string; // Khu vực: A, B, C, COLD (Kho lạnh)
  aisle: string; // Dãy / Lối đi: 01, 02, 03
  rack: string; // Kệ: R01, R02
  shelf: string; // Tầng: T1, T2, T3
  bin: string; // Ô / Ngăn: B01, B02
  formattedCode: string; // Mã hiển thị nhanh (vd: A-01-R02-T1-B01)
  sortIndex: number; // Chỉ số tính toán đường đi tối ưu (S-Shape Routing)
}

/** Phân bổ số lượng mặt hàng cho từng đơn khi gộp nhiều đơn */
export interface OrderAllocationItem {
  orderId: string;
  orderCode: string;
  customerId: string;
  customerName: string;
  requiredQuantity: number;
  pickedQuantity: number;
  unit: string;
}

/** Dòng hàng trong phiếu soạn hàng */
export interface PickingLineItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  category?: string;
  unit: string;
  baseUnit: string;
  conversionRate: number;
  location: WarehouseLocationDetail;
  stepNumber: number; // Thứ tự điểm nhặt trên lộ trình (Pick Stop Sequence)
  totalRequiredQuantity: number;
  totalPickedQuantity: number;
  status: PickingItemStatus;
  shortPickReason?: string;
  shortPickReasonCode?: ShortPickReasonCode;
  notes?: string;
  orders: OrderAllocationItem[];
  completedAt?: string;
  // Bổ sung quản lý Lô xuất FEFO (SN-187)
  selectedBatches?: import('./fefo-picking.types').SelectedBatchAllocation[];
  isOverrideBatch?: boolean;
  batchOverrideReason?: string;
  batchOverrideReasonCode?: string;
}

/** Thực thể Phiếu soạn hàng (Picking Sheet / Wave Picking) */
export interface PickingSheet {
  id: string;
  sheetCode: string; // Mã phiếu: PSH-YYYYMMDD-XXXX
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  sourceOrderIds: string[];
  sourceOrderCodes: string[];
  orderCount: number;
  status: PickingSheetStatus;
  pickerId?: string;
  pickerName: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  items: PickingLineItem[];
  totalLines: number;
  pickedLines: number;
  totalRequiredQuantity: number;
  totalPickedQuantity: number;
  note?: string;
}

/** Payload tạo phiếu soạn hàng mới */
export interface CreatePickingSheetPayload {
  selectedOrderIds: string[];
  warehouseId: string;
  warehouseCode?: string;
  warehouseName?: string;
  pickerName?: string;
  note?: string;
}

/** Payload cập nhật dòng soạn hàng */
export interface UpdatePickingLineItemPayload {
  pickedQuantity: number;
  shortPickReason?: string;
  shortPickReasonCode?: ShortPickReasonCode;
  notes?: string;
}
