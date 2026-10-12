import type { AuthUser } from '../types/auth';
import { tokenStorage } from './token-storage';

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
    return '/dashboard';
  }

  const normalized = role.trim().toLowerCase();

  // Đại lý / Khách hàng B2B truy cập Cổng Dịch vụ Đại lý riêng
  if (normalized === 'customer' || normalized.includes('dealer') || normalized.includes('portal')) {
    return '/portal/orders';
  }

  // Thủ kho (không truy cập Dashboard kinh doanh) chuyển hướng trực tiếp tới Sổ tồn kho
  if (
    normalized === 'warehouse_keeper' ||
    (normalized.includes('warehouse') && !normalized.includes('manager')) ||
    normalized.includes('keeper')
  ) {
    return '/inventory/stock';
  }

  // Mặc định tất cả các vai trò nội bộ (Admin, Sales Manager, Sales Rep, Trưởng kho, Accountant)
  // khi đăng nhập đều truy cập trang Tổng quan Điều hành (Dashboard) đầu tiên
  return '/dashboard';
};

/**
 * Trả về đường dẫn điều hướng tương ứng với thông tin AuthUser
 */
export const getRedirectPathByUser = (user?: AuthUser | null): string => {
  if (!user || !user.roles || user.roles.length === 0) {
    return '/dashboard';
  }

  return getRedirectPathByRole(user.roles[0]);
};

/**
 * Lấy và parse thông tin AuthUser từ localStorage an toàn
 */
export const getStoredUser = (): AuthUser | null => {
  return tokenStorage.getUser();
};
