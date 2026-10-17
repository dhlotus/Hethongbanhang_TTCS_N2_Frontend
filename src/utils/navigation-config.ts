import React from 'react';
import {
  Users,
  ScrollText,
  Package,
  BadgePercent,
  LayoutDashboard,
  ShoppingCart,
  Warehouse,
  Receipt,
  Truck,
  UserCheck,
  ClipboardCheck,
  BarChart3,
  PackagePlus,
  PackageMinus,
  PackageCheck,
  ArrowLeftRight,
  ClipboardList,
  SlidersHorizontal,
  CalendarClock,
  FileText,
  FileSpreadsheet,
  CreditCard,
  RotateCcw,
  Building2,
} from 'lucide-react';
import { USER_ROLES, type UserRoleType, type AuthUser } from '../types/auth';

export interface MenuItem {
  id: string;
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  category?: string;
}

export interface RoleMeta {
  role: UserRoleType;
  label: string;
  shortLabel: string;
  badgeClass: string;
  dotClass: string;
  defaultLocation: string;
  description: string;
}

/**
 * Cấu hình hiển thị chi tiết cho 7 vai trò trong hệ thống LOHA SALES
 */
export const ROLE_CONFIGS: Record<UserRoleType, RoleMeta> = {
  [USER_ROLES.CUSTOMER]: {
    role: USER_ROLES.CUSTOMER,
    label: 'Đại lý / Khách hàng B2B',
    shortLabel: 'Đại lý B2B',
    badgeClass: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20',
    dotClass: 'bg-sky-500',
    defaultLocation: 'Điểm nhận hàng mặc định',
    description: 'Đặt hàng trực tuyến, theo dõi tiến độ giao nhận và đối chiếu công nợ',
  },
  [USER_ROLES.SALES_REP]: {
    role: USER_ROLES.SALES_REP,
    label: 'Nhân viên kinh doanh',
    shortLabel: 'Sale Thị trường',
    badgeClass: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
    dotClass: 'bg-blue-500',
    defaultLocation: 'Địa bàn TP. Hồ Chí Minh',
    description:
      'Phát triển thị trường, lên đơn hàng, tra cứu tồn khả dụng và theo dõi công nợ đại lý',
  },
  [USER_ROLES.SALES_MANAGER]: {
    role: USER_ROLES.SALES_MANAGER,
    label: 'Quản lý kinh doanh',
    shortLabel: 'Trưởng phòng KD',
    badgeClass: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20',
    dotClass: 'bg-indigo-500',
    defaultLocation: 'Khối Quản lý Kinh doanh',
    description:
      'Phê duyệt đơn hàng đặc biệt, điều hành bảng giá, phân công địa bàn và báo cáo doanh số',
  },
  [USER_ROLES.WAREHOUSE_KEEPER]: {
    role: USER_ROLES.WAREHOUSE_KEEPER,
    label: 'Nhân viên kho / Thủ kho',
    shortLabel: 'Thủ kho',
    badgeClass: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
    dotClass: 'bg-amber-500',
    defaultLocation: 'Kho Tổng Miền Nam - LOHA WH01',
    description: 'Quản lý xuất nhập tồn, soạn hàng FEFO, điều chuyển và kiểm kê kho hàng',
  },
  [USER_ROLES.WAREHOUSE_MANAGER]: {
    role: USER_ROLES.WAREHOUSE_MANAGER,
    label: 'Quản lý kho',
    shortLabel: 'Trưởng kho',
    badgeClass: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20',
    dotClass: 'bg-orange-500',
    defaultLocation: 'Cụm Kho Tổng Toàn quốc',
    description:
      'Kiểm soát an toàn kho vận, duyệt biên bản kiểm kê, quản lý hạn sử dụng và báo cáo tồn kho',
  },
  [USER_ROLES.ACCOUNTANT]: {
    role: USER_ROLES.ACCOUNTANT,
    label: 'Kế toán công nợ',
    shortLabel: 'Kế toán',
    badgeClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
    dotClass: 'bg-emerald-500',
    defaultLocation: 'Phòng Tài chính - Kế toán',
    description:
      'Phát hành hóa đơn, thu tiền, đối trừ công nợ, phân tích tuổi nợ và xử lý trả hàng',
  },
  [USER_ROLES.ADMIN]: {
    role: USER_ROLES.ADMIN,
    label: 'Quản trị hệ thống',
    shortLabel: 'Quản trị viên',
    badgeClass:
      'bg-[var(--color-primary-light)] text-[var(--color-primary)] ring-1 ring-inset ring-[var(--color-primary-subtle)]',
    dotClass: 'bg-[var(--color-primary)]',
    defaultLocation: 'Toàn bộ hệ thống',
    description:
      'Toàn quyền vận hành hệ sinh thái, phân quyền nhân sự, cấu hình và giám sát nhật ký',
  },
};

