import React, { useState, useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import {
  X,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import logoImg from "../assets/logo.png";
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
    window.addEventListener("user-updated", syncUser);
    syncUser();

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("user-updated", syncUser);
    };
  }, [location.pathname]);

  const menuItems: MenuItem[] = getNavigationItems(currentUser?.roles || currentUser?.role);

  return (
    <div className="flex h-full flex-col justify-between p-3 sm:p-4 bg-white select-none">
      {/* ===================================================================== */}
      {/* PHẦN 1: LOGO & BRAND IDENTITY KÈM NÚT ĐÓNG/MỞ THU GỌN                 */}
      {/* ===================================================================== */}
      <div className="flex flex-col min-h-0 flex-1">
        {/* Header Logo + Toggle: Chuyển đổi trạng thái đóng/mở siêu mượt mà không bị nhảy layout */}
        <div
          className={`border-b border-slate-100 transition-[height,padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden flex flex-col justify-between ${
            isCollapsed ? "h-[96px] pb-3" : "h-[56px] pb-3"
          }`}
        >
          {/* Hàng 1: Logo Icon + Tên LOHA SALES + Nút thu gọn (<) khi mở rộng */}
          <div className="flex items-center justify-between w-full min-w-0 px-0.5">
            <Link
              to="/"
              onClick={onItemClick}
              className="flex items-center gap-2 group focus:outline-none min-w-0"
              title="LOHA SALES"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-xs group-hover:scale-105 transition-transform duration-200">
                <img
                  src={logoImg}
                  alt="LOHA SALES"
                  className="h-full w-full object-cover"
                />
              </div>
              <div
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  isCollapsed
                    ? "max-w-0 opacity-0 -translate-x-2 pointer-events-none"
                    : "max-w-[150px] opacity-100 translate-x-0"
                }`}
              >
                <span className="text-base font-bold tracking-tight text-slate-900 group-hover:text-[var(--color-primary)] transition-colors">
                  LOHA SALES
                </span>
              </div>
            </Link>

            {/* Nút mũi tên thu gọn (<) khi đang mở rộng */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className={`group/collapse hidden lg:flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50/80 text-slate-500 hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary-subtle)] hover:shadow-xs transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] cursor-pointer active:scale-95 ${
                  isCollapsed
                    ? "opacity-0 scale-75 max-w-0 pointer-events-none"
                    : "opacity-100 scale-100 max-w-8"
                }`}
                title="Thu gọn menu"
                aria-label="Thu gọn menu"
              >
                <ChevronLeft className="h-4.5 w-4.5 transition-transform duration-200 group-hover/collapse:-translate-x-0.5" />
              </button>
            )}
          </div>

          {/* Hàng 2: Nút mũi tên mở rộng (>) nằm dưới Logo khi đang thu gọn */}
          {onToggleCollapse && (
            <div
              className={`flex items-center justify-center w-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                isCollapsed
                  ? "opacity-100 scale-100 translate-y-0 h-8 mt-1"
                  : "opacity-0 scale-75 -translate-y-2 h-0 pointer-events-none overflow-hidden"
              }`}
            >
              <button
                type="button"
                onClick={onToggleCollapse}
                className="group/expand h-8 w-8 flex items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50/80 text-slate-500 hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary-subtle)] hover:shadow-xs transition-all duration-200 cursor-pointer active:scale-95"
                title="Mở rộng menu"
                aria-label="Mở rộng menu"
              >
                <ChevronRight className="h-4.5 w-4.5 transition-transform duration-200 group-hover/expand:translate-x-0.5" />
              </button>
            </div>
          )}
        </div>

        {/* ===================================================================== */}
        {/* PHẦN 2: DANH MỤC MENU ĐIỀU HƯỚNG THEO VAI TRÒ (DYNAMIC NAVIGATION)    */}
        {/* ===================================================================== */}
        <div className="mt-4 flex-1 flex flex-col min-h-0 overflow-y-auto pr-0.5">
          <div onClick={(e) => isCollapsed && e.stopPropagation()}>
            <nav className="space-y-2">
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
                    className={`group relative flex items-center px-3 py-2 min-h-[44px] rounded-xl text-sm font-semibold transition-colors duration-200 active:scale-[0.98] ${
                      isItemActive
                        ? "bg-[var(--color-primary-light)] text-[var(--color-primary)] font-bold shadow-2xs"
                        : "text-slate-700 hover:bg-slate-50/90 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center w-full min-w-0">
                      {/* Thanh định vị Active nhỏ ở bên trái */}
                      {isItemActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[var(--color-primary)] shadow-xs" />
                      )}

                      {/* Icon vị trí cố định tuyệt đối mượt mà */}
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                        <Icon
                          className={`h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                            isItemActive
                              ? "text-[var(--color-primary)]"
                              : "text-slate-500 group-hover:text-slate-800"
                          }`}
                        />
                      </div>

                      {/* Tên Menu co giãn mượt mà không bao giờ giật */}
                      <span
                        className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] tracking-tight ${
                          isCollapsed
                            ? "max-w-0 opacity-0 -translate-x-2.5 pointer-events-none"
                            : "max-w-[190px] opacity-100 translate-x-0 ml-3"
                        }`}
                      >
                        {item.name}
                      </span>
                    </div>

                    {/* Mũi tên bên phải co giãn mượt mà */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shrink-0 ${
                        !isCollapsed && isItemActive
                          ? "max-w-5 opacity-100 ml-1"
                          : "max-w-0 opacity-0 pointer-events-none"
                      }`}
                    >
                      <ChevronRight className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                    </div>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Vùng khoảng trống bên dưới các icon khi thu gọn: Click để mở rộng navbar */}
          {isCollapsed && onToggleCollapse && (
            <div
              onClick={onToggleCollapse}
              className="flex-1 min-h-[80px] w-full cursor-ew-resize select-none"
              title="Bấm để mở rộng thanh điều hướng"
              aria-label="Mở rộng thanh điều hướng"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggleCollapse();
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Component Sidebar chính cho AppLayout:
 * - Desktop: Tùy biến thu gọn (w-[76px]) hoặc mở rộng (w-[280px]) mượt mà
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
        className={`hidden h-full shrink-0 border-r border-slate-100 bg-white lg:flex lg:flex-col transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isCollapsed ? "w-[76px]" : "w-[280px]"
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
