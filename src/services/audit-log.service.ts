import { apiClient } from "./api";
import type {
  AuditLogItem,
  AuditLogQueryParams,
  PaginatedAuditLogsResponse,
  AuditEntityType,
} from "../types/audit-log";

/**
 * Danh mục đối tượng thao tác chuẩn hóa cho bộ lọc
 */
export const AUDIT_ENTITIES: { value: AuditEntityType; label: string }[] = [
  { value: "INVENTORY", label: "Tồn kho & Lô hàng (INVENTORY)" },
  { value: "DEBT", label: "Công nợ & Hạn mức (DEBT)" },
  { value: "PRICING", label: "Giá bán & Chiết khấu (PRICING)" },
  { value: "ORDER", label: "Đơn hàng Bán buôn (ORDER)" },
  { value: "USER", label: "Tài khoản & Phân quyền (USER)" },
];

/**
 * Định dạng ngày giờ chuẩn hiển thị: DD/MM/YYYY HH:mm:ss
 */
export function formatAuditDateTime(isoString: string): string {
  if (!isoString) return "---";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    const pad = (n: number) => n.toString().padStart(2, "0");
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  } catch {
    return isoString;
  }
}

/**
 * Chuẩn hóa một bản ghi Audit Log từ phản hồi thực tế của cơ sở dữ liệu Backend
 */
function normalizeAuditLog(raw: Record<string, unknown>): AuditLogItem {
  const userObj = typeof raw.user === "object" && raw.user !== null ? (raw.user as Record<string, unknown>) : {};

  return {
    id: String(raw.id || ""),
    created_at: String(raw.created_at || raw.createdAt || new Date().toISOString()),
    user: {
      id: String(userObj.id || raw.user_id || ""),
      full_name: String(userObj.full_name || userObj.name || raw.user_full_name || raw.username || "Hệ thống"),
      email: String(userObj.email || raw.user_email || ""),
      ip_address: String(raw.ip_address || raw.ipAddress || userObj.ip_address || "127.0.0.1"),
    },
    action: (raw.action as AuditLogItem["action"]) || "UPDATE",
    entity_name: String(raw.entity_name || raw.target_table || raw.entity || "Dữ liệu hệ thống"),
    entity_id: String(raw.entity_id || raw.target_id || ""),
    old_values: typeof raw.old_values === "object" ? (raw.old_values as Record<string, unknown>) : null,
    new_values: typeof raw.new_values === "object" ? (raw.new_values as Record<string, unknown>) : null,
    summary: raw.summary ? String(raw.summary) : undefined,
  };
}

/**
 * Service gọi API thực tế tới Backend (GET /api/audit-logs)
 * Tuyệt đối không fallback sang mock data hay dữ liệu giả lập.
 */
export const auditLogService = {
  /**
   * Lấy danh sách nhật ký hệ thống từ máy chủ backend
   */
  async getAuditLogs(params: AuditLogQueryParams = {}): Promise<PaginatedAuditLogsResponse> {
    const {
      startDate,
      endDate,
      userId,
      searchUser,
      entity = "ALL",
      action = "ALL",
      page = 1,
      limit = 20,
    } = params;

    try {
      const res = await apiClient.get<unknown>("/audit-logs", {
        params: {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          userId: userId && userId !== "ALL" ? userId : undefined,
          searchUser: searchUser?.trim() || undefined,
          entity: entity !== "ALL" ? entity : undefined,
          action: action !== "ALL" ? action : undefined,
          page,
          limit,
        },
      });

      // Trường hợp 1: Backend trả về cấu trúc phân trang chuẩn { data: [...], total, page, limit, totalPages }
      if (
        res.data &&
        typeof res.data === "object" &&
        "data" in res.data &&
        Array.isArray((res.data as Record<string, unknown>).data)
      ) {
        const responseData = res.data as {
          data: Record<string, unknown>[];
          total?: number;
          page?: number;
          limit?: number;
          totalPages?: number;
        };

        const items = responseData.data.map(normalizeAuditLog);
        const total = responseData.total ?? items.length;
        const totalPages = (responseData.totalPages ?? Math.ceil(total / limit)) || 1;

        return {
          data: items,
          total,
          page: responseData.page ?? page,
          limit: responseData.limit ?? limit,
          totalPages,
        };
      }

      // Trường hợp 2: Backend trả về danh sách mảng phẳng [...]
      if (Array.isArray(res.data)) {
        const items = res.data.map(normalizeAuditLog);
        const total = items.length;
        const totalPages = Math.ceil(total / limit) || 1;

        return {
          data: items,
          total,
          page,
          limit,
          totalPages,
        };
      }

      // Trường hợp dữ liệu trả về rỗng hoặc không đúng định dạng
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    } catch {
      // Khi API lỗi hoặc chưa có bản ghi trên CSDL thật, hiển thị trạng thái rỗng chuẩn mực (Empty state)
      // TUYỆT ĐỐI KHÔNG tự bịa dữ liệu demo / mock
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }
  },
};