/**
 * Ma trận phân quyền menu động theo vai trò (Role-based Navigation Matrix - SN-11):
 * Mỗi vai trò khi đăng nhập chỉ nhìn thấy đúng các chức năng thuộc thẩm quyền.
 */
export const ROLE_NAVIGATION_MATRIX: Record<UserRoleType, MenuItem[]> = {
  // 1. Đại lý / Khách hàng B2B (CUSTOMER)
  [USER_ROLES.CUSTOMER]: [
    {
      id: 'portal-orders',
      name: 'Cổng đặt hàng',
      path: '/portal/orders',
      icon: ShoppingCart,
      category: 'Mua hàng & Giao nhận',
    },
    {
      id: 'portal-tracking',
      name: 'Theo dõi đơn hàng',
      path: '/portal/tracking',
      icon: Truck,
      category: 'Mua hàng & Giao nhận',
    },
    {
      id: 'portal-debt',
      name: 'Sổ công nợ',
      path: '/portal/debt',
      icon: Receipt,
      category: 'Tài chính & Thanh toán',
    },
    {
      id: 'portal-profile',
      name: 'Hồ sơ đại lý',
      path: '/portal/profile',
      icon: UserCheck,
      category: 'Tài khoản',
    },
  ],

  // 2. Nhân viên kinh doanh (SALES_REP)
  [USER_ROLES.SALES_REP]: [
    {
      id: 'dashboard',
      name: 'Bảng điều khiển',
      path: '/dashboard',
      icon: LayoutDashboard,
      category: 'Kinh doanh & Bán hàng',
    },
    {
      id: 'sales-orders',
      name: 'Quản lý đơn hàng',
      path: '/sales/orders',
      icon: ShoppingCart,
      category: 'Kinh doanh & Bán hàng',
    },
    {
      id: 'sales-customers',
      name: 'Quản lý đại lý',
      path: '/sales/customers',
      icon: Users,
      category: 'Quan hệ Khách hàng',
    },
    {
      id: 'catalog-pricing',
      name: 'Bảng giá & Chiết khấu',
      path: '/catalog/pricing',
      icon: BadgePercent,
      category: 'Hàng hóa',
    },
    {
      id: 'catalog-products',
      name: 'Danh mục sản phẩm',
      path: '/catalog/products',
      icon: Package,
      category: 'Hàng hóa',
    },
    {
      id: 'inventory-stock',
      name: 'Tra cứu tồn kho',
      path: '/inventory/stock',
      icon: Warehouse,
      category: 'Kho vận',
    },
    {
      id: 'accounting-debt',
      name: 'Theo dõi công nợ',
      path: '/accounting/debt',
      icon: Receipt,
      category: 'Tài chính',
    },
  ],

  // 3. Quản lý kinh doanh (SALES_MANAGER)
  [USER_ROLES.SALES_MANAGER]: [
    {
      id: 'dashboard',
      name: 'Dashboard điều hành',
      path: '/dashboard',
      icon: LayoutDashboard,
      category: 'Báo cáo & Phân tích',
    },
    {
      id: 'reports-sales',
      name: 'Báo cáo doanh số',
      path: '/reports/sales',
      icon: BarChart3,
      category: 'Báo cáo & Phân tích',
    },
    {
      id: 'sales-approvals',
      name: 'Phê duyệt đơn hàng',
      path: '/sales/approvals',
      icon: ClipboardCheck,
      category: 'Duyệt nghiệp vụ',
    },
    {
      id: 'sales-orders',
      name: 'Quản lý đơn hàng',
      path: '/sales/orders',
      icon: ShoppingCart,
      category: 'Kinh doanh',
    },
    {
      id: 'sales-customers',
      name: 'Quản lý đại lý',
      path: '/sales/customers',
      icon: Users,
      category: 'Đội ngũ & Khách hàng',
    },
    {
      id: 'sales-credit-limit',
      name: 'Hạn mức công nợ',
      path: '/sales/credit-limit',
      icon: CreditCard,
      category: 'Đội ngũ & Khách hàng',
    },
    {
      id: 'catalog-pricing',
      name: 'Bảng giá & Chiết khấu',
      path: '/catalog/pricing',
      icon: BadgePercent,
      category: 'Sản phẩm & Chính sách',
    },
    {
      id: 'catalog-products',
      name: 'Danh mục sản phẩm',
      path: '/catalog/products',
      icon: Package,
      category: 'Sản phẩm & Chính sách',
    },
    {
      id: 'inventory-stock',
      name: 'Tra cứu tồn kho',
      path: '/inventory/stock',
      icon: Warehouse,
      category: 'Kho vận',
    },
    {
      id: 'accounting-debt',
      name: 'Theo dõi công nợ',
      path: '/accounting/debt',
      icon: Receipt,
      category: 'Tài chính',
    },
    {
      id: 'system-users',
      name: 'Quản lý nhân sự',
      path: '/system/users',
      icon: Users,
      category: 'Quản trị hệ thống',
    },
    {
      id: 'system-audit-logs',
      name: 'Nhật ký hệ thống',
      path: '/system/audit-logs',
      icon: ScrollText,
      category: 'Quản trị hệ thống',
    },
  ],

  // 4. Nhân viên kho / Thủ kho (WAREHOUSE_KEEPER)
  [USER_ROLES.WAREHOUSE_KEEPER]: [
    {
      id: 'dashboard',
      name: 'Bảng điều khiển',
      path: '/dashboard',
      icon: LayoutDashboard,
      category: 'Kiểm soát Kho',
    },
    {
      id: 'sales-orders',
      name: 'Đơn hàng chuẩn bị xuất',
      path: '/warehouse/orders',
      icon: ShoppingCart,
      category: 'Soạn hàng & Giao nhận',
    },
    {
      id: 'order-picking',
      name: 'Soạn hàng theo vị trí (Picking)',
      path: '/warehouse/picking',
      icon: PackageCheck,
      category: 'Soạn hàng & Giao nhận',
    },
    {
      id: 'warehouse-goods-in-transit',
      name: 'Hàng xuất trên đường',
      path: '/warehouse/goods-in-transit',
      icon: Truck,
      category: 'Soạn hàng & Giao nhận',
    },
    {
      id: 'inventory-receipts',
      name: 'Nhập kho hàng hóa',
      path: '/inventory/receipts',
      icon: PackagePlus,
      category: 'Nhập / Xuất kho',
    },
    {
      id: 'inventory-issues',
      name: 'Soạn hàng & Xuất kho',
      path: '/inventory/issues',
      icon: PackageMinus,
      category: 'Nhập / Xuất kho',
    },
    {
      id: 'inventory-transfers',
      name: 'Chuyển kho nội bộ',
      path: '/inventory/transfers',
      icon: ArrowLeftRight,
      category: 'Điều chuyển & Kiểm tra',
    },
    {
      id: 'inventory-audits',
      name: 'Kiểm kê kho hàng',
      path: '/inventory/audits',
      icon: ClipboardList,
      category: 'Điều chuyển & Kiểm tra',
    },
    {
      id: 'inventory-stock',
      name: 'Sổ tồn kho & Lô hàng',
      path: '/inventory/stock',
      icon: Warehouse,
      category: 'Quản lý Tồn kho',
    },
    {
      id: 'inventory-stock-card',
      name: 'Thẻ kho hàng hóa',
      path: '/inventory/stock-card',
      icon: FileSpreadsheet,
      category: 'Quản lý Tồn kho',
    },
    {
      id: 'inventory-batches',
      name: 'Quản lý lô & Hạn sử dụng',
      path: '/inventory/batches',
      icon: CalendarClock,
      category: 'Quản lý Tồn kho',
    },
    {
      id: 'inventory-suppliers',
      name: 'Quản lý nhà cung cấp',
      path: '/inventory/suppliers',
      icon: Building2,
      category: 'Nhập / Xuất kho',
    },
    {
      id: 'catalog-products',
      name: 'Danh mục sản phẩm',
      path: '/catalog/products',
      icon: Package,
      category: 'Tra cứu',
    },
  ],

  // 5. Quản lý kho (WAREHOUSE_MANAGER)
  [USER_ROLES.WAREHOUSE_MANAGER]: [
    {
      id: 'dashboard',
      name: 'Bảng điều khiển',
      path: '/dashboard',
      icon: LayoutDashboard,
      category: 'Kiểm soát Kho',
    },
    {
      id: 'reports-inventory',
      name: 'Báo cáo kho hàng',
      path: '/reports/inventory',
      icon: BarChart3,
      category: 'Báo cáo Vận hành',
    },
    {
      id: 'sales-orders',
      name: 'Quản lý đơn hàng',
      path: '/warehouse/orders',
      icon: ShoppingCart,
      category: 'Soạn hàng & Giao nhận',
    },
    {
      id: 'order-picking',
      name: 'Phiếu soạn hàng (Picking)',
      path: '/warehouse/picking',
      icon: PackageCheck,
      category: 'Soạn hàng & Giao nhận',
    },
    {
      id: 'warehouse-goods-in-transit',
      name: 'Hàng xuất trên đường',
      path: '/warehouse/goods-in-transit',
      icon: Truck,
      category: 'Soạn hàng & Giao nhận',
    },
    {
      id: 'inventory-receipts',
      name: 'Nhập kho hàng hóa',
      path: '/inventory/receipts',
      icon: PackagePlus,
      category: 'Lịch sử Nhập / Xuất',
    },
    {
      id: 'inventory-issues',
      name: 'Xuất kho giao hàng',
      path: '/inventory/issues',
      icon: PackageMinus,
      category: 'Lịch sử Nhập / Xuất',
    },
    {
      id: 'inventory-transfers',
      name: 'Chuyển kho nội bộ',
      path: '/inventory/transfers',
      icon: ArrowLeftRight,
      category: 'Lịch sử Nhập / Xuất',
    },
    {
      id: 'inventory-audits',
      name: 'Kiểm kê kho hàng',
      path: '/inventory/audits',
      icon: ClipboardCheck,
      category: 'Kiểm kê & Điều chỉnh',
    },
    {
      id: 'inventory-adjustments',
      name: 'Phiếu điều chỉnh tồn',
      path: '/inventory/adjustments',
      icon: SlidersHorizontal,
      category: 'Kiểm kê & Điều chỉnh',
    },
    {
      id: 'inventory-stock',
      name: 'Sổ tồn kho & Lô hàng',
      path: '/inventory/stock',
      icon: Warehouse,
      category: 'Kiểm soát Kho',
    },
    {
      id: 'inventory-stock-card',
      name: 'Thẻ kho hàng hóa',
      path: '/inventory/stock-card',
      icon: FileSpreadsheet,
      category: 'Kiểm soát Kho',
    },
    {
      id: 'inventory-batches',
      name: 'Quản lý lô & Hạn sử dụng',
      path: '/inventory/batches',
      icon: CalendarClock,
      category: 'Kiểm soát Kho',
    },
    {
      id: 'inventory-warehouses',
      name: 'Quản lý kho & vị trí',
      path: '/inventory/warehouses',
      icon: Warehouse,
      category: 'Kiểm soát Kho',
    },
    {
      id: 'inventory-suppliers',
      name: 'Quản lý nhà cung cấp',
      path: '/inventory/suppliers',
      icon: Building2,
      category: 'Kiểm soát Kho',
    },
    {
      id: 'catalog-products',
      name: 'Danh mục sản phẩm',
      path: '/catalog/products',
      icon: Package,
      category: 'Tra cứu',
    },
  ],

  // 6. Kế toán công nợ (ACCOUNTANT)
  [USER_ROLES.ACCOUNTANT]: [
    {
      id: 'dashboard',
      name: 'Bảng điều khiển',
      path: '/dashboard',
      icon: LayoutDashboard,
      category: 'Hóa đơn & Chứng từ',
    },
    {
      id: 'accounting-invoices',
      name: 'Hóa đơn & Chứng từ',
      path: '/accounting/invoices',
      icon: FileText,
      category: 'Hóa đơn & Chứng từ',
    },
    {
      id: 'accounting-payments',
      name: 'Phiếu thu & Đối trừ công nợ',
      path: '/accounting/payments',
      icon: CreditCard,
      category: 'Thu chi & Thanh toán',
    },
    {
      id: 'accounting-debt',
      name: 'Sổ chi tiết công nợ',
      path: '/accounting/debt',
      icon: Receipt,
      category: 'Theo dõi Công nợ',
    },
    {
      id: 'accounting-returns',
      name: 'Xử lý phiếu trả hàng',
      path: '/accounting/returns',
      icon: RotateCcw,
      category: 'Nghiệp vụ Bán hàng',
    },
    {
      id: 'sales-orders',
      name: 'Quản lý đơn hàng',
      path: '/sales/orders',
      icon: ShoppingCart,
      category: 'Nghiệp vụ Bán hàng',
    },
    {
      id: 'sales-customers',
      name: 'Quản lý đại lý',
      path: '/sales/customers',
      icon: Users,
      category: 'Quản lý Đại lý',
    },
    {
      id: 'sales-credit-limit',
      name: 'Hạn mức công nợ',
      path: '/sales/credit-limit',
      icon: CreditCard,
      category: 'Quản lý Đại lý',
    },
    {
      id: 'catalog-pricing',
      name: 'Bảng giá & Chiết khấu',
      path: '/catalog/pricing',
      icon: BadgePercent,
      category: 'Tra cứu',
    },
    {
      id: 'catalog-products',
      name: 'Danh mục sản phẩm',
      path: '/catalog/products',
      icon: Package,
      category: 'Tra cứu',
    },
    {
      id: 'inventory-stock',
      name: 'Tra cứu tồn kho',
      path: '/inventory/stock',
      icon: Warehouse,
      category: 'Tra cứu',
    },
    {
      id: 'inventory-receipts',
      name: 'Phiếu nhập kho',
      path: '/inventory/receipts',
      icon: PackagePlus,
      category: 'Tra cứu',
    },
  ],

  // 7. Quản trị hệ thống (ADMIN - Full Access)
  [USER_ROLES.ADMIN]: [
    {
      id: 'dashboard',
      name: 'Bảng điều khiển tổng quan',
      path: '/dashboard',
      icon: LayoutDashboard,
      category: 'Quản trị Hệ thống',
    },
    {
      id: 'system-users',
      name: 'Quản lý người dùng',
      path: '/system/users',
      icon: Users,
      category: 'Quản trị Hệ thống',
    },
    {
      id: 'system-audit-logs',
      name: 'Nhật ký hệ thống',
      path: '/system/audit-logs',
      icon: ScrollText,
      category: 'Quản trị Hệ thống',
    },
    {
      id: 'sales-orders',
      name: 'Quản lý đơn hàng',
      path: '/sales/orders',
      icon: ShoppingCart,
      category: 'Nghiệp vụ Kinh doanh',
    },
    {
      id: 'sales-customers',
      name: 'Quản lý đại lý',
      path: '/sales/customers',
      icon: Users,
      category: 'Nghiệp vụ Kinh doanh',
    },
    {
      id: 'catalog-pricing',
      name: 'Bảng giá & Chiết khấu',
      path: '/catalog/pricing',
      icon: BadgePercent,
      category: 'Nghiệp vụ Kinh doanh',
    },
    {
      id: 'catalog-products',
      name: 'Danh mục sản phẩm',
      path: '/catalog/products',
      icon: Package,
      category: 'Kho vận & Hàng hóa',
    },
    {
      id: 'inventory-stock',
      name: 'Quản lý tồn kho & Lô hàng',
      path: '/inventory/stock',
      icon: Warehouse,
      category: 'Kho vận & Hàng hóa',
    },
    {
      id: 'inventory-batches',
      name: 'Quản lý lô & Hạn sử dụng',
      path: '/inventory/batches',
      icon: CalendarClock,
      category: 'Kho vận & Hàng hóa',
    },
    {
      id: 'inventory-warehouses',
      name: 'Quản lý kho & vị trí',
      path: '/inventory/warehouses',
      icon: Warehouse,
      category: 'Kho vận & Hàng hóa',
    },
    {
      id: 'order-picking',
      name: 'Phiếu soạn hàng (Picking)',
      path: '/warehouse/picking',
      icon: PackageCheck,
      category: 'Kho vận & Hàng hóa',
    },
    {
      id: 'warehouse-goods-in-transit',
      name: 'Hàng xuất trên đường',
      path: '/warehouse/goods-in-transit',
      icon: Truck,
      category: 'Kho vận & Hàng hóa',
    },
    {
      id: 'inventory-transfers',
      name: 'Chuyển kho nội bộ',
      path: '/inventory/transfers',
      icon: ArrowLeftRight,
      category: 'Kho vận & Hàng hóa',
    },
    {
      id: 'inventory-suppliers',
      name: 'Quản lý nhà cung cấp',
      path: '/inventory/suppliers',
      icon: Building2,
      category: 'Kho vận & Hàng hóa',
    },
    {
      id: 'accounting-invoices',
      name: 'Hóa đơn & Công nợ',
      path: '/accounting/invoices',
      icon: Receipt,
      category: 'Tài chính & Kế toán',
    },
  ],
};

