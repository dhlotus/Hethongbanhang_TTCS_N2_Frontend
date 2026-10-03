import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Camera,
  CheckCircle,
  AlertCircle,
  Loader2,
  KeyRound,
  LogOut,
} from "lucide-react";
import { AvatarUploadModal } from "../components/avatar-upload-modal";
import { usersService } from "../services/users.service";
import { authService } from "../services/auth.service";
import { tokenStorage } from "../utils/token-storage";
import { getStoredUser } from "../utils/navigation";
import { getUserContext } from "../utils/navigation-config";
import { resolveAvatarUrl } from "../utils/avatar";
import type { AuthUser } from "../types/auth";

type ToastType = "success" | "error";

interface ToastState {
  type: ToastType;
  message: string;
}

/**
 * Trang Hồ sơ cá nhân (Profile Page):
 * - Thiết kế tối giản, hiện đại, tinh gọn theo yêu cầu
 * - Bỏ thông tin chức danh trùng lặp trong tên (đã có tag vai trò trên header)
 * - Bỏ huy hiệu "Đang hoạt động"
 * - Nút "Đổi mật khẩu" được bố trí ở phần bên dưới
 * - Bỏ lưới thông số thừa (tên đăng nhập, email, khu vực, mã ID)
 * - Bỏ khối "Bảo mật tài khoản & Xác thực phiên"
 * - Chỗ đăng xuất tinh gọn thành nút "Đăng xuất khỏi hệ thống", không card bọc và mô tả
 * - Bảo toàn 100% chức năng (đổi avatar, đổi mật khẩu, xác nhận đăng xuất)
 */
