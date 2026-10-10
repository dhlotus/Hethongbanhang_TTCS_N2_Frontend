/**
 * Kiểu dữ liệu Kiểm kê kho hàng (Inventory Audit) - Jira Ticket SN-182 (Epic SN-229)
 */

export type InventoryAuditStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED';

export interface InventoryAuditItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  categoryName?: string;
  unit: string;
  bookQuantity: number; // Tồn sổ sách chốt tại thời điểm tạo phiếu
  actualQuantity: number | null; // Số đếm thực tế (null nếu chưa đếm)
  difference: number; // actualQuantity - bookQuantity
  differenceAmount?: number; // difference * unitPrice
  unitPrice?: number;
  note?: string; // Ghi chú theo dòng
}

export interface InventoryAudit {
  id: string;
  auditCode: string;
  warehouseId: string;
  warehouseName: string;
  scope: 'ALL' | 'CATEGORY';
  categoryId?: string;
  categoryName?: string;
  status: InventoryAuditStatus;
  note?: string;
  items: InventoryAuditItem[];
  totalBookQuantity: number;
  totalActualQuantity: number;
  totalDifferenceQuantity: number;
  creatorId: string;
  creatorName: string;
  completedById?: string;
  completedByName?: string;
  completedAt?: string;
  reason?: string; // Lý do điều chỉnh bắt buộc khi chốt phiếu
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryAuditPayload {
  warehouseId?: string;
  warehouseName?: string;
  scope?: 'ALL' | 'CATEGORY';
  categoryId?: string;
  categoryName?: string;
  note?: string;
}

export interface AuditItemInput {
  productId: string;
  actualQuantity: number;
  note?: string;
}

export interface UpdateAuditItemsPayload {
  items: AuditItemInput[];
}

export interface CompleteAuditPayload {
  reason: string; // Bắt buộc
  note?: string;
}

export interface QueryAuditsParams {
  status?: string;
  warehouseId?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
}