/**
 * Chuẩn hóa chuỗi vai trò sang UserRoleType
 */
export const normalizeRole = (role?: string): UserRoleType => {
  if (!role) return USER_ROLES.CUSTOMER;

  const upper = role.trim().toUpperCase();

  if (upper === 'ADMIN' || upper.includes('ADMIN')) {
    return USER_ROLES.ADMIN;
  }
  if (upper === 'SALES_REP' || upper === 'SALES' || upper.includes('REP')) {
    return USER_ROLES.SALES_REP;
  }
  if (
    upper === 'SALES_MANAGER' ||
    upper === 'SALESMANAGER' ||
    upper.includes('SALES_MAN') ||
    upper.includes('BUSINESS')
  ) {
    return USER_ROLES.SALES_MANAGER;
  }
  if (
    upper === 'WAREHOUSE_MANAGER' ||
    upper === 'WAREHOUSEMANAGER' ||
    upper.includes('WH_MAN') ||
    upper === 'WH_MANAGER'
  ) {
    return USER_ROLES.WAREHOUSE_MANAGER;
  }
  if (
    upper === 'WAREHOUSE_KEEPER' ||
    upper === 'WAREHOUSE' ||
    upper.includes('KEEPER')
  ) {
    return USER_ROLES.WAREHOUSE_KEEPER;
  }
  if (upper === 'ACCOUNTANT' || upper.includes('ACCOUNT')) {
    return USER_ROLES.ACCOUNTANT;
  }
  if (upper === 'CUSTOMER' || upper.includes('DEALER') || upper.includes('PORTAL')) {
    return USER_ROLES.CUSTOMER;
  }

  return USER_ROLES.CUSTOMER;
};

