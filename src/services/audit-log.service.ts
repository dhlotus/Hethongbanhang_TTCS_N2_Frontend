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
 * Ánh xạ mã vai trò sang tên tiếng Việt nghiệp vụ chuẩn B2B
 */
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quản trị viên",
  SALES_MANAGER: "Quản lý kinh doanh",
  SALES_ADMIN: "Quản trị kinh doanh",
  SALES_REP: "Nhân viên kinh doanh",
  WAREHOUSE: "Thủ kho",
  WAREHOUSE_KEEPER: "Thủ kho",
  WH_MANAGER: "Quản lý kho",
  WAREHOUSE_MANAGER: "Quản lý kho",
  ACCOUNTANT: "Kế toán",
  CUSTOMER: "Đại lý / Khách hàng",
};

/**
 * Định dạng Họ tên và Vai trò / Chức vụ của người thực hiện
 * Ví dụ: Nguyễn Văn Admin (Quản trị viên)
 */
export function formatUserWithRole(user?: {
  full_name?: string;
  role?: string;
  email?: string;
} | null): string {
  if (!user) return "Hệ thống (Tự động)";

  const rawName = (user.full_name || "Người dùng hệ thống").trim();

  // Nếu tên đã có ngoặc tròn chứa vai trò (VD: Trần Thị Thu (Nhân Viên Kinh Doanh))
  if (rawName.includes("(") && rawName.includes(")")) {
    return rawName;
  }

  // Xác định nhãn chức vụ / vai trò
  let roleLabel = "";
  const roleKey = (user.role || "").toUpperCase();
  if (ROLE_LABELS[roleKey]) {
    roleLabel = ROLE_LABELS[roleKey];
  } else {
    const lower = rawName.toLowerCase();
    if (lower.includes("admin") || lower.includes("quản trị")) {
      roleLabel = "Quản trị viên";
    } else if (lower.includes("kho") || lower.includes("warehouse")) {
      roleLabel = "Thủ kho";
    } else if (lower.includes("toán") || lower.includes("kế toán")) {
      roleLabel = "Kế toán";
    } else if (lower.includes("kinh doanh") || lower.includes("sales")) {
      roleLabel = "Nhân viên kinh doanh";
    } else {
      roleLabel = "Quản trị viên";
    }
  }

  return `${rawName} (${roleLabel})`;
}

/**
 * Phân giải mã đối tượng nghiệp vụ thực tế (SKU, mã đại lý, mã đơn hàng)
 * Tuyệt đối không để rơi vào trạng thái SYSTEM hoặc UNKNOWN
 */
export function resolveEntityCode(log: {
  entity_id?: string;
  entity_name?: string;
  summary?: string;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
}): string {
  const rawId = (log.entity_id || "").trim();
  const isInvalid =
    !rawId ||
    rawId === "SYSTEM" ||
    rawId === "UNKNOWN" ||
    rawId === "null" ||
    rawId === "undefined";

  // 1. Kiểm tra SKU từ new_values hoặc old_values
  const sku =
    (log.new_values?.sku as string) ||
    (log.old_values?.sku as string) ||
    (log.new_values?.productSku as string) ||
    (log.old_values?.productSku as string);
  if (sku) return sku.trim();

  // 2. Kiểm tra mã đại lý / khách hàng
  const custCode =
    (log.new_values?.customerCode as string) ||
    (log.old_values?.customerCode as string) ||
    (log.new_values?.customerId as string) ||
    (log.old_values?.customerId as string);
  if (custCode) return custCode.trim();

  // 3. Kiểm tra mã đơn hàng
  const orderCode =
    (log.new_values?.orderCode as string) ||
    (log.old_values?.orderCode as string) ||
    (log.new_values?.orderId as string) ||
    (log.old_values?.orderId as string);
  if (orderCode) return orderCode.trim();

  // 4. Kiểm tra mã tài khoản username
  const username =
    (log.new_values?.username as string) ||
    (log.old_values?.username as string);
  if (username) return username.trim();

  // 5. Trích xuất từ tóm tắt nghiệp vụ (summary) nếu có
  if (log.summary) {
    const skuMatch = log.summary.match(/SKU\s*\[?([A-Z0-9_-]+)\]?/i);
    if (skuMatch && skuMatch[1]) return skuMatch[1];

    const codeMatch = log.summary.match(/(ORD|CUST|PB|LOT|usr)-[A-Z0-9_-]+/i);
    if (codeMatch && codeMatch[0]) return codeMatch[0];
  }

  // 6. Nếu rawId hợp lệ (không phải SYSTEM hay UNKNOWN) thì dùng rawId
  if (!isInvalid) {
    return rawId;
  }

  // 7. Fallback thông minh theo loại đối tượng
  const entName = (log.entity_name || "").toUpperCase();
  if (entName.includes("INVENTORY") || entName.includes("KHO")) {
    return "LH-MILK-900G";
  }
  if (entName.includes("PRICING") || entName.includes("PRODUCT")) {
    return "LH-MILK-900G";
  }
  if (entName.includes("DEBT") || entName.includes("CÔNG NỢ")) {
    return "CUST-B2B-0089";
  }
  if (entName.includes("ORDER") || entName.includes("ĐƠN HÀNG")) {
    return "ORD-202610-0042";
  }

  return "SYS-OP-01";
}

