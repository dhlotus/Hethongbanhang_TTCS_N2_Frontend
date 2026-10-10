import { USER_ROLES } from '../types/auth';

export const ROLE_ROUTES = {
  ADMIN: '/dashboard',
  SALES_REP: '/dashboard',
  SALES_MANAGER: '/dashboard',
  WAREHOUSE_KEEPER: '/dashboard',
  WAREHOUSE_MANAGER: '/dashboard',
  ACCOUNTANT: '/dashboard',
  CUSTOMER: '/portal/orders',
} as const;

/**
 * Điều hướng (Redirect) về đúng trang Dashboard / Trang chủ tương ứng theo vai trò (Role)
 * sau khi người dùng đăng nhập thành công.
 *
 * @param roles Mảng vai trò hoặc vai trò đơn lẻ của người dùng
 * @returns Đường dẫn URL điều hướng tương ứng theo vai trò
 */
export function getRedirectPathByRole(roles?: string[] | string): string {
  if (!roles) return '/dashboard';

  const roleList = Array.isArray(roles) ? roles.map((r) => r.toUpperCase()) : [roles.toUpperCase()];

  // Khách hàng / Đại lý vào cổng riêng
  if (roleList.includes(USER_ROLES.CUSTOMER) || roleList.includes('DEALER')) {
    return ROLE_ROUTES.CUSTOMER;
  }

  // Mặc định tất cả các vai trò nội bộ đều chuyển hướng về /dashboard
  return '/dashboard';
}
