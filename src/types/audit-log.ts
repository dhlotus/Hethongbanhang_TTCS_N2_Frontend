/**
 * Định nghĩa kiểu dữ liệu cho phân hệ Nhật ký hệ thống (Audit Logs - Task SN-142 / SN-19)
 */

export type AuditActionType =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "APPROVE"
  | "CANCEL"
  | "STOCK_ADJUST";

export type AuditEntityType =
  | "INVENTORY"
  | "DEBT"
  | "PRICING"
  | "ORDER"
  | "USER";

export interface AuditLogUser {
  id: string;
  full_name: string;
  email: string;
  ip_address: string;
  role?: string;
}

export interface AuditLogItem {
  id: string;
  created_at: string; // ISO datetime
  user: AuditLogUser;
  action: AuditActionType;
  entity_name: string; // Phân hệ hoặc tên đối tượng (VD: Tồn kho SKU: LH-MILK-900G)
  entity_id: string;   // Mã định danh đối tượng
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  summary?: string;    // Tóm tắt nghiệp vụ hiển thị nhanh
}

export interface AuditLogQueryParams {
  startDate?: string;
  endDate?: string;
  userId?: string;
  searchUser?: string;
  entity?: AuditEntityType | "ALL";
  action?: AuditActionType | "ALL";
  page?: number;
  limit?: number;
}

export interface PaginatedAuditLogsResponse {
  data: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