export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(getStoredUser());
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState<boolean>(false);

  const context = getUserContext(user);

  // Lọc bỏ phần vai trò trong ngoặc khỏi tên hiển thị (ví dụ: "Nguyễn Văn Admin (Quản Trị Viên)" -> "Nguyễn Văn Admin")
  const cleanFullName =
    (context.fullName || "").replace(/\s*\([^)]*\)/g, "").trim() ||
    context.fullName ||
    "Người dùng";

  // Tự động ẩn toast sau 3.5 giây
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Đồng bộ thông tin profile mới nhất từ backend khi vào trang
  const fetchProfile = useCallback(async () => {
    const token = tokenStorage.getAccessToken();
    if (!token || token.startsWith("demo-jwt-")) return;

    setIsFetchingProfile(true);
    try {
      const freshUser = await usersService.getMe();
      const currentUser = tokenStorage.getUser();
      const mergedUser: AuthUser = {
        ...(currentUser || {}),
        ...freshUser,
      };
      tokenStorage.setUser(mergedUser);
      setUser(mergedUser);
    } catch {
      // Giữ nguyên dữ liệu local nếu mạng chập chờn
    } finally {
      setIsFetchingProfile(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  // Đổi ảnh đại diện
  const handleAvatarConfirm = async (croppedFile: File): Promise<void> => {
    const token = tokenStorage.getAccessToken();

    if (token?.startsWith("demo-jwt-")) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const demoUrl = URL.createObjectURL(croppedFile);
      const updatedUser: AuthUser = { ...(user as AuthUser), avatarUrl: demoUrl };
      tokenStorage.setUser(updatedUser);
      setUser(updatedUser);
      setShowUploadModal(false);
      setToast({ type: "success", message: "Ảnh đại diện đã được cập nhật thành công!" });
      window.dispatchEvent(new CustomEvent("avatar-updated", { detail: demoUrl }));
      return;
    }

    try {
      const response = await usersService.uploadAvatar(croppedFile);
      const newAvatarUrl = response.data?.avatarUrl;

      const currentUser = tokenStorage.getUser() || user;
      if (currentUser) {
        const mergedUser: AuthUser = {
          ...currentUser,
          avatarUrl: newAvatarUrl,
        };
        tokenStorage.setUser(mergedUser);
        setUser(mergedUser);
        window.dispatchEvent(new CustomEvent("avatar-updated", { detail: newAvatarUrl }));
      }

      setShowUploadModal(false);
      setToast({ type: "success", message: "Ảnh đại diện đã được cập nhật thành công!" });
    } catch {
      setToast({ type: "error", message: "Tải ảnh lên không thành công, vui lòng thử lại." });
    }
  };

  // Đăng xuất an toàn khỏi hệ thống
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authService.logout();
    } catch {
      // Đăng xuất client-side ngay cả khi rớt mạng
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
      navigate("/auth/login", { replace: true });
    }
  };

  return (
    <div className="min-h-full py-6 sm:py-8 lg:py-10 antialiased">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* =============================================================== */}
        {/* 1. TOAST THÔNG BÁO NỔI                                          */}
        {/* =============================================================== */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`fixed top-20 right-4 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${
              toast.type === "success"
                ? "bg-emerald-600 text-white shadow-emerald-600/20"
                : "bg-rose-600 text-white shadow-rose-600/20"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* =============================================================== */}
        {/* 2. CARD HỒ SƠ CÁ NHÂN (TINH GỌN, HIỆN ĐẠI)                      */}
        {/* =============================================================== */}
        <div className="rounded-3xl bg-white border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] p-6 sm:p-8 space-y-6">
          {/* Phần Avatar & Tên & Email/Username */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 text-center sm:text-left">
            {/* Avatar tương tác: hover hiển thị overlay mờ icon camera */}
            <button
              type="button"
              id="avatar-camera-btn"
              onClick={() => setShowUploadModal(true)}
              className="relative group/avatar shrink-0 rounded-2xl sm:rounded-3xl overflow-hidden focus:outline-none focus:ring-4 focus:ring-blue-500/20 cursor-pointer shadow-md hover:shadow-lg transition-all"
              title="Nhấp để thay đổi ảnh đại diện"
              aria-label="Thay đổi ảnh đại diện"
            >
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-slate-100 to-slate-200 overflow-hidden ring-1 ring-slate-200/80">
                {user?.avatarUrl ? (
                  <img
                    src={resolveAvatarUrl(user.avatarUrl)}
                    alt={`Ảnh đại diện của ${cleanFullName}`}
                    className="h-full w-full object-cover group-hover/avatar:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-blue-600 to-indigo-600">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white select-none">
                      {context.avatarLetter}
                    </span>
                  </div>
                )}
              </div>

              {/* Lớp overlay bán trong suốt hiện icon camera khi hover */}
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1 text-white">
                <Camera className="h-6 w-6 text-white drop-shadow-sm" />
                <span className="text-[10px] font-semibold tracking-wide text-white drop-shadow-sm">
                  Đổi ảnh
                </span>
              </div>
            </button>

            {/* Tên người dùng & Tài khoản liên hệ */}
            <div className="space-y-1.5 min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {isFetchingProfile ? (
                  <span className="inline-flex items-center gap-2 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Đang đồng bộ hồ sơ...
                  </span>
                ) : (
                  cleanFullName
                )}
              </h1>

              <p className="text-xs sm:text-sm text-slate-500 font-medium truncate">
                @{user?.username || "admin"} • {user?.email || "—"}
              </p>
            </div>
          </div>

          {/* Phần bên dưới: Đổi mật khẩu */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h2 className="text-sm font-bold text-slate-800">Mật khẩu đăng nhập</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Bạn có thể cập nhật mật khẩu mới bất kỳ lúc nào để bảo vệ tài khoản
              </p>
            </div>

            <Link
              to="/profile/change-password"
              id="profile-change-password-link"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-colors shrink-0"
            >
              <KeyRound className="h-4 w-4 text-blue-600" />
              <span>Đổi mật khẩu</span>
            </Link>
          </div>
        </div>

        {/* =============================================================== */}
        {/* 3. KHU VỰC ĐĂNG XUẤT: CHỈ HIỂN THỊ NÚT ĐĂNG XUẤT KHỎI HỆ THỐNG    */}
        {/* =============================================================== */}
        <div className="flex justify-center pt-2">
          <button
            type="button"
            id="profile-logout-btn"
            onClick={() => setShowLogoutModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 text-xs sm:text-sm font-semibold py-3 px-6 transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs active:scale-98"
          >
            <LogOut className="h-4 w-4 text-rose-600" />
            <span>Đăng xuất khỏi hệ thống</span>
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 4. MODAL XÁC NHẬN ĐĂNG XUẤT                                       */}
      {/* ================================================================= */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl ring-1 ring-slate-900/10 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                <LogOut className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Xác nhận đăng xuất
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kết thúc phiên làm việc an toàn
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn đăng xuất khỏi tài khoản{" "}
              <span className="font-bold text-slate-900">{cleanFullName}</span>?
              Mọi dữ liệu làm việc đã lưu sẽ được giữ an toàn trên máy chủ.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-70"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang đăng xuất...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4" />
                    <span>Xác nhận đăng xuất</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 5. MODAL TẢI LÊN ẢNH ĐẠI DIỆN                                     */}
      {/* ================================================================= */}
      {showUploadModal && (
        <AvatarUploadModal
          currentAvatarUrl={user?.avatarUrl}
          onConfirm={handleAvatarConfirm}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </div>
  );
};

