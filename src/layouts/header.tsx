import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Menu,
  User,
  Lock,
  Power,
  ChevronDown,
  ChevronRight,
  LogOut,
  Loader2,
} from "lucide-react";
import { getStoredUser } from "../utils/navigation";
import {
  getNavigationItems,
  getUserContext,
  ROLE_NAVIGATION_MATRIX,
  type MenuItem,
} from "../utils/navigation-config";
import { tokenStorage } from "../utils/token-storage";
import { resolveAvatarUrl } from "../utils/avatar";
import { authService } from "../services/auth.service";

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

/**
 * Lấy tiêu đề trang dựa theo danh mục điều hướng của người dùng hiện tại và URL
 * Đảm bảo 100% tên tab trên Navbar và tiêu đề trên Header luôn đồng nhất tuyệt đối
 */
const getPageHeaderInfo = (
  pathname: string,
  userMenuItems: MenuItem[] = []
): { title: string; category: string } => {
  // 1. Ưu tiên khớp chính xác theo menu item của người dùng hiện tại trên Navbar
  const sortedUserItems = [...userMenuItems].sort((a, b) => b.path.length - a.path.length);
  const matchedUserItem = sortedUserItems.find(
    (item) => pathname === item.path || pathname.startsWith(item.path + "/")
  );

  if (matchedUserItem) {
    return { title: matchedUserItem.name, category: matchedUserItem.category || "Hệ thống" };
  }

  // 2. Tra cứu đối chiếu theo toàn bộ danh mục các vai trò trong hệ thống
  for (const items of Object.values(ROLE_NAVIGATION_MATRIX)) {
    const sorted = [...items].sort((a, b) => b.path.length - a.path.length);
    const found = sorted.find(
      (item) => pathname === item.path || pathname.startsWith(item.path + "/")
    );
    if (found) {
      return { title: found.name, category: found.category || "Hệ thống" };
    }
  }

  // 3. Các trang nghiệp vụ / chức năng bổ trợ ngoài menu chính
  if (pathname.startsWith("/catalog/categories")) {
    return { title: "Danh mục sản phẩm", category: "Sản phẩm & Chính sách" };
  }
  if (pathname.startsWith("/profile/change-password") || pathname.startsWith("/settings/security")) {
    return { title: "Đổi mật khẩu tài khoản", category: "Bảo mật cá nhân" };
  }
  if (pathname === "/profile") {
    return { title: "Hồ sơ cá nhân", category: "Tài khoản cá nhân" };
  }
  if (pathname === "/403") {
    return { title: "Không có quyền truy cập", category: "Cảnh báo" };
  }
  if (pathname === "/404") {
    return { title: "Không tìm thấy trang", category: "Cảnh báo" };
  }

  return { title: "Hệ thống LOHA SALES", category: "Vận hành" };
};

/**
 * Header Component:
 * - Hiển thị tên trang với hiệu ứng animation chuyển tab mượt mà
 * - Nút đóng/mở Navbar tiện lợi trên Mobile
 * - Góc phải hiển thị Thẻ Hồ sơ (Avatar, Họ tên, Tag vai trò) có Dropdown menu khi nhấn
 */
