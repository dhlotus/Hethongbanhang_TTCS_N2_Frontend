import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Menu, User } from "lucide-react";
import { getStoredUser } from "../utils/navigation";
import { getUserContext } from "../utils/navigation-config";
import { tokenStorage } from "../utils/token-storage";
import { resolveAvatarUrl } from "../utils/avatar";

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
    return { title: "Hồ sơ cá nhân", category: "Đại lý B2B" };
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
    return { title: "Hồ sơ cá nhân", category: "Tài khoản cá nhân" };
  }

  return { title: "Hệ thống LOHA SALES", category: "Vận hành" };
};

/**
 * Header Component:
 * - Hiển thị tên trang với hiệu ứng animation chuyển tab mượt mà
 * - Tinh gọn, không lặp lại thành phần thừa
 * - Nút đóng/mở Navbar tiện lợi trên cả Desktop và Mobile
 * - Góc phải hiển thị Avatar, Họ tên và Tag vai trò nổi bật
 */
export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const location = useLocation();
  const user = getStoredUser();
  const context = getUserContext(user);

  const { title } = getPageHeaderInfo(location.pathname);

  // Đọc avatarUrl từ localStorage và phản ứng khi thay đổi (sau khi upload)
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    tokenStorage.getUser()?.avatarUrl,
  );

  useEffect(() => {
    const syncAvatar = () => {
      setAvatarUrl(tokenStorage.getUser()?.avatarUrl);
    };

    // Lắng nghe cross-tab storage event
    window.addEventListener("storage", syncAvatar);
    // Lắng nghe same-tab custom event (dispatch từ ProfilePage sau khi upload)
    window.addEventListener("avatar-updated", syncAvatar);
    // Đọc lại khi route thay đổi
    syncAvatar();

    return () => {
      window.removeEventListener("storage", syncAvatar);
      window.removeEventListener("avatar-updated", syncAvatar);
    };
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full shrink-0 items-center justify-between border-b border-slate-100 bg-white/95 backdrop-blur-xs px-3 sm:px-6">
      {/* =================================================================== */}
      {/* 1. BÊN TRÁI: NÚT ĐÓNG MỞ NAVBAR & TIÊU ĐỀ TRANG CÓ ANIMATION        */}
      {/* =================================================================== */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* Nút Hamburger chỉ cho Mobile (<1024px) khi sidebar drawer bị ẩn; Desktop hoàn toàn không hiển thị */}
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
      {/* 2. BÊN PHẢI: HỒ SƠ NGƯỜI DÙNG KÈM TAG VAI TRÒ                      */}
      {/* =================================================================== */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <Link
          to="/profile"
          title="Xem hồ sơ cá nhân"
          className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1 rounded-xl hover:bg-slate-100/80 border border-transparent hover:border-slate-200/60 transition-all focus:outline-none group cursor-pointer"
          id="header-avatar-btn"
        >
          {/* Avatar: ảnh hoặc chữ cái */}
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-xs group-hover:ring-2 group-hover:ring-blue-500/30 transition-all">
            {avatarUrl ? (
              <img
                src={resolveAvatarUrl(avatarUrl)}
                alt={`Ảnh đại diện ${context.fullName}`}
                className="h-full w-full object-cover"
              />
            ) : (
              context.avatarLetter || <User className="h-4 w-4" />
            )}
          </div>

          {/* Tên người dùng & Tag vai trò */}
          <div className="hidden sm:flex flex-col items-start text-left min-w-0">
            <span
              className="max-w-[140px] truncate text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight"
              title={context.fullName}
            >
              {context.fullName}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold mt-0.5 truncate max-w-[130px] ${context.badgeClass}`}
            >
              <span className={`h-1 w-1 rounded-full shrink-0 ${context.dotClass}`} />
              <span className="truncate">{context.roleLabel}</span>
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
};

