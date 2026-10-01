import type { AuthUser } from "../types/auth";

/**
 * Hàm điều hướng trung tâm theo vai trò người dùng (Role-based Navigation):
 * - 'admin'      -> '/system/users'
 * - 'sales'      -> '/sales/orders'
 * - 'manager'    -> '/dashboard'
 * - 'warehouse'  -> '/inventory/stock'
 * - 'accountant' -> '/accounting/invoices'
 * - 'customer'   -> '/portal/orders'
 * - Mặc định     -> '/dashboard'
 */
export const getRedirectPathByRole = (role?: string): string => {
  if (!role) {
    return "/dashboard";
  }

  const normalized = role.trim().toLowerCase();

  // 1. Quản trị hệ thống
  if (normalized.includes("admin")) {
    return "/system/users";
  }

  // 2. Quản lý (Sales Manager, Warehouse Manager hoặc Manager chung)
  if (
    normalized === "manager" ||
    normalized.includes("salesmanager") ||
    normalized.includes("sales_manager") ||
    normalized.includes("warehousemanager") ||
    normalized.includes("warehouse_manager")
  ) {
    return "/dashboard";
  }

  // 3. Nhân viên kinh doanh
  if (
    normalized === "sales" ||
    normalized.includes("sales_rep") ||
    normalized.includes("sale")
  ) {
    return "/sales/orders";
  }

  // 4. Thủ kho
  if (
    normalized === "warehouse" ||
    normalized.includes("warehouse_keeper") ||
    normalized.includes("stock")
  ) {
    return "/inventory/stock";
  }

  // 5. Kế toán
  if (
    normalized === "accountant" ||
    normalized.includes("accounting") ||
    normalized.includes("invoices")
  ) {
    return "/accounting/invoices";
  }

  // 6. Đại lý / Khách hàng B2B
  if (
    normalized === "customer" ||
    normalized.includes("dealer") ||
    normalized.includes("portal")
  ) {
    return "/portal/orders";
  }

  // Mặc định fallback
  return "/dashboard";
};

/**
 * Trả về đường dẫn điều hướng tương ứng với thông tin AuthUser
 */
export const getRedirectPathByUser = (user?: AuthUser | null): string => {
  if (!user || !user.roles || user.roles.length === 0) {
    return "/dashboard";
  }

  return getRedirectPathByRole(user.roles[0]);
};

/**
 * Lấy và parse thông tin AuthUser từ localStorage an toàn
 */
export const getStoredUser = (): AuthUser | null => {
  const storedUser = localStorage.getItem("auth_user");
  if (!storedUser) return null;
  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    return null;
  }
};

