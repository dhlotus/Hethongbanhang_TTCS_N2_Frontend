import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  Search,
  Bell,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { getStoredUser } from "../utils/navigation";
import { authService } from "../services/auth.service";

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

/**
 * Lấy tiêu đề trang và phân nhóm tương ứng dựa theo URL hiện tại
 */
const getPageHeaderInfo = (
  pathname: string
): { title: string; category: string } => {
  if (pathname.startsWith("/system/users")) {
    return { title: "Quản lý người dùng", category: "Hệ thống" };
  }
  if (pathname.startsWith("/system/audit-logs")) {
    return { title: "Nhật ký hệ thống", category: "Bảo mật & Giám sát" };
  }
  if (pathname.startsWith("/catalog/products")) {
    return { title: "Danh mục sản phẩm", category: "Hàng hóa & Kho" };
  }
  if (pathname.startsWith("/catalog/pricing")) {
    return { title: "Bảng giá & Chiết khấu", category: "Chính sách Bán hàng" };
  }
  if (pathname.startsWith("/dashboard")) {
    return { title: "Tổng quan hệ thống", category: "Báo cáo Vận hành" };
  }
  return { title: "Trang Quản trị", category: "Hệ thống" };
};

/**
 * Header Component cho AdminLayout:
 * - Tiêu đề trang động & Breadcrumb
 * - Thanh tìm kiếm nhanh tối giản
 * - Chuông thông báo
 * - Thông tin Admin hiện tại & nút Đăng xuất nhanh
 */
export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getStoredUser();

  const { title, category } = getPageHeaderInfo(location.pathname);

  // Lấy chữ cái đầu đại diện cho avatar
  const avatarLetter = user?.fullName
    ? user.fullName.trim().charAt(0).toUpperCase()
    : "A";

  const handleLogout = async () => {
    await authService.logout();
    navigate("/auth/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 sm:px-6">
      {/* =================================================================== */}
      {/* 1. Bên Trái: Nút Mobile Menu & Tiêu đề Trang Động                   */}
      {/* =================================================================== */}
      <div className="flex items-center gap-3">
        {/* Nút Hamburger cho Mobile */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden focus:outline-none"
          aria-label="Mở menu điều hướng"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Tiêu đề trang & Breadcrumb gọn gàng, không lặp lại */}
        <div className="flex items-center">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500">
            <span>{category}</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            <span className="font-bold text-slate-900">{title}</span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. Bên Phải: Tìm kiếm nhanh, Thông báo & Thông tin Admin             */}
      {/* =================================================================== */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Thanh tìm kiếm nhanh tối giản */}
        <div className="hidden md:flex relative items-center">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Tìm nhanh người dùng, tác vụ..."
            className="h-9 w-60 lg:w-72 rounded-xl border border-slate-200/80 bg-slate-50 pl-9 pr-14 text-xs text-slate-800 placeholder-slate-400 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15"
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
            <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-400 shadow-2xs">
              Ctrl K
            </kbd>
          </div>
        </div>

        {/* Biểu tượng thông báo (Notification Bell) */}
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors focus:outline-none"
          title="Thông báo hệ thống"
          aria-label="Thông báo hệ thống"
        >
          <Bell className="h-4.5 w-4.5" />
          {/* Badge chấm đỏ thông báo mới */}
          <span className="absolute top-2 right-2 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
          </span>
        </button>

        {/* Đường kẻ chia cách mảnh */}
        <div className="h-6 w-px bg-slate-200/80" />

        {/* Thông tin Admin & Nút Đăng xuất thu gọn */}
        <div className="flex items-center gap-2.5 pl-1">
          {/* Avatar chữ cái */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-xs">
            {avatarLetter}
          </div>

          {/* Tên & Vai trò */}
          <div className="hidden xl:flex flex-col text-left">
            <span className="max-w-[130px] truncate text-xs font-bold text-slate-800 leading-tight">
              {user?.fullName || "Nguyễn Văn Admin"}
            </span>
            <span className="text-[11px] font-medium text-slate-400 leading-tight">
              Quản trị viên
            </span>
          </div>

          {/* Nút Đăng xuất nhanh thu gọn */}
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