/**
 * Lấy danh sách menu items tương ứng với vai trò của user
 */
export const getNavigationItems = (roleOrRoles?: string | string[]): MenuItem[] => {
  let primaryRoleString = '';

  if (Array.isArray(roleOrRoles)) {
    primaryRoleString = roleOrRoles[0] || '';
  } else if (typeof roleOrRoles === 'string') {
    primaryRoleString = roleOrRoles;
  }

  const role = normalizeRole(primaryRoleString);
  return ROLE_NAVIGATION_MATRIX[role] || ROLE_NAVIGATION_MATRIX[USER_ROLES.CUSTOMER];
};

/**
 * Lấy metadata ngữ cảnh người dùng phục vụ Context Bar
 */
export const getUserContext = (user?: AuthUser | null) => {
  const role = normalizeRole(user?.roles?.[0] || user?.role);
  const meta = ROLE_CONFIGS[role];

  // Trích xuất họ tên hiển thị
  const fullName = user?.fullName?.trim() || 'Người dùng LOHA';

  // Trích xuất địa bàn / kho làm việc
  let locationText = user?.assignedWarehouse?.trim() || '';
  if (!locationText) {
    locationText = meta.defaultLocation;
  }

  // Chữ cái đầu Avatar
  const avatarLetter = fullName.charAt(0).toUpperCase() || 'L';

  return {
    fullName,
    role,
    roleLabel: meta.label,
    shortRoleLabel: meta.shortLabel,
    badgeClass: meta.badgeClass,
    dotClass: meta.dotClass,
    locationText,
    avatarLetter,
    description: meta.description,
  };
};