export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    tokenStorage.getUser()?.avatarUrl
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Trạng thái modal xác nhận đăng xuất
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Đồng bộ thông tin người dùng realtime
  useEffect(() => {
    const syncUser = () => {
      const u = tokenStorage.getUser() || getStoredUser();
      setCurrentUser(u);
      setAvatarUrl(u?.avatarUrl);
    };

    window.addEventListener("storage", syncUser);
    window.addEventListener("avatar-updated", syncUser);
    window.addEventListener("user-updated", syncUser);
    syncUser();

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("avatar-updated", syncUser);
      window.removeEventListener("user-updated", syncUser);
    };
  }, []);

  // Đóng dropdown khi chuyển trang
  useEffect(() => {
    setIsDropdownOpen(false);
  }, [location.pathname]);

  // Đóng dropdown khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownOpen]);

  // Xử lý đăng xuất
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await Promise.all([
        authService.logout(),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);
    } catch {
      tokenStorage.clearAuthData();
    } finally {
      setIsExiting(true);
      setTimeout(() => {
        setIsLoggingOut(false);
        setShowLogoutModal(false);
        setIsExiting(false);
        navigate("/auth/login", { replace: true });
      }, 300);
    }
  };

  const menuItems = getNavigationItems(currentUser?.roles || currentUser?.role);
  const { title } = getPageHeaderInfo(location.pathname, menuItems);
  const context = getUserContext(currentUser);
  const cleanFullName =
    (context.fullName || "").replace(/\s*\([^)]*\)/g, "").trim() ||
    context.fullName ||
    "Người dùng";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between border-b border-slate-100 bg-white/95 backdrop-blur-xs px-3 sm:px-6">
      {/* =================================================================== */}
      {/* 1. BÊN TRÁI: NÚT ĐÓNG MỞ NAVBAR & TIÊU ĐỀ TRANG                     */}
      {/* =================================================================== */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* Nút Hamburger chỉ cho Mobile (<1024px) */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="inline-flex lg:hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none transition-colors cursor-pointer"
          aria-label="Mở menu điều hướng"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Tiêu đề trang với animation chuyển đổi siêu mượt mà */}
        <div className="overflow-hidden min-w-0">
          <h1
            key={location.pathname}
            className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate animate-header-title"
          >
            {title}
          </h1>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. BÊN PHẢI: NÚT HỒ SƠ CÁ NHÂN KÈM DROPDOWN MENU XỔ XUỐNG           */}
      {/* =================================================================== */}
      <div className="relative shrink-0" ref={dropdownRef}>
        {/* Nút bấm mở Dropdown Profile */}
        <button
          type="button"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className={`flex items-center gap-2.5 sm:gap-3 p-1.5 sm:px-3 sm:py-2 rounded-2xl border transition-all duration-200 cursor-pointer select-none group focus:outline-none ${
            isDropdownOpen
              ? "bg-slate-50 border-slate-300 shadow-2xs"
              : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300/90"
          }`}
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
          title={`Tài khoản: ${cleanFullName}`}
        >
          {/* Avatar: Ảnh hoặc Chữ cái viết tắt */}
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-[var(--color-brand-gradient)] text-xs sm:text-sm font-bold text-white shadow-2xs group-hover:scale-105 transition-transform duration-200">
            {avatarUrl ? (
              <img
                src={resolveAvatarUrl(avatarUrl)}
                alt={cleanFullName}
                className="h-full w-full object-cover"
              />
            ) : (
              context.avatarLetter || <User className="h-4.5 w-4.5" />
            )}
          </div>

          {/* Tên & Tag vai trò (Ẩn trên mobile siêu nhỏ, hiện từ sm trở lên) */}
          <div className="hidden sm:flex flex-col text-left min-w-0">
            <span
              className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[var(--color-primary)] transition-colors truncate max-w-[140px] leading-tight"
              title={context.fullName}
            >
              {cleanFullName}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.2 text-[10px] font-semibold mt-0.5 w-fit max-w-[140px] truncate ${context.badgeClass}`}
              title={context.roleLabel}
            >
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${context.dotClass}`} />
              <span className="truncate">{context.roleLabel}</span>
            </span>
          </div>

          {/* Mũi tên xoay biểu thị đóng/mở */}
          <ChevronDown
            className={`h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0 ${
              isDropdownOpen ? "rotate-180 text-[var(--color-primary)]" : ""
            }`}
          />
        </button>

        {/* Menu Dropdown xổ xuống kiểu Facebook */}
        {isDropdownOpen && (
          <div
            className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-white shadow-[0_12px_36px_-6px_rgba(0,0,0,0.22),0_4px_16px_rgba(0,0,0,0.08)] border border-slate-200 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right space-y-1.5"
            role="menu"
            aria-orientation="vertical"
          >
            {/* Thẻ người dùng trên cùng kiểu Facebook */}
            <div className="p-1 rounded-2xl bg-white border border-slate-100 shadow-2xs">
              <Link
                to="/profile"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors group/user"
              >
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full overflow-hidden bg-[var(--color-brand-gradient)] text-sm font-bold text-white shadow-xs">
                  {avatarUrl ? (
                    <img
                      src={resolveAvatarUrl(avatarUrl)}
                      alt={cleanFullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    context.avatarLetter || <User className="h-5 w-5" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[15px] font-semibold text-slate-900 group-hover/user:text-[var(--color-primary)] transition-colors truncate">
                    {cleanFullName}
                  </span>
                  <span className="text-xs text-slate-500 truncate">
                    {context.roleLabel}
                  </span>
                </div>
              </Link>
            </div>

            {/* Danh sách các nút kiểu Facebook: rõ ràng, icon tròn xám, chữ đen đậm vừa, hover nền xám rõ nét */}
            <div className="space-y-0.5 pt-0.5">
              {/* Mục 1: Hồ sơ cá nhân */}
              <Link
                to="/profile"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group"
                role="menuitem"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200/80 group-hover:bg-slate-200 text-slate-900 transition-colors">
                    <User className="h-5 w-5" />
                  </div>
                  <span className="text-[15px] font-medium text-slate-900 truncate">
                    Hồ sơ cá nhân
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {/* Mục 2: Đổi mật khẩu */}
              <Link
                to="/profile/change-password"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group"
                role="menuitem"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200/80 group-hover:bg-slate-200 text-slate-900 transition-colors">
                    <Lock className="h-5 w-5" />
                  </div>
                  <span className="text-[15px] font-medium text-slate-900 truncate">
                    Đổi mật khẩu
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {/* Mục 3: Đăng xuất */}
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  setShowLogoutModal(true);
                }}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group text-left"
                role="menuitem"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200/80 group-hover:bg-slate-200 text-slate-900 transition-colors">
                    <LogOut className="h-5 w-5" />
                  </div>
                  <span className="text-[15px] font-medium text-slate-900 truncate">
                    Đăng xuất
                  </span>
                </div>
              </button>
            </div>

            {/* Dòng chữ chân trang phong cách Facebook căn giữa */}
            <div className="px-3 pt-2.5 pb-1 border-t border-slate-100 mt-1 text-center">
              <p className="text-[11px] font-medium text-slate-400">
                LOHA SALES • Hệ thống quản lý bán hàng
              </p>
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 3. MODAL XÁC NHẬN ĐĂNG XUẤT (PORTAL CHUẨN)                         */}
      {/* =================================================================== */}
      {showLogoutModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onClick={() => !isLoggingOut && setShowLogoutModal(false)}
            className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300 ${
              isExiting ? "opacity-0" : "animate-modal-backdrop-in"
            }`}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 transition-all duration-300 ${
                isExiting ? "scale-95 opacity-0" : "animate-modal-in"
              }`}
            >
              {isLoggingOut ? (
                <div className="py-4 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-4 ring-rose-100/70 shadow-sm animate-pulse">
                    <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      Đang đăng xuất...
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Đang kết thúc phiên và chuyển hướng
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 shadow-2xs">
                    <Power className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Đăng xuất tài khoản?
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Bạn có chắc muốn kết thúc phiên làm việc này không?
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowLogoutModal(false)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-semibold text-white shadow-sm shadow-rose-600/20 transition-all cursor-pointer active:scale-98"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </header>
  );
};
