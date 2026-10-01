import React from "react";
import { NavLink } from "react-router-dom";
import {
  Users,
  ScrollText,
  Package,
  BadgePercent,
  LayoutDashboard,
  Layers,
  X,
  ShieldCheck,
  ShoppingCart,
  Warehouse,
  Receipt,
  Store,
} from "lucide-react";
import { getStoredUser } from "../utils/navigation";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  roles?: string[]; // Nếu không khai báo, tất cả vai trò đều thấy
}

const MENU_ITEMS: MenuItem[] = [
  {
    name: "Tổng quan hệ thống",
    path: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "SALES_MANAGER", "WAREHOUSE_MANAGER"],
  },
  {
    name: "Danh mục sản phẩm",
    path: "/catalog/products",
    icon: Package,
    // Tất cả người dùng đều có thể xem danh mục (giá vốn tự động ẩn trên server theo SN-10)
  },
  {
    name: "Quản lý tồn kho",
    path: "/inventory/stock",
    icon: Warehouse,
    roles: ["ADMIN", "WAREHOUSE_KEEPER", "WAREHOUSE_MANAGER", "WH_MANAGER"],
  },
  {
    name: "Đơn hàng Bán buôn",
    path: "/sales/orders",
    icon: ShoppingCart,
    roles: ["ADMIN", "SALES_MANAGER", "SALES_REP"],
  },
  {
    name: "Bảng giá & Chiết khấu",
    path: "/catalog/pricing",
    icon: BadgePercent,
    roles: ["ADMIN", "SALES_MANAGER", "ACCOUNTANT"],
  },
  {
    name: "Hóa đơn & Công nợ",
    path: "/accounting/invoices",
    icon: Receipt,
    roles: ["ADMIN", "ACCOUNTANT"],
  },
  {
    name: "Cổng đặt hàng Đại lý",
    path: "/portal/orders",
    icon: Store,
    roles: ["ADMIN", "CUSTOMER"],
  },
  {
    name: "Quản lý người dùng",
    path: "/system/users",
    icon: Users,
    roles: ["ADMIN"],
  },
  {
    name: "Nhật ký hệ thống",
    path: "/system/audit-logs",
    icon: ScrollText,
    roles: ["ADMIN"],
  },
];

interface SidebarNavContentProps {
  onItemClick?: () => void;
}

/**
 * Nội dung lõi của Sidebar (tái sử dụng cho cả Desktop & Mobile Drawer):
 * - Tự động lọc menu theo vai trò người dùng (RBAC Frontend - SN-10)
 * - Ẩn bớt các mục không phận sự để giao diện tinh gọn, không rối mắt
 */
const SidebarNavContent: React.FC<SidebarNavContentProps> = ({ onItemClick }) => {
  const user = getStoredUser();
  const userRoles = user?.roles || [];

  // Lọc danh mục điều hướng theo quyền hạn (ADMIN luôn thấy tất cả)
  const visibleMenuItems = MENU_ITEMS.filter((item) => {
    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    if (userRoles.includes("ADMIN")) {
      return true;
    }
    return item.roles.some((r) => userRoles.includes(r));
  });

  return (
    <div className="flex h-full flex-col justify-between p-4">
      {/* 1. Phần Đầu: Logo & Brand Identity */}
      <div>
        <div className="flex items-center justify-between pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs">
              <Layers className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-slate-900">
                  LOHA SALES
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  {userRoles[0] || "PORTAL"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Danh mục Menu điều hướng */}
        <div className="mt-6">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Chức năng phân hệ
          </p>
          <nav className="mt-2 space-y-1">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onItemClick}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all duration-150 ${
                      isActive
                        ? "bg-blue-50 text-blue-600 font-semibold shadow-xs"
                        : "text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Vạch chỉ thị Active bên trái */}
                      {isActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-blue-600" />
                      )}
                      <Icon
                        className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                          isActive
                            ? "text-blue-600"
                            : "text-slate-400 group-hover:text-slate-700"
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 3. Phần Cuối: Trạng thái hệ thống & thông tin vai trò */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold text-slate-700">
            {user?.fullName || "Đã kết nối"}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
            <span className="font-medium text-slate-600">RBAC SN-10 Active</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">v1.0.0</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Component Sidebar chính cho AdminLayout:
 * - Desktop: Cố định bên trái w-[260px]
 * - Mobile: Drawer trượt off-canvas mượt mà
 */
export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* 1. Desktop Sidebar */}
      <aside className="hidden h-full w-[260px] shrink-0 border-r border-slate-100 bg-white lg:flex lg:flex-col">
        <SidebarNavContent />
      </aside>

      {/* 2. Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />

          <div className="fixed inset-y-0 left-0 z-50 flex w-[260px] max-w-full flex-col bg-white shadow-2xl transition-transform">
            <div className="absolute top-4 right-3 z-10">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none"
                aria-label="Đóng thanh điều hướng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <SidebarNavContent onItemClick={onClose} />
          </div>
        </div>
      )}
    </>
  );
};
