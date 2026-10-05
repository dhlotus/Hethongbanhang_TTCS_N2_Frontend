import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Layers,
  X,
  ChevronRight,
  ChevronLeft,
  User,
  Lock,
  Power,
  Loader2,
} from "lucide-react";
import { getStoredUser } from "../utils/navigation";
import { tokenStorage } from "../utils/token-storage";
import { resolveAvatarUrl } from "../utils/avatar";
import {
  getNavigationItems,
  getUserContext,
  type MenuItem,
} from "../utils/navigation-config";
import { authService } from "../services/auth.service";

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
 * - Thẻ hồ sơ người dùng đặt ở đầu Navbar theo chuẩn LMS ICTU (SN-144)
 * - Mở rộng danh mục: Hồ sơ, Cập nhật mật khẩu, Đăng xuất khi click
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
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    tokenStorage.getUser()?.avatarUrl
  );
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [isCollapsedPopoverOpen, setIsCollapsedPopoverOpen] = useState<boolean>(false);

  // Trạng thái modal xác nhận đăng xuất
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);

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
  }, [location.pathname]);

  // Khi đổi trang, chỉ đóng popover ở chế độ thu gọn, giữ nguyên menu mở rộng để người dùng chủ động đóng
  useEffect(() => {
    setIsCollapsedPopoverOpen(false);
  }, [location.pathname]);

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

  const menuItems: MenuItem[] = getNavigationItems(currentUser?.roles || currentUser?.role);
  const context = getUserContext(currentUser);
  const cleanFullName =
    (context.fullName || "").replace(/\s*\([^)]*\)/g, "").trim() ||
    context.fullName ||
    "Người dùng";

  return (
    <div className="flex h-full flex-col justify-between p-3 sm:p-3.5 bg-white select-none">
      {/* ===================================================================== */}
      {/* PHẦN 1: LOGO & BRAND IDENTITY KÈM NÚT ĐÓNG/MỞ THU GỌN                 */}
      {/* ===================================================================== */}
      <div className="flex flex-col min-h-0 flex-1">
        {/* Header Logo + Toggle: Chuyển đổi trạng thái đóng/mở siêu mượt mà không bị nhảy layout */}
        <div
          className={`border-b border-slate-100 transition-[height,padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden flex flex-col justify-between ${
            isCollapsed ? "h-[94px] pb-3" : "h-[56px] pb-3.5"
          }`}
        >
          {/* Hàng 1: Logo Icon + Tên LOHA SALES + Nút thu gọn (<) khi mở rộng */}
          <div className="flex items-center justify-between w-full min-w-0 px-0.5">
            <Link
              to="/"
              onClick={onItemClick}
              className="flex items-center gap-2.5 group focus:outline-none min-w-0"
              title="LOHA SALES"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xs group-hover:scale-105 transition-transform duration-200">
                <Layers className="h-5 w-5" />
              </div>
              <div
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  isCollapsed
                    ? "max-w-0 opacity-0 -translate-x-2 pointer-events-none"
                    : "max-w-[150px] opacity-100 translate-x-0"
                }`}
              >
                <span className="text-base font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                  LOHA SALES
                </span>
              </div>
            </Link>

            {/* Nút mũi tên thu gọn (<) khi đang mở rộng */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className={`group/collapse hidden lg:flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50/80 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 hover:shadow-xs transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] cursor-pointer active:scale-95 ${
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
                className="group/expand h-8 w-8 flex items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50/80 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 hover:shadow-xs transition-all duration-200 cursor-pointer active:scale-95"
                title="Mở rộng menu"
                aria-label="Mở rộng menu"
              >
                <ChevronRight className="h-4.5 w-4.5 transition-transform duration-200 group-hover/expand:translate-x-0.5" />
              </button>
            </div>
          )}
        </div>

        {/* ===================================================================== */}
        {/* PHẦN 1.5: THẺ HỒ SƠ NGƯỜI DÙNG Ở ĐẦU NAVBAR (MẪU LMS ICTU - SN-144)    */}
        {/* ===================================================================== */}
        {!isCollapsed ? (
          /* Trạng thái mở rộng: Thẻ card bo góc, hiển thị Avatar, Họ tên, Tag vai trò và nút 3 gạch */
          <div className="mt-3 px-0.5">
            <div
              className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                isUserMenuOpen
                  ? "border-blue-200 bg-slate-50/95 shadow-xs ring-2 ring-blue-500/10"
                  : "border-slate-200/90 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              {/* Header card: Avatar + Tên + Tag vai trò + Nút 3 gạch */}
              <div
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className="flex items-center justify-between p-2.5 cursor-pointer select-none group"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setIsUserMenuOpen((prev) => !prev);
                  }
                }}
                title="Thông tin tài khoản"
                aria-expanded={isUserMenuOpen}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Avatar: Ảnh hoặc chữ cái đại diện */}
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-sm font-bold text-white shadow-xs group-hover:scale-105 transition-transform duration-200">
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

                  {/* Họ tên & Tag vai trò chuẩn hệ thống (Quản trị hệ thống, v.v.) */}
                  <div className="flex flex-col min-w-0 text-left">
                    <span
                      className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate max-w-[130px]"
                      title={context.fullName}
                    >
                      {cleanFullName}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold mt-0.5 w-fit max-w-[130px] truncate ${context.badgeClass}`}
                      title={context.roleLabel}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${context.dotClass}`} />
                      <span className="truncate">{context.roleLabel}</span>
                    </span>
                  </div>
                </div>

                {/* Nút 3 gạch mở rộng menu theo chuẩn giao diện mẫu LMS */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsUserMenuOpen((prev) => !prev);
                  }}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer ${
                    isUserMenuOpen
                      ? "bg-blue-100/80 text-blue-600 shadow-2xs"
                      : "text-slate-500 group-hover:bg-slate-200/70 group-hover:text-slate-800"
                  }`}
                  aria-label="Tùy chọn tài khoản"
                >
                  <svg
                    className={`h-4.5 w-4.5 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isUserMenuOpen ? "rotate-90 text-blue-600" : "rotate-0 text-slate-500"
                    }`}
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  >
                    <line x1="3" y1="5.5" x2="17" y2="5.5" />
                    <line x1="5.5" y1="10" x2="17" y2="10" />
                    <line x1="8" y1="14.5" x2="17" y2="14.5" />
                  </svg>
                </button>
              </div>

              {/* Menu xổ xuống mượt mà chuyên nghiệp với CSS Grid Transition */}
              <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isUserMenuOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0 pointer-events-none"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-slate-200/80 p-1.5 space-y-1">
                    {/* 1. Hồ sơ - Chỉ active khi đúng chính xác đường dẫn /profile (dùng end) */}
                    <NavLink
                      to="/profile"
                      end
                      onClick={() => {
                        onItemClick?.();
                      }}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                          isActive
                            ? "bg-blue-50 text-blue-600 font-bold shadow-2xs"
                            : "text-slate-700 hover:bg-slate-100/90 hover:text-slate-900"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <User
                            className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                              isActive ? "text-blue-600" : "text-slate-500"
                            }`}
                          />
                          <span>Hồ sơ</span>
                        </>
                      )}
                    </NavLink>

                    {/* 2. Cập nhật mật khẩu - Chỉ active khi đúng /profile/change-password */}
                    <NavLink
                      to="/profile/change-password"
                      end
                      onClick={() => {
                        onItemClick?.();
                      }}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                          isActive
                            ? "bg-blue-50 text-blue-600 font-bold shadow-2xs"
                            : "text-slate-700 hover:bg-slate-100/90 hover:text-slate-900"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Lock
                            className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                              isActive ? "text-blue-600" : "text-slate-500"
                            }`}
                          />
                          <span>Cập nhật mật khẩu</span>
                        </>
                      )}
                    </NavLink>

                    {/* 3. Đăng xuất */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowLogoutModal(true);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-rose-600 hover:bg-rose-50/90 transition-colors cursor-pointer"
                    >
                      <Power className="h-4.5 w-4.5 shrink-0 text-rose-600" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Trạng thái thu gọn: Hiển thị Avatar căn giữa gọn gàng, bấm vào hiện Floating Popover Menu xuất hiện từ Avatar */
          <div className="mt-3 flex justify-center px-0.5 relative">
            <button
              type="button"
              onClick={() => setIsCollapsedPopoverOpen((prev) => !prev)}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-sm font-bold text-white shadow-xs hover:ring-2 hover:ring-blue-500/40 hover:scale-105 transition-all cursor-pointer"
              title={`Tài khoản: ${cleanFullName}`}
              aria-label="Tùy chọn tài khoản"
            >
              {avatarUrl ? (
                <img
                  src={resolveAvatarUrl(avatarUrl)}
                  alt={cleanFullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                context.avatarLetter || <User className="h-5 w-5" />
              )}
            </button>

            {/* Popover trôi nổi xuất hiện uyển chuyển từ Avatar khi Navbar thu gọn - KHÔNG DÙNG OVERLAY TỐI MÀN HÌNH */}
            {isCollapsedPopoverOpen && (
              <>
                {/* Vùng click ra ngoài hoàn toàn trong suốt, không làm tối hay mờ trang */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsCollapsedPopoverOpen(false)}
                />
                <div className="fixed left-[78px] top-28 z-50 w-64 rounded-2xl bg-white shadow-2xl border border-slate-200/90 p-2.5 space-y-1 animate-popover-from-avatar">
                  {/* Mũi tên nhỏ tinh tế trỏ về avatar */}
                  <div className="absolute -left-1.5 top-5 h-3 w-3 rotate-45 border-l border-b border-slate-200/90 bg-white" />

                  <div className="px-3 py-2 border-b border-slate-100 mb-1 relative z-10">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {cleanFullName}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold mt-1 w-fit max-w-full truncate ${context.badgeClass}`}
                      title={context.roleLabel}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${context.dotClass}`} />
                      <span className="truncate">{context.roleLabel}</span>
                    </span>
                  </div>

                  <NavLink
                    to="/profile"
                    end
                    onClick={() => setIsCollapsedPopoverOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors relative z-10 ${
                        isActive
                          ? "bg-blue-50 text-blue-600 font-bold shadow-2xs"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <User
                          className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                            isActive ? "text-blue-600" : "text-slate-500"
                          }`}
                        />
                        <span>Hồ sơ</span>
                      </>
                    )}
                  </NavLink>

                  <NavLink
                    to="/profile/change-password"
                    end
                    onClick={() => setIsCollapsedPopoverOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors relative z-10 ${
                        isActive
                          ? "bg-blue-50 text-blue-600 font-bold shadow-2xs"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Lock
                          className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                            isActive ? "text-blue-600" : "text-slate-500"
                          }`}
                        />
                        <span>Cập nhật mật khẩu</span>
                      </>
                    )}
                  </NavLink>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCollapsedPopoverOpen(false);
                      setShowLogoutModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-rose-600 hover:bg-rose-50/90 transition-colors cursor-pointer relative z-10"
                  >
                    <Power className="h-4.5 w-4.5 shrink-0 text-rose-600" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* PHẦN 2: DANH MỤC MENU ĐIỀU HƯỚNG THEO VAI TRÒ (DYNAMIC NAVIGATION)    */}
        {/* ===================================================================== */}
        <div className="mt-3.5 flex-1 flex flex-col min-h-0 overflow-y-auto pr-0.5">
          <div onClick={(e) => isCollapsed && e.stopPropagation()}>
            <nav className="space-y-1.5">
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
                    className={`group relative flex items-center px-2.5 py-2.5 min-h-[46px] rounded-xl text-sm font-semibold transition-colors duration-200 active:scale-[0.98] ${
                      isItemActive
                        ? "bg-blue-50/90 text-blue-600 font-bold shadow-2xs"
                        : "text-slate-700 hover:bg-slate-50/90 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center w-full min-w-0">
                      {/* Thanh định vị Active nhỏ ở bên trái */}
                      {isItemActive && (
                        <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-blue-600 shadow-xs" />
                      )}

                      {/* Icon vị trí cố định tuyệt đối mượt mà */}
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                        <Icon
                          className={`h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                            isItemActive
                              ? "text-blue-600"
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
                      <ChevronRight className="h-4 w-4 text-blue-500 shrink-0" />
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

      {/* Modal xác nhận đăng xuất chuẩn Portal (z-[99999] không bao giờ bị che khuất) */}
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
