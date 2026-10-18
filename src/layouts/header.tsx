import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Menu, User, Lock, Power, ChevronDown, ChevronRight, LogOut, Loader2, ShieldCheck } from 'lucide-react';
import { getStoredUser } from '../utils/navigation';
import {
  getNavigationItems,
  getUserContext,
  ROLE_NAVIGATION_MATRIX,
  type MenuItem,
} from '../utils/navigation-config';
import { tokenStorage } from '../utils/token-storage';
import { resolveAvatarUrl } from '../utils/avatar';
import { authService } from '../services/auth.service';
import { NotificationBell } from '../components/notification-bell';

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

interface PageHeaderInfo {
  title: string;
  category: string;
  breadcrumbs?: Array<{ label: string; path?: string }>;
}

/**
 * Lấy tiêu đề trang dựa theo danh mục điều hướng của người dùng hiện tại và URL
 * Hỗ trợ breadcrumbs phân cấp khi vào các trang con (ví dụ: Quản lý đơn hàng > Tạo đơn hàng mới)
 */
const getPageHeaderInfo = (
  pathname: string,
  userMenuItems: MenuItem[] = []
): PageHeaderInfo => {
  // 0. Trang con phân cấp (Breadcrumbs)
  if (
    pathname.startsWith('/catalog/products/edit/') ||
    pathname.startsWith('/products/edit/') ||
    pathname.includes('/edit') && pathname.includes('/products')
  ) {
    return {
      title: 'Chỉnh sửa sản phẩm',
      category: 'Sản phẩm & Chính sách',
      breadcrumbs: [
        { label: 'Danh mục sản phẩm', path: '/catalog/products' },
        { label: 'Chỉnh sửa sản phẩm' },
      ],
    };
  }
  if (
    pathname.startsWith('/catalog/products/edit-price/') ||
    pathname.startsWith('/products/edit-price/')
  ) {
    return {
      title: 'Điều chỉnh giá sản phẩm',
      category: 'Sản phẩm & Chính sách',
      breadcrumbs: [
        { label: 'Danh mục sản phẩm', path: '/catalog/products' },
        { label: 'Điều chỉnh giá sản phẩm' },
      ],
    };
  }
  if (
    (pathname.startsWith('/sales/customers/') && pathname !== '/sales/customers') ||
    (pathname.startsWith('/customers/') && pathname !== '/customers')
  ) {
    return {
      title: 'Chi tiết hồ sơ đại lý',
      category: 'Bán hàng',
      breadcrumbs: [
        { label: 'Quản lý đại lý', path: '/sales/customers' },
        { label: 'Chi tiết đại lý' },
      ],
    };
  }
  if (pathname === '/sales/orders/create' || pathname === '/orders/create') {
    return {
      title: 'Tạo đơn hàng mới',
      category: 'Bán hàng',
      breadcrumbs: [
        { label: 'Quản lý đơn hàng', path: '/sales/orders' },
        { label: 'Tạo đơn hàng mới' },
      ],
    };
  }
  if (
    pathname === '/route-collections/create' ||
    pathname === '/app/route-collections/create'
  ) {
    return {
      title: 'Tạo phiếu thu mới',
      category: 'Tài chính & Thu chi',
      breadcrumbs: [
        { label: 'Quản lý ngân sách', path: '/route-collections' },
        { label: 'Tạo phiếu thu mới' },
      ],
    };
  }
  if (pathname === '/accounting/invoices/create' || pathname === '/invoices/create') {
    return {
      title: 'Phát hành Hóa đơn Bán hàng',
      category: 'Hóa đơn & Chứng từ',
      breadcrumbs: [
        { label: 'Hóa đơn & Chứng từ', path: '/accounting/invoices' },
        { label: 'Phát hành Hóa đơn Bán hàng' },
      ],
    };
  }
  if (
    (pathname.startsWith('/accounting/invoices/') && pathname !== '/accounting/invoices' && pathname !== '/accounting/invoices/create') ||
    (pathname.startsWith('/invoices/') && pathname !== '/invoices' && pathname !== '/invoices/create')
  ) {
    return {
      title: 'Chi tiết Hóa đơn Bán hàng',
      category: 'Hóa đơn & Chứng từ',
      breadcrumbs: [
        { label: 'Hóa đơn & Chứng từ', path: '/accounting/invoices' },
        { label: 'Chi tiết Hóa đơn' },
      ],
    };
  }
  if (pathname === '/portal/orders/confirm' || pathname === '/portal/orders/create') {
    return {
      title: 'Xác nhận đơn hàng',
      category: 'Mua hàng & Giao nhận',
      breadcrumbs: [
        { label: 'Cổng đặt hàng', path: '/portal/orders' },
        { label: 'Xác nhận đơn hàng' },
      ],
    };
  }
  if (pathname.startsWith('/sales/orders/edit')) {
    return {
      title: 'Chỉnh sửa đơn hàng',
      category: 'Bán hàng',
      breadcrumbs: [
        { label: 'Quản lý đơn hàng', path: '/sales/orders' },
        { label: 'Chỉnh sửa đơn hàng' },
      ],
    };
  }
  if (
    pathname === '/inventory/receipts/create' ||
    pathname === '/inventory/receipts/new' ||
    pathname.startsWith('/inventory/receipts/create/')
  ) {
    return {
      title: 'Lập phiếu nhập kho từ Nhà cung cấp',
      category: 'Nhập / Xuất kho',
      breadcrumbs: [
        { label: 'Nhập kho hàng hóa', path: '/inventory/receipts' },
        { label: 'Lập phiếu nhập kho từ Nhà cung cấp' },
      ],
    };
  }
  if (pathname.startsWith('/inventory/receipts/edit')) {
    return {
      title: 'Chỉnh sửa phiếu nhập kho',
      category: 'Nhập / Xuất kho',
      breadcrumbs: [
        { label: 'Nhập kho hàng hóa', path: '/inventory/receipts' },
        { label: 'Chỉnh sửa phiếu nhập kho' },
      ],
    };
  }

  // SN-188: Phân hệ Soạn hàng & Xuất kho (FEFO)
  if (
    pathname === '/inventory/shipments/create' ||
    pathname === '/app/inventory/shipments/create' ||
    pathname === '/inventory/issues/create'
  ) {
    return {
      title: 'Tạo phiếu xuất kho',
      category: 'Nhập / Xuất kho',
      breadcrumbs: [
        { label: 'Soạn hàng & Xuất kho', path: '/inventory/shipments' },
        { label: 'Tạo phiếu xuất kho' },
      ],
    };
  }

  if (
    (pathname.startsWith('/inventory/shipments/') && pathname !== '/inventory/shipments') ||
    (pathname.startsWith('/app/inventory/shipments/') && pathname !== '/app/inventory/shipments') ||
    (pathname.startsWith('/inventory/issues/') && pathname !== '/inventory/issues')
  ) {
    return {
      title: 'Chi tiết phiếu xuất kho',
      category: 'Nhập / Xuất kho',
      breadcrumbs: [
        { label: 'Soạn hàng & Xuất kho', path: '/inventory/shipments' },
        { label: 'Chi tiết phiếu xuất kho' },
      ],
    };
  }

  if (
    pathname === '/inventory/shipments' ||
    pathname === '/app/inventory/shipments' ||
    pathname === '/inventory/issues'
  ) {
    return {
      title: 'Soạn hàng & Xuất kho',
      category: 'Nhập / Xuất kho',
    };
  }

  // 1. Ưu tiên khớp chính xác theo menu item của người dùng hiện tại trên Navbar
  const sortedUserItems = [...userMenuItems].sort((a, b) => b.path.length - a.path.length);
  const matchedUserItem = sortedUserItems.find(
    (item) => pathname === item.path || pathname.startsWith(item.path + '/')
  );

  if (matchedUserItem) {
    return { title: matchedUserItem.name, category: matchedUserItem.category || 'Hệ thống' };
  }

  // 2. Tra cứu đối chiếu theo toàn bộ danh mục các vai trò trong hệ thống
  for (const items of Object.values(ROLE_NAVIGATION_MATRIX)) {
    const sorted = [...items].sort((a, b) => b.path.length - a.path.length);
    const found = sorted.find(
      (item) => pathname === item.path || pathname.startsWith(item.path + '/')
    );
    if (found) {
      return { title: found.name, category: found.category || 'Hệ thống' };
    }
  }

  // 3. Các trang nghiệp vụ / chức năng bổ trợ ngoài menu chính
  if (pathname.startsWith('/catalog/categories')) {
    return { title: 'Danh mục sản phẩm', category: 'Sản phẩm & Chính sách' };
  }
  if (
    pathname.startsWith('/profile/change-password') ||
    pathname.startsWith('/settings/security')
  ) {
    return { title: 'Đổi mật khẩu tài khoản', category: 'Bảo mật cá nhân' };
  }
  if (pathname === '/profile') {
    return { title: 'Hồ sơ cá nhân', category: 'Tài khoản cá nhân' };
  }
  if (pathname === '/403') {
    return { title: 'Không có quyền truy cập', category: 'Cảnh báo' };
  }
  if (pathname === '/404') {
    return { title: 'Không tìm thấy trang', category: 'Cảnh báo' };
  }

  return { title: 'Hệ thống LOHA SALES', category: 'Vận hành' };
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
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(tokenStorage.getUser()?.avatarUrl);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isCreditCollapsedMobile, setIsCreditCollapsedMobile] = useState<boolean>(false);
  const isPortalOrders = location.pathname.startsWith('/portal');
  const isOrderConfirm = location.pathname === '/portal/orders/confirm' || location.pathname === '/portal/orders/create';

  // Lắng nghe trạng thái thu gọn hạn mức từ Agency Portal trên Mobile
  useEffect(() => {
    const handleCreditState = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (typeof detail?.isCollapsed === 'boolean') {
        setIsCreditCollapsedMobile(detail.isCollapsed);
      }
    };
    window.addEventListener('loha_portal_credit_state', handleCreditState);
    return () => window.removeEventListener('loha_portal_credit_state', handleCreditState);
  }, []);

  const handleExpandCreditMobile = () => {
    window.dispatchEvent(new CustomEvent('loha_portal_expand_credit'));
  };

  // Trạng thái modal xác nhận đăng xuất
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown hồ sơ
  const handleCloseDropdown = () => {
    setIsDropdownOpen(false);
  };

  // Đồng bộ thông tin người dùng realtime
  useEffect(() => {
    const syncUser = () => {
      const u = tokenStorage.getUser() || getStoredUser();
      setCurrentUser(u);
      setAvatarUrl(u?.avatarUrl);
    };

    window.addEventListener('storage', syncUser);
    window.addEventListener('avatar-updated', syncUser);
    window.addEventListener('user-updated', syncUser);
    syncUser();

    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('avatar-updated', syncUser);
      window.removeEventListener('user-updated', syncUser);
    };
  }, []);

  // Đóng dropdown khi chuyển trang
  useEffect(() => {
    handleCloseDropdown();
  }, [location.pathname]);

  // Đóng dropdown khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        handleCloseDropdown();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseDropdown();
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  // Xử lý đăng xuất
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await Promise.all([authService.logout(), new Promise((resolve) => setTimeout(resolve, 800))]);
    } catch {
      tokenStorage.clearAuthData();
    } finally {
      setIsExiting(true);
      setTimeout(() => {
        setIsLoggingOut(false);
        setShowLogoutModal(false);
        setIsExiting(false);
        navigate('/auth/login', { replace: true });
      }, 300);
    }
  };

  const menuItems = getNavigationItems(currentUser?.roles || currentUser?.role);
  const { title, breadcrumbs } = getPageHeaderInfo(location.pathname, menuItems);
  const context = getUserContext(currentUser);
  const cleanFullName =
    (context.fullName || '').replace(/\s*\([^)]*\)/g, '').trim() ||
    context.fullName ||
    'Người dùng';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-xs px-3 sm:px-6 lg:px-8 shadow-2xs">
      {/* =================================================================== */}
      {/* 1. BÊN TRÁI: NÚT ĐÓNG MỞ NAVBAR & TIÊU ĐỀ TRANG                     */}
      {/* =================================================================== */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Nút Hamburger chỉ cho Mobile (<1024px) */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="inline-flex lg:hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none transition-colors cursor-pointer"
          aria-label="Mở menu điều hướng"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Tiêu đề trang hoặc breadcrumb phân cấp */}
        <div className="overflow-hidden min-w-0">
          {breadcrumbs && breadcrumbs.length > 1 ? (
            <nav
              aria-label="Breadcrumb"
              key={location.pathname}
              className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base tracking-tight animate-header-title min-w-0"
            >
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.label}>
                    {idx > 0 && (
                      <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                    )}
                    {isLast ? (
                      <span className="text-slate-900 font-bold truncate">
                        {crumb.label}
                      </span>
                    ) : crumb.path ? (
                      <Link
                        to={crumb.path}
                        className="text-slate-600 hover:text-indigo-600 transition-colors truncate font-semibold"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-slate-600 truncate font-semibold">
                        {crumb.label}
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          ) : (
            <h1
              key={location.pathname}
              className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate animate-header-title"
            >
              {title}
            </h1>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. BÊN PHẢI: CHUÔNG THÔNG BÁO & NÚT HỒ SƠ CÁ NHÂN                   */}
      {/* =================================================================== */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Chuông thông báo hiển thị cho tất cả vai trò trên hệ thống (ẩn trên mobile khi ở trang Xác nhận đơn hàng) */}
        <div className={isOrderConfirm ? 'hidden sm:block' : 'block'}>
          <NotificationBell />
        </div>

        {/* Nút Hạn mức nhanh cho Mobile khi đang ở Cổng đặt hàng và bảng hạn mức đang thu gọn (Không hiển thị khi đang ở Xác nhận đơn hàng) */}
        {isPortalOrders && !isOrderConfirm && isCreditCollapsedMobile && (
          <button
            type="button"
            onClick={handleExpandCreditMobile}
            className="flex sm:hidden items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 text-indigo-700 text-xs font-bold transition-all shadow-2xs animate-in fade-in zoom-in-90 duration-200 active:scale-95 cursor-pointer"
            title="Bấm để mở bảng hạn mức & dư nợ"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="text-[11px] font-bold">Hạn mức</span>
          </button>
        )}

        {/* Khung bảng tên người dùng & Dropdown Profile */}
        <div className="relative shrink-0" ref={dropdownRef}>
        {/* Nút bấm mở Dropdown Profile (Chỉ mở khi click) */}
        <button
          type="button"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className={`flex items-center gap-2 sm:gap-3 p-1.5 sm:px-3 sm:py-2 rounded-lg border transition-all duration-200 cursor-pointer select-none group focus:outline-none ${
            isDropdownOpen
              ? 'bg-slate-50 border-slate-300 shadow-2xs'
              : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300/90'
          }`}
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
          title={`Tài khoản: ${cleanFullName}`}
        >
          {/* Avatar: Ảnh hoặc Chữ cái viết tắt (radius-full) */}
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full overflow-hidden bg-[var(--color-brand-gradient)] text-xs sm:text-sm font-bold text-white shadow-2xs group-hover:scale-105 transition-transform duration-200">
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
              className="text-sm font-bold text-slate-900 group-hover:text-[var(--color-primary)] transition-colors truncate max-w-[150px] leading-tight"
              title={context.fullName}
            >
              {cleanFullName}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold mt-0.5 w-fit max-w-[150px] truncate ${context.badgeClass}`}
              title={context.roleLabel}
            >
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${context.dotClass}`} />
              <span className="truncate">{context.roleLabel}</span>
            </span>
          </div>

          {/* Mũi tên xoay biểu thị đóng/mở */}
          <ChevronDown
            className={`h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0 ${
              isDropdownOpen ? 'rotate-180 text-[var(--color-primary)]' : ''
            }`}
          />
        </button>

        {/* Menu Dropdown xổ xuống (radius-lg: 12px) - Có cầu đệm trước khoảng trống để hover di chuyển mượt mà */}
        {isDropdownOpen && (
          <div
            className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-white shadow-[0_12px_36px_-6px_rgba(0,0,0,0.22),0_4px_16px_rgba(0,0,0,0.08)] border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right space-y-2 before:absolute before:-top-3 before:left-0 before:right-0 before:h-3"
            role="menu"
            aria-orientation="vertical"
          >
            {/* Thẻ người dùng trên cùng */}
            <div className="p-1 rounded-lg bg-white border border-slate-100 shadow-2xs">
              <Link
                to="/profile"
                onClick={handleCloseDropdown}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-50 transition-colors group/user"
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
                  <span className="text-xs text-slate-500 truncate">{context.roleLabel}</span>
                </div>
              </Link>
            </div>

            {/* Danh sách các nút: radius-md */}
            <div className="space-y-0.5 pt-0.5">
              {/* Mục 1: Hồ sơ cá nhân */}
              <Link
                to="/profile"
                onClick={handleCloseDropdown}
                className="flex items-center justify-between p-2 rounded-md hover:bg-slate-100 transition-colors cursor-pointer group"
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
                onClick={handleCloseDropdown}
                className="flex items-center justify-between p-2 rounded-md hover:bg-slate-100 transition-colors cursor-pointer group"
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
                  handleCloseDropdown();
                  setShowLogoutModal(true);
                }}
                className="w-full flex items-center justify-between p-2 rounded-md hover:bg-slate-100 transition-colors cursor-pointer group text-left"
                role="menuitem"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200/80 group-hover:bg-slate-200 text-slate-900 transition-colors">
                    <LogOut className="h-5 w-5" />
                  </div>
                  <span className="text-[15px] font-medium text-slate-900 truncate">Đăng xuất</span>
                </div>
              </button>
            </div>

            {/* Dòng chữ chân trang phong cách Facebook căn giữa */}
            <div className="px-3 pt-3 pb-2 border-t border-slate-100 mt-2 text-center">
              <p className="text-[11px] font-medium text-slate-400">
                LOHA SALES • Hệ thống quản lý bán hàng
              </p>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. MODAL XÁC NHẬN ĐĂNG XUẤT (radius-lg: 12px)                       */}
      {/* =================================================================== */}
      {showLogoutModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={() => !isLoggingOut && setShowLogoutModal(false)}
            className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300 ${
              isExiting ? 'opacity-0' : 'animate-modal-backdrop-in'
            }`}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl border border-slate-100 transition-all duration-300 ${
                isExiting ? 'scale-95 opacity-0' : 'animate-modal-in'
              }`}
            >
              {isLoggingOut ? (
                <div className="py-4 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-md bg-rose-50 text-rose-600 ring-4 ring-rose-100/70 shadow-sm animate-pulse">
                    <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Đang đăng xuất...</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Đang kết thúc phiên và chuyển hướng
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-rose-50 text-rose-600 ring-1 ring-rose-100 shadow-2xs">
                    <Power className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">Đăng xuất tài khoản?</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Bạn có chắc muốn kết thúc phiên làm việc này không?
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowLogoutModal(false)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full rounded-lg bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-semibold text-white shadow-sm shadow-rose-600/20 transition-all cursor-pointer active:scale-98"
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
