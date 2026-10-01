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
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    name: "Quản lý người dùng",
    path: "/system/users",
    icon: Users,
  },
  {
    name: "Nhật ký hệ thống",
    path: "/system/audit-logs",
    icon: ScrollText,
  },
  {
    name: "Danh mục sản phẩm",
    path: "/catalog/products",
    icon: Package,
  },
  {
    name: "Bảng giá & Chiết khấu",
    path: "/catalog/pricing",
    icon: BadgePercent,
  },
  {
    name: "Tổng quan hệ thống",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
];

interface SidebarNavContentProps {
  onItemClick?: () => void;
}

/**
 * Nội dung lõi của Sidebar (tái sử dụng cho cả Desktop & Mobile Drawer)
 */
const SidebarNavContent: React.FC<SidebarNavContentProps> = ({ onItemClick }) => {
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
                  ADMIN PANEL
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Danh mục Menu điều hướng */}
        <div className="mt-6">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Quản trị & Cấu hình
          </p>
          <nav className="mt-2 space-y-1">
            {MENU_ITEMS.map((item) => {
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

      {/* 3. Phần Cuối: Trạng thái hệ thống */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold text-slate-700">
            Hệ thống: Trực tuyến
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
            <span>Bảo mật 2FA Active</span>
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
      {/* =================================================================== */}
      {/* 1. Desktop Sidebar (Cố định, không che khuất màn hình)             */}
      {/* =================================================================== */}
      <aside className="hidden h-full w-[260px] shrink-0 border-r border-slate-100 bg-white lg:flex lg:flex-col">
        <SidebarNavContent />
      </aside>

      {/* =================================================================== */}
      {/* 2. Mobile Drawer (Hiển thị khi mở menu trên mobile/tablet)          */}
      {/* =================================================================== */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop mờ nhẹ */}
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 z-50 flex w-[260px] max-w-full flex-col bg-white shadow-2xl transition-transform">
            {/* Nút đóng Drawer */}
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
