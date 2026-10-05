import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Menu, User } from "lucide-react";
import { getStoredUser } from "../utils/navigation";
import {
  getUserContext,
  getNavigationItems,
  ROLE_NAVIGATION_MATRIX,
  type MenuItem,
} from "../utils/navigation-config";
import { tokenStorage } from "../utils/token-storage";
import { resolveAvatarUrl } from "../utils/avatar";

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
 * - Tinh gọn, không lặp lại thành phần thừa
 * - Nút đóng/mở Navbar tiện lợi trên cả Desktop và Mobile
 * - Góc phải hiển thị Avatar, Họ tên và Tag vai trò nổi bật
 */
export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(getStoredUser());

  useEffect(() => {
    const syncUser = () => {
      setCurrentUser(tokenStorage.getUser() || getStoredUser());
    };

    window.addEventListener("storage", syncUser);
    syncUser();

    return () => {
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  const context = getUserContext(currentUser);
  const menuItems = getNavigationItems(currentUser?.roles || currentUser?.role);
  const { title } = getPageHeaderInfo(location.pathname, menuItems);

  // Lọc bỏ phần vai trò trong ngoặc khỏi tên hiển thị trên Header (ví dụ: "Nguyễn Văn Admin (Quản Trị Viên)" -> "Nguyễn Văn Admin")
  const cleanFullName =
    (context.fullName || "").replace(/\s*\([^)]*\)/g, "").trim() ||
    context.fullName ||
    "Người dùng";

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
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 mr-1 sm:mr-3 lg:mr-4">
        <Link
          to="/profile"
          title={`Hồ sơ cá nhân: ${context.fullName}`}
          className="flex items-center gap-3 px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-slate-50/70 hover:bg-slate-100/90 border border-slate-200/80 hover:border-blue-200 hover:shadow-xs transition-all duration-200 focus:outline-none group cursor-pointer"
          id="header-avatar-btn"
        >
          {/* Avatar: ảnh hoặc chữ cái - kích thước h-10 w-10 nổi bật */}
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-sm font-bold text-white shadow-xs group-hover:ring-2 group-hover:ring-blue-500/40 group-hover:scale-105 transition-all">
            {avatarUrl ? (
              <img
                src={resolveAvatarUrl(avatarUrl)}
                alt={`Ảnh đại diện ${cleanFullName}`}
                className="h-full w-full object-cover"
              />
            ) : (
              context.avatarLetter || <User className="h-5 w-5" />
            )}
          </div>

          {/* Tên người dùng & Tag vai trò: rõ nét, font-size lớn hơn và dễ đọc */}
          <div className="hidden sm:flex flex-col items-start text-left min-w-0">
            <span
              className="max-w-[170px] sm:max-w-[210px] lg:max-w-[260px] truncate text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight"
              title={context.fullName}
            >
              {cleanFullName}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold mt-0.5 truncate max-w-[170px] sm:max-w-[200px] ${context.badgeClass}`}
              title={context.roleLabel}
            >
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${context.dotClass}`} />
              <span className="truncate">{context.roleLabel}</span>
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
};

