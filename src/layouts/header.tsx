import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  Menu,
  Bell,
  LogOut,
  ChevronRight,
  MapPin,
  KeyRound,
  User,
} from "lucide-react";
import { getStoredUser } from "../utils/navigation";
import { getUserContext } from "../utils/navigation-config";
import { authService } from "../services/auth.service";
import { tokenStorage } from "../utils/token-storage";

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

/**
 * Lấy tiêu đề trang và phân nhóm tương ứng dựa theo URL hiện tại
 */
const getPageHeaderInfo = (
  pathname: string
): { title: string; category: string } => {
  // Đại lý B2B
  if (pathname.startsWith("/portal/orders")) {
    return { title: "Cổng đặt hàng", category: "Đại lý B2B" };
  }
  if (pathname.startsWith("/portal/tracking")) {
    return { title: "Theo dõi đơn hàng & Giao hàng", category: "Đại lý B2B" };
  }
  if (pathname.startsWith("/portal/debt")) {
    return { title: "Sổ công nợ của tôi", category: "Đại lý B2B" };
  }
  if (pathname.startsWith("/portal/profile")) {
    return { title: "Thông tin hồ sơ & Điểm giao hàng", category: "Đại lý B2B" };
  }

  // Kinh doanh
  if (pathname.startsWith("/sales/approvals")) {
    return { title: "Phê duyệt Đơn hàng", category: "Kinh doanh" };
  }
  if (pathname.startsWith("/sales/customers")) {
    return { title: "Quản lý Đại lý & Hạn mức", category: "Khách hàng" };
  }
  if (pathname.startsWith("/sales/orders")) {
    return { title: "Quản lý Đơn hàng", category: "Kinh doanh" };
  }
  if (pathname.startsWith("/reports/sales")) {
    return { title: "Báo cáo Doanh số", category: "Báo cáo" };
  }

  // Kho vận
  if (pathname.startsWith("/inventory/stock")) {
    return { title: "Sổ tồn kho & Lô hàng", category: "Kho vận" };
  }
  if (pathname.startsWith("/inventory/receipts")) {
    return { title: "Nhập kho hàng hóa", category: "Kho vận" };
  }
  if (pathname.startsWith("/inventory/issues")) {
    return { title: "Soạn hàng & Xuất kho", category: "Kho vận" };
  }
  if (pathname.startsWith("/inventory/transfers")) {
    return { title: "Chuyển kho nội bộ", category: "Kho vận" };
  }
  if (pathname.startsWith("/inventory/audits")) {
    return { title: "Kiểm kê kho hàng", category: "Kho vận" };
  }
  if (pathname.startsWith("/inventory/adjustments")) {
    return { title: "Phiếu điều chỉnh tồn", category: "Kho vận" };
  }
  if (pathname.startsWith("/inventory/batches")) {
    return { title: "Quản lý Lô & Hạn sử dụng (FEFO)", category: "Kho vận" };
  }
  if (pathname.startsWith("/reports/inventory")) {
    return { title: "Báo cáo kho hàng", category: "Báo cáo" };
  }

  // Kế toán
  if (pathname.startsWith("/accounting/invoices")) {
    return { title: "Quản lý Hóa đơn bán hàng", category: "Kế toán" };
  }
  if (pathname.startsWith("/accounting/payments")) {
    return { title: "Phiếu thu & Đối trừ công nợ", category: "Kế toán" };
  }
  if (pathname.startsWith("/accounting/debt")) {
    return { title: "Sổ chi tiết công nợ & Tuổi nợ", category: "Kế toán" };
  }
  if (pathname.startsWith("/accounting/returns")) {
    return { title: "Xử lý Phiếu trả hàng", category: "Kế toán" };
  }

  // Quản trị & Chung
  if (pathname.startsWith("/system/users")) {
    return { title: "Quản lý người dùng", category: "Hệ thống" };
  }
  if (pathname.startsWith("/system/audit-logs")) {
    return { title: "Nhật ký hệ thống", category: "Bảo mật & Giám sát" };
  }
  if (pathname.startsWith("/catalog/products")) {
    return { title: "Danh mục sản phẩm", category: "Hàng hóa" };
  }
  if (pathname.startsWith("/catalog/pricing")) {
    return { title: "Bảng giá & Chiết khấu", category: "Chính sách Bán hàng" };
  }
  if (pathname.startsWith("/dashboard")) {
    return { title: "Dashboard Điều hành", category: "Tổng quan" };
  }
  if (pathname.startsWith("/profile/change-password") || pathname.startsWith("/settings/security")) {
    return { title: "Đổi mật khẩu tài khoản", category: "Bảo mật cá nhân" };
  }
  if (pathname === "/profile") {
    return { title: "Hồ sơ & Ảnh đại diện", category: "Tài khoản cá nhân" };
  }

  return { title: "Hệ thống LOHA SALES", category: "Vận hành" };
};

