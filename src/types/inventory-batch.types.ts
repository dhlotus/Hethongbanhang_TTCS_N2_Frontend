/**
 * Định nghĩa kiểu dữ liệu Quản lý Lô & Hạn sử dụng theo chuẩn FEFO (SN-184)
 * Tuân thủ CODE_CONVENTION: PascalCase cho Interface/Type, camelCase cho properties, không dùng any.
 */

export type BatchStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';

export interface InventoryBatchItem {
  id: string;
  batchNumber: string;
  productId: string;
  productSku: string;
  productName: string;
  categoryName?: string;
  warehouseId: string;
  warehouseName: string;
  locationId?: string;
  locationCode?: string;
  baseUnit: string;
  mfgDate?: string;
  expiryDate: string;
  quantity: number;
  allocatedQuantity: number;
  availableQuantity: number;
  costPrice: number;
  daysRemaining: number;
  status: BatchStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryBatchStats {
  totalBatches: number;
  validCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  totalQuantity: number;
  thresholdDays: number;
}

export interface QueryBatchesParams {
  warehouseId?: string;
  productId?: string;
  sku?: string;
  search?: string;
  status?: 'ALL' | BatchStatus;
  expiryThresholdDays?: number;
  page?: number;
  limit?: number;
}

export interface PaginatedBatchesResponse {
  data: InventoryBatchItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  thresholdDays: number;
}

export interface CheckBatchDispatchPayload {
  batchId?: string;
  batchNumber?: string;
  warehouseId?: string;
  productId?: string;
  sku?: string;
  quantity: number;
  managerOverrideReason?: string;
}

export interface CheckBatchDispatchResult {
  allowed: boolean;
  isOverridden: boolean;
  warning?: string;
  batch: InventoryBatchItem;
  overrideReason?: string;
  overriddenBy?: string;
  overriddenAt?: string;
  status?: string;
}
