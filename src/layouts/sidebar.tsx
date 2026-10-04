import React, { useState, useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import {
  Layers,
  X,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { getStoredUser } from "../utils/navigation";
import { tokenStorage } from "../utils/token-storage";
import {
  getNavigationItems,
  type MenuItem,
} from "../utils/navigation-config";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface SidebarNavContentProps {
  onItemClick?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * Nội dung điều hướng của Sidebar (Dùng chung cho cả Desktop & Mobile Drawer):
 * - Hỗ trợ chế độ thu gọn (isCollapsed) linh hoạt, tiết kiệm không gian
 * - Tự động lọc các mục menu theo Role (RBAC Dynamic Navigation - SN-11)
 * - Nút bấm đóng/mở dạng mũi tên chỉ vào/ra kèm hiệu ứng hover mượt mà
 * - Giao diện Clean SaaS theo tiêu chuẩn UI_GUIDELINES.md
 */
const SidebarNavContent: React.FC<SidebarNavContentProps> = ({
  onItemClick,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(getStoredUser());

  useEffect(() => {
    const syncUser = () => {
      const u = tokenStorage.getUser();
      setCurrentUser(u);
    };

    window.addEventListener("storage", syncUser);
    syncUser();

    return () => {
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  const menuItems: MenuItem[] = getNavigationItems(currentUser?.roles || currentUser?.role);

  return (
    <div className="flex h-full flex-col justify-between p-3 sm:p-3.5 bg-white select-none">
      {/* ===================================================================== */}
      {/* PHẦN 1: LOGO & BRAND IDENTITY KÈM NÚT ĐÓNG/MỞ THU GỌN                 */}
      {/* ===================================================================== */}
      <div className="flex flex-col min-h-0 flex-1">
        {/* Header khi mở rộng: Logo + Brand + Nút mũi tên chỉ vào thu gọn */}
        {!isCollapsed ? (
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 px-1">
            <Link
              to="/"
              onClick={onItemClick}
              className="flex items-center gap-2.5 group focus:outline-none min-w-0"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs group-hover:scale-105 transition-transform duration-200">
                <Layers className="h-4.5 w-4.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                  LOHA SALES
                </span>
              </div>
            </Link>

            {/* Nút mũi tên chỉ vào (Thu gọn menu) kèm hiệu ứng hover dịch chuyển */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="group/collapse hidden lg:flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50/80 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 hover:shadow-xs transition-all duration-200 cursor-pointer active:scale-95"
                title="Thu gọn menu"
                aria-label="Thu gọn menu"
              >
                <ChevronLeft className="h-4.5 w-4.5 transition-transform duration-200 group-hover/collapse:-translate-x-0.5" />
              </button>
            )}
          </div>
        ) : (
          /* Header khi thu gọn: Logo icon căn giữa + Nút mũi tên chỉ ra ngoài mở rộng */
          <div className="flex flex-col items-center gap-2.5 pb-3 border-b border-slate-100">
            <Link
              to="/"
              onClick={onItemClick}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs hover:scale-105 transition-transform"
              title="LOHA SALES"
            >
              <Layers className="h-4.5 w-4.5" />
            </Link>

            {/* Nút mũi tên chỉ ra ngoài (Mở rộng menu) kèm hiệu ứng hover dịch chuyển */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="group/expand h-8 w-8 flex items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50/80 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 hover:shadow-xs transition-all duration-200 cursor-pointer active:scale-95"
                title="Mở rộng menu"
                aria-label="Mở rộng menu"
              >
                <ChevronRight className="h-4.5 w-4.5 transition-transform duration-200 group-hover/expand:translate-x-0.5" />
              </button>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* PHẦN 2: DANH MỤC MENU ĐIỀU HƯỚNG THEO VAI TRÒ (DYNAMIC NAVIGATION)    */}
        {/* ===================================================================== */}
        <div className="mt-3 flex-1 overflow-y-auto pr-0.5 space-y-3">
          <div>

            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isItemActive =
                  item.path === "/catalog/products"
                    ? location.pathname === "/catalog/products" ||
                      location.pathname.startsWith("/catalog/categories")
                    : location.pathname === item.path ||
                      location.pathname.startsWith(item.path + "/");

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onItemClick}
                    title={isCollapsed ? item.name : undefined}
                    className={`group relative flex items-center ${isCollapsed
                      ? "justify-center p-2.5"
                      : "justify-between px-3 py-2.5"
                    } rounded-xl text-xs sm:text-sm transition-all duration-200 ease-out active:scale-[0.98] ${isItemActive
                      ? "bg-blue-50 text-blue-600 font-semibold shadow-xs"
                      : "text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div
                      className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3 min-w-0"
                        }`}
                    >
                      {/* Thanh định vị Active nhỏ ở bên trái */}
                      {isItemActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-blue-600" />
                      )}
                      <Icon
                        className={`h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isItemActive
                          ? "text-blue-600"
                          : "text-slate-400 group-hover:text-slate-700"
                          }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate">{item.name}</span>
                      )}
                    </div>

                    {!isCollapsed && isItemActive && (
                      <ChevronRight className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Component Sidebar chính cho AppLayout:
 * - Desktop: Tùy biến thu gọn (w-[72px]) hoặc mở rộng (w-[270px]) mượt mà
 * - Mobile (< 1024px, bao gồm 360px): Drawer trượt off-canvas mượt mà với lớp phủ mờ
 */
export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  return (
    <>
      {/* 1. Desktop Sidebar */}
      <aside
        className={`hidden h-full shrink-0 border-r border-slate-100 bg-white lg:flex lg:flex-col transition-all duration-300 ease-in-out ${isCollapsed ? "w-[72px]" : "w-[270px]"
          }`}
      >
        <SidebarNavContent
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />
      </aside>

      {/* 2. Mobile Drawer (Tối ưu tuyệt đối cho màn hình 360px) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Lớp nền mờ */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Khung Drawer trượt từ bên trái */}
          <div className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-200">
            {/* Nút đóng Drawer */}
            <div className="absolute top-3.5 right-3 z-10">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none transition-colors"
                aria-label="Đóng thanh điều hướng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <SidebarNavContent onItemClick={onClose} isCollapsed={false} />
          </div>
        </div>
      )}
    </>
  );
};
