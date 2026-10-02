import React, { useState, useEffect } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  Layers,
  X,
  MapPin,
  KeyRound,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { getStoredUser } from "../utils/navigation";
import { tokenStorage } from "../utils/token-storage";
import { resolveAvatarUrl } from "../utils/avatar";
import {
  getNavigationItems,
  getUserContext,
  type MenuItem,
} from "../utils/navigation-config";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SidebarNavContentProps {
  onItemClick?: () => void;
}

/**
 * Nội dung điều hướng của Sidebar (Dùng chung cho cả Desktop & Mobile Drawer):
 * - Tự động lọc các mục menu theo Role (RBAC Dynamic Navigation - SN-11)
 * - Tích hợp Context Bar ở chân Sidebar: Tên người dùng, Vai trò (Badge tiếng Việt), Kho / Địa bàn làm việc
 * - Giao diện Clean SaaS theo tiêu chuẩn UI_GUIDELINES.md
 */
const SidebarNavContent: React.FC<SidebarNavContentProps> = ({ onItemClick }) => {
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    tokenStorage.getUser()?.avatarUrl,
  );

  useEffect(() => {
    const syncUser = () => {
      const u = tokenStorage.getUser();
      setCurrentUser(u);
      setAvatarUrl(u?.avatarUrl);
    };

    window.addEventListener("storage", syncUser);
    window.addEventListener("avatar-updated", syncUser);
    syncUser();

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("avatar-updated", syncUser);
    };
  }, []);

  const context = getUserContext(currentUser);
  const menuItems: MenuItem[] = getNavigationItems(currentUser?.roles || currentUser?.role);

  return (
    <div className="flex h-full flex-col justify-between p-3.5 sm:p-4 bg-white select-none">
      {/* ===================================================================== */}
      {/* PHẦN 1: LOGO & BRAND IDENTITY                                         */}
      {/* ===================================================================== */}
      <div className="flex flex-col min-h-0 flex-1">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 px-1">
          <Link
            to="/"
            onClick={onItemClick}
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs group-hover:scale-105 transition-transform duration-200">
              <Layers className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                LOHA SALES
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                Phân phối & Kho vận B2B
              </span>
            </div>
          </Link>
        </div>

        {/* ===================================================================== */}
        {/* PHẦN 2: DANH MỤC MENU ĐIỀU HƯỚNG THEO VAI TRÒ (DYNAMIC NAVIGATION)    */}
        {/* ===================================================================== */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1 -mr-1 space-y-4">
          <div>
            <div className="flex items-center justify-between px-2.5 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Chức năng phân hệ
              </span>
              <span className="text-[10px] font-semibold text-slate-400 font-mono">
                {menuItems.length} mục
              </span>
            </div>

            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onItemClick}
                    className={({ isActive }) =>
                      `group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-xs sm:text-sm transition-all duration-150 ${
                        isActive
                          ? "bg-blue-50 text-blue-600 font-semibold shadow-xs"
                          : "text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Thanh định vị Active nhỏ ở bên trái */}
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
                        </div>

                        {isActive ? (
                          <ChevronRight className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        ) : null}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* PHẦN 3: CONTEXT BAR Ở CHÂN SIDEBAR (HIỂN THỊ RÕ TÊN, ROLE & ĐỊA BÀN)  */}
      {/* ===================================================================== */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 space-y-2.5">
          {/* Hàng 1: Avatar chữ cái hoặc ảnh thực + Họ tên + Trạng thái */}
          <Link
            to="/profile"
            onClick={onItemClick}
            className="flex items-center gap-2.5 group/user hover:opacity-90 transition-opacity"
            title="Xem hồ sơ cá nhân & Đổi ảnh đại diện"
          >
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-2xs group-hover/user:ring-2 group-hover/user:ring-blue-500/30 transition-all">
              {avatarUrl ? (
                <img
                  src={resolveAvatarUrl(avatarUrl)}
                  alt={`Ảnh đại diện ${context.fullName}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                context.avatarLetter
              )}
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white z-10 ${context.dotClass}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-bold text-slate-800 truncate group-hover/user:text-blue-600 transition-colors" title={context.fullName}>
                  {context.fullName}
                </p>
              </div>
              <div className="mt-0.5">
                <span
                  className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold truncate ${context.badgeClass}`}
                >
                  {context.roleLabel}
                </span>
              </div>
            </div>
          </Link>

          {/* Hàng 2: Kho hoặc Địa bàn đang làm việc */}
          <div className="rounded-xl bg-white border border-slate-100 p-2 flex items-start gap-2 shadow-2xs">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-medium text-slate-400 block leading-tight">
                Địa bàn / Kho trực thuộc:
              </span>
              <span
                className="text-[11px] font-semibold text-slate-700 block truncate leading-tight mt-0.5"
                title={context.locationText}
              >
                {context.locationText}
              </span>
            </div>
          </div>

          {/* Hàng 3: Tiện ích đổi mật khẩu nhanh & Phiên bảo mật */}
          <div className="flex items-center justify-between text-[11px] pt-0.5 px-0.5 text-slate-500">
            <Link
              to="/profile/change-password"
              onClick={onItemClick}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-blue-600 transition-colors"
            >
              <KeyRound className="h-3 w-3 text-slate-400" />
              <span>Đổi mật khẩu</span>
            </Link>

            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              <span>RBAC v2</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Component Sidebar chính cho AppLayout:
 * - Desktop: Cố định bên trái w-[270px]
 * - Mobile (< 1024px, bao gồm 360px): Drawer trượt off-canvas mượt mà với lớp phủ mờ
 */
export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* 1. Desktop Sidebar */}
      <aside className="hidden h-full w-[270px] shrink-0 border-r border-slate-100 bg-white lg:flex lg:flex-col">
        <SidebarNavContent />
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

            <SidebarNavContent onItemClick={onClose} />
          </div>
        </div>
      )}
    </>
  );
};