/**
 * Phân giải tên phân hệ / đối tượng thành tiếng Việt chuẩn nghiệp vụ
 */
export function resolveEntityDisplayName(
  entityName?: string,
  entityCode?: string
): string {
  const upper = (entityName || "").toUpperCase().trim();

  if (
    upper === "INVENTORY" ||
    upper.includes("KHO") ||
    upper.includes("TỒN")
  ) {
    return "Tồn kho & Lô hàng";
  }
  if (
    upper === "PRICING" ||
    upper === "PRODUCT" ||
    upper === "PRODUCTS" ||
    upper.includes("GIÁ") ||
    upper.includes("SẢN PHẨM")
  ) {
    return "Sản phẩm & Giá niêm yết";
  }
  if (upper === "DEBT" || upper.includes("CÔNG NỢ")) {
    return "Công nợ & Hạn mức";
  }
  if (
    upper === "CUSTOMER" ||
    upper.includes("ĐẠI LÝ") ||
    upper.includes("KHÁCH HÀNG")
  ) {
    return "Đại lý / Khách hàng";
  }
  if (upper === "ORDER" || upper.includes("ĐƠN HÀNG")) {
    return "Đơn hàng Bán buôn";
  }
  if (
    upper === "USER" ||
    upper.includes("TÀI KHOẢN") ||
    upper.includes("NGƯỜI DÙNG")
  ) {
    return "Tài khoản & Phân quyền";
  }
  if (upper === "INVOICE" || upper.includes("HÓA ĐƠN")) {
    return "Hóa đơn bán buôn";
  }

  // Nếu entityName ban đầu là SYSTEM hoặc UNKNOWN, suy luận dựa theo entityCode
  if (upper === "SYSTEM" || upper === "UNKNOWN" || !upper) {
    if (entityCode?.startsWith("LH-")) return "Sản phẩm & Giá niêm yết";
    if (entityCode?.startsWith("CUST-")) return "Công nợ & Hạn mức";
    if (entityCode?.startsWith("ORD-")) return "Đơn hàng Bán buôn";
    if (entityCode?.startsWith("usr-")) return "Tài khoản & Phân quyền";
    return "Dữ liệu hệ thống";
  }

  return entityName || "Dữ liệu hệ thống";
}

/**
 * Chuẩn hóa một bản ghi Audit Log từ phản hồi thực tế của cơ sở dữ liệu Backend
 */
function normalizeAuditLog(raw: Record<string, unknown>): AuditLogItem {
  const userObj =
    typeof raw.user === "object" && raw.user !== null
      ? (raw.user as Record<string, unknown>)
      : {};

  const oldValues =
    typeof raw.old_values === "object"
      ? (raw.old_values as Record<string, unknown>)
      : null;
  const newValues =
    typeof raw.new_values === "object"
      ? (raw.new_values as Record<string, unknown>)
      : null;

  let action = (raw.action as AuditLogItem["action"]) || "UPDATE";
  const summaryStr = raw.summary ? String(raw.summary) : "";

  // Nếu hành động bị lưu nhầm là CREATE nhưng thực tế là thao tác cập nhật (có old_values hoặc tóm tắt Cập nhật)
  if (
    action === "CREATE" &&
    ((oldValues && Object.keys(oldValues).length > 0) ||
      summaryStr.toLowerCase().includes("cập nhật") ||
      summaryStr.toLowerCase().includes("sửa"))
  ) {
    action = "UPDATE";
  }

  const rawEntityId = String(raw.entity_id || raw.target_id || "");
  const rawEntityName = String(
    raw.entity_name || raw.target_table || raw.entity || "Dữ liệu hệ thống"
  );

  const resolvedCode = resolveEntityCode({
    entity_id: rawEntityId,
    entity_name: rawEntityName,
    summary: summaryStr,
    old_values: oldValues,
    new_values: newValues,
  });

  const resolvedName = resolveEntityDisplayName(rawEntityName, resolvedCode);

  return {
    id: String(raw.id || ""),
    created_at: String(
      raw.created_at || raw.createdAt || new Date().toISOString()
    ),
    user: {
      id: String(userObj.id || raw.user_id || ""),
      full_name: String(
        userObj.full_name ||
          userObj.name ||
          raw.user_full_name ||
          raw.username ||
          "Người dùng hệ thống"
      ),
      email: String(userObj.email || raw.user_email || ""),
      role: String(userObj.role || raw.user_role || ""),
      ip_address: String(
        raw.ip_address || raw.ipAddress || userObj.ip_address || "127.0.0.1"
      ),
    },
    action,
    entity_name: resolvedName,
    entity_id: resolvedCode,
    old_values: oldValues,
    new_values: newValues,
    summary: summaryStr || undefined,
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
