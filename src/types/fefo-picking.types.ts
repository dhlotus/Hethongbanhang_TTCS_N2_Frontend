/**
 * Types & Enums phục vụ Gợi ý Lô xuất theo nguyên tắc Hạn dùng gần nhất FEFO (SN-187)
 * Tuân thủ CODE_CONVENTION.docx: UPPER_SNAKE_CASE cho hằng số/enum, PascalCase cho types.
 */

export type BatchExpiryStatus = 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'GOOD';

export interface FefoBatchItem {
  id: string;
  batchNumber: string;
  productId: string;
  productName?: string;
  warehouseId: string;
  locationCode?: string;
  mfgDate: string;
  expiryDate: string;
  daysUntilExpiry: number;
  expiryStatus: BatchExpiryStatus;
  availableQuantity: number;
  allocatedQuantity: number;
  costPrice: number;
  suggestedQuantity: number;
  selectedQuantity: number;
  isFefoRecommended: boolean;
}

export interface FefoRecommendationData {
  productId: string;
  warehouseId: string;
  requiredQuantity: number;
  totalSuggestedQuantity: number;
  isFullySatisfied: boolean;
  batches: FefoBatchItem[];
}

export interface SelectedBatchAllocation {
  batchId: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  daysUntilExpiry: number;
}

export interface FefoDispatchPayload {
  orderId?: string;
  warehouseId: string;
  productId: string;
  selectedBatches: SelectedBatchAllocation[];
  isOverride: boolean;
  overrideReason?: string;
  overrideReasonCode?: string;
  notes?: string;
}

/**
 * Danh sách lý do chuẩn hóa khi chọn xuất lô khác với đề xuất FEFO (SN-187)
 */
export const FEFO_OVERRIDE_REASONS = [
  {
    code: 'DAMAGED_PACKAGING',
    label: 'Lô cận date bị móp méo / rách bao bì không đạt tiêu chuẩn xuất',
  },
  {
    code: 'CUSTOMER_CONTRACT_REQUIREMENT',
    label: 'Khách hàng / Đại lý yêu cầu date xa hơn (Theo cam kết hợp đồng)',
  },
  {
    code: 'QUALITY_HOLD',
    label: 'Lô cận date đang trong diện lấy mẫu kiểm nghiệm / phong tỏa tạm thời',
  },
  {
    code: 'INACCESSIBLE_LOCATION',
    label: 'Vị trí lưu kho của lô cận date đang bị kẹt lối đi / cản trở di chuyển',
  },
  {
    code: 'NEAR_EXPIRY_DISPOSAL',
    label: 'Lô cận date đã được chuyển sang quy trình hủy hoặc thanh lý nội bộ',
  },
  {
    code: 'OTHER',
    label: 'Lý do nghiệp vụ khác (Bắt buộc ghi rõ giải trình)',
  },
] as const;

export type FefoOverrideReasonCode = (typeof FEFO_OVERRIDE_REASONS)[number]['code'];