/**
 * Header Component (Context Bar chuẩn theo SN-11):
 * - Hiển thị Tên người dùng, Vai trò (Badge tiếng Việt), Kho / Địa bàn làm việc
 * - Nút mở Mobile Menu Drawer (Tối ưu cho 360px Mobile)
 * - Nút Đăng xuất an toàn & Thông báo
 */
export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getStoredUser();
  const context = getUserContext(user);

  const { title, category } = getPageHeaderInfo(location.pathname);

  // Đọc avatarUrl từ localStorage và phản ứng khi thay đổi (sau khi upload)
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    tokenStorage.getUser()?.avatarUrl,
  );

  useEffect(() => {
    const handleStorage = () => {
      setAvatarUrl(tokenStorage.getUser()?.avatarUrl);
    };
    window.addEventListener('storage', handleStorage);
    // Kiểm tra lại khi route thay đổi (upload xong rồi navigate)
    handleStorage();
    return () => window.removeEventListener('storage', handleStorage);
  }, [location.pathname]);

  const handleLogout = async () => {
    await authService.logout();
    navigate("/auth/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full shrink-0 items-center justify-between border-b border-slate-100 bg-white/95 backdrop-blur-xs px-3 sm:px-6">
      {/* =================================================================== */}
      {/* 1. BÊN TRÁI: NÚT HAMBURGER & TIÊU ĐỀ TRANG                          */}
      {/* =================================================================== */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* Nút Hamburger cho Mobile (hiển thị trên màn hình < 1024px) */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden focus:outline-none transition-colors"
          aria-label="Mở menu điều hướng"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Tiêu đề trang & Phân nhóm Breadcrumb */}
        <div className="flex items-center min-w-0">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 truncate">
            <span className="hidden sm:inline">{category}</span>
            <ChevronRight className="hidden sm:inline h-3.5 w-3.5 text-slate-300" />
            <span className="font-bold text-slate-900 truncate">{title}</span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. BÊN PHẢI: CONTEXT BAR (VAI TRÒ + KHO/ĐỊA BÀN + PROFILE + LOGOUT) */}
      {/* =================================================================== */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Context: Kho hoặc Địa bàn đang làm việc (Ẩn trên màn hình rất nhỏ) */}
        <div className="hidden md:flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-2.5 py-1 text-xs text-slate-600 shadow-2xs">
          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="max-w-[170px] truncate font-medium" title={context.locationText}>
            {context.locationText}
          </span>
        </div>

        {/* Context: Badge Vai trò tiếng Việt thân thiện */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${context.badgeClass}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${context.dotClass}`} />
          <span className="hidden sm:inline">{context.roleLabel}</span>
          <span className="sm:hidden">{context.shortRoleLabel}</span>
        </span>

        {/* Chuông Thông báo */}
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors focus:outline-none"
          title="Thông báo hệ thống"
          aria-label="Thông báo hệ thống"
        >
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-2 right-2 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
          </span>
        </button>

        {/* Đường phân cách mảnh */}
        <div className="h-6 w-px bg-slate-200/80" />

        {/* Thông tin Người dùng & Hồ sơ cá nhân */}
        <div className="flex items-center gap-2">
          {/* Avatar: ảnh hoặc chữ cái */}
          <Link
            to="/profile"
            title="Hồ sơ cá nhân & Ảnh đại diện"
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-xs hover:ring-2 hover:ring-blue-500/30 transition-all"
            aria-label="Hồ sơ cá nhân"
            id="header-avatar-btn"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`Ảnh đại diện ${context.fullName}`}
                className="h-full w-full object-cover"
              />
            ) : (
              context.avatarLetter || <User className="h-4 w-4" />
            )}
          </Link>

          {/* Tên người dùng (Ẩn trên mobile) */}
          <div className="hidden xl:flex flex-col text-left">
            <span
              className="max-w-[140px] truncate text-xs font-bold text-slate-800 leading-tight"
              title={context.fullName}
            >
              {context.fullName}
            </span>
            <span className="text-[10px] font-medium text-slate-400 leading-tight">
              {context.shortRoleLabel}
            </span>
          </div>

          {/* Nút Đổi mật khẩu thu gọn */}
          <Link
            to="/profile/change-password"
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none"
            title="Đổi mật khẩu tài khoản"
            aria-label="Đổi mật khẩu"
          >
            <KeyRound className="h-4 w-4" />
          </Link>

          {/* Nút Đăng xuất */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors focus:outline-none"
            title="Đăng xuất khỏi hệ thống"
            aria-label="Đăng xuất"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
