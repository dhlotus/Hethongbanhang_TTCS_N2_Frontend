import { USER_ROLES } from "../types/auth";

export const ROLE_ROUTES = {
  ADMIN: "/admin/dashboard",
  SALES_REP: "/sales/dashboard",
  SALES_MANAGER: "/sales/dashboard",
  WAREHOUSE_KEEPER: "/warehouse/dashboard",
  WAREHOUSE_MANAGER: "/warehouse/dashboard",
  ACCOUNTANT: "/accountant/dashboard",
  CUSTOMER: "/customer/portal",
} as const;

/**
 * Điều hướng (Redirect) về đúng trang Dashboard / Trang chủ tương ứng theo vai trò (Role)
 * sau khi người dùng đăng nhập thành công.
 *
 * @param roles Mảng vai trò hoặc vai trò đơn lẻ của người dùng
 * @returns Đường dẫn URL điều hướng tương ứng theo vai trò
 */
export function getRedirectPathByRole(roles?: string[] | string): string {
  if (!roles) return "/";

  const roleList = Array.isArray(roles)
    ? roles.map((r) => r.toUpperCase())
    : [roles.toUpperCase()];

  // Ưu tiên theo phân quyền nếu tài khoản được gán nhiều vai trò
  if (roleList.includes(USER_ROLES.ADMIN)) {
    return ROLE_ROUTES.ADMIN;
  }
  if (
    roleList.includes(USER_ROLES.SALES_MANAGER) ||
    roleList.includes(USER_ROLES.SALES_REP) ||
    roleList.includes("SALES")
  ) {
    return ROLE_ROUTES.SALES_REP;
  }
  if (
    roleList.includes(USER_ROLES.WAREHOUSE_MANAGER) ||
    roleList.includes(USER_ROLES.WAREHOUSE_KEEPER) ||
    roleList.includes("WAREHOUSE")
  ) {
    return ROLE_ROUTES.WAREHOUSE_KEEPER;
  }
  if (roleList.includes(USER_ROLES.ACCOUNTANT)) {
    return ROLE_ROUTES.ACCOUNTANT;
  }
  if (roleList.includes(USER_ROLES.CUSTOMER) || roleList.includes("DEALER")) {
    return ROLE_ROUTES.CUSTOMER;
  }

  return "/";
}
