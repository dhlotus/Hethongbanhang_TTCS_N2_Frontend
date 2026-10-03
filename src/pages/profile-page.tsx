import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  MapPin,
  Camera,
  CheckCircle,
  AlertCircle,
  Loader2,
  KeyRound,
  LogOut,
  Copy,
  Check,
  User,
  Shield,
  Sparkles,
  Info,
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
 * - Thiết kế hiện đại, tinh tế theo phong cách Social Media chuyên nghiệp (UI_GUIDELINES.md)
 * - Đã loại bỏ hoàn toàn các trường dữ liệu trùng lặp (không lặp lại họ tên, email, vai trò nhiều lần)
 * - Tích hợp đầy đủ chức năng Đổi mật khẩu và Đăng xuất an toàn ngay trong trang
 * - Hỗ trợ đổi ảnh đại diện nhanh qua modal
 */
export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(getStoredUser());
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const context = getUserContext(user);

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

  // Sao chép thông tin nhanh vào clipboard
  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

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
    <div className="min-h-full py-4 sm:py-6 lg:py-8 antialiased">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* ================================================================= */}
        {/* 1. TOAST THÔNG BÁO NỔI                                            */}
        {/* ================================================================= */}
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

        {/* ================================================================= */}
        {/* 2. CARD CHÍNH: HERO PROFILE BANNER & THÔNG TIN ĐỊNH DANH          */}
        {/* ================================================================= */}
        <div className="rounded-3xl bg-white border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] overflow-hidden">
          {/* Cover Banner gradient hiện đại */}
          <div className="h-32 sm:h-44 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-medium text-white shadow-xs">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>Hệ thống LOHA SALES</span>
              </span>
            </div>
          </div>

          {/* Phần Avatar và Thông tin chính (Xếp ngang tinh tế, không lặp lại) */}
          <div className="px-5 sm:px-8 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 text-center sm:text-left">
              {/* Avatar với nút camera cập nhật nhanh */}
              <div className="relative shrink-0">
                <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-3xl ring-4 ring-white shadow-xl bg-gradient-to-tr from-slate-100 to-slate-200 overflow-hidden">
                  {user?.avatarUrl ? (
                    <img
                      src={resolveAvatarUrl(user.avatarUrl)}
                      alt={`Ảnh đại diện của ${context.fullName}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-blue-600 to-indigo-600">
                      <span className="text-3xl sm:text-4xl font-extrabold text-white select-none">
                        {context.avatarLetter}
                      </span>
                    </div>
                  )}
                </div>

                {/* Nút Camera để cập nhật ảnh */}
                <button
                  type="button"
                  id="avatar-camera-btn"
                  onClick={() => setShowUploadModal(true)}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md ring-2 ring-white hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="Thay đổi ảnh đại diện"
                  aria-label="Thay đổi ảnh đại diện"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              {/* Nhóm nút hành động nhanh: Đổi mật khẩu & Đăng xuất */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-center sm:justify-end pt-2 sm:pt-0">
                <Link
                  to="/profile/change-password"
                  id="profile-change-password-link"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  <KeyRound className="h-4 w-4 text-blue-600" />
                  <span>Đổi mật khẩu</span>
                </Link>

                <button
                  type="button"
                  id="profile-logout-btn"
                  onClick={() => setShowLogoutModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/70 px-3.5 py-2 text-xs sm:text-sm font-semibold text-rose-700 shadow-2xs hover:bg-rose-100 hover:border-rose-300 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4 text-rose-600" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>

            {/* Tên & Tag người dùng */}
            <div className="mt-4 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {isFetchingProfile ? (
                    <span className="inline-flex items-center gap-2 text-slate-400">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Đang đồng bộ hồ sơ...
                    </span>
                  ) : (
                    context.fullName
                  )}
                </h1>

                {/* Badge vai trò tiếng Việt */}
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-semibold ${context.badgeClass}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${context.dotClass}`} />
                    {context.roleLabel}
                  </span>

                  {/* Trạng thái hoạt động */}
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Đang hoạt động
                  </span>
                </div>
              </div>

              {/* Username định danh & Email */}
              <div className="mt-1 flex items-center justify-center sm:justify-start gap-3 text-xs sm:text-sm text-slate-500 flex-wrap">
                <span className="font-medium text-slate-600">
                  @{user?.username || "user"}
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-normal text-slate-500">{user?.email || "—"}</span>
              </div>
            </div>

            {/* Thanh thông số nhanh (Summary Highlights Bar) */}
            <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Highlight 1: Email liên hệ */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100/70 text-blue-600">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-medium text-slate-400 block leading-tight">
                    Tên đăng nhập
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {user?.username || "—"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(user?.username || "", "username")}
                      className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                      title="Sao chép tên đăng nhập"
                    >
                      {copiedKey === "username" ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Highlight 2: Địa bàn / Kho trực thuộc */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100/70 text-amber-600">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-medium text-slate-400 block leading-tight">
                    Địa bàn / Kho trực thuộc
                  </span>
                  <span
                    className="text-xs font-bold text-slate-800 truncate block mt-0.5"
                    title={context.locationText}
                  >
                    {context.locationText}
                  </span>
                </div>
              </div>

              {/* Highlight 3: Tiêu chuẩn bảo mật phân quyền */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100/70 text-emerald-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-medium text-slate-400 block leading-tight">
                    Cơ chế bảo mật
                  </span>
                  <span className="text-xs font-bold text-slate-800 truncate block mt-0.5">
                    RBAC v2 • JWT Session
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. BỐ CỤC 2 CỘT: CHI TIẾT QUYỀN HẠN & TRUNG TÂM BẢO MẬT           */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* CỘT TRÁI (3/5): THÔNG TIN PHÂN QUYỀN & NGHIỆP VỤ */}
          <div className="lg:col-span-3 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Phân quyền & Phạm vi nghiệp vụ
                </h2>
                <p className="text-xs text-slate-400">
                  Quyền truy cập các tính năng trong hệ thống theo vai trò được cấp
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              {/* Vai trò */}
              <div className="rounded-2xl bg-slate-50/70 p-4 border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Vai trò chuyên trách</span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[11px] font-semibold ${context.badgeClass}`}
                  >
                    {context.shortRoleLabel}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-800">{context.roleLabel}</p>
                <p className="text-xs text-slate-500 leading-relaxed pt-1">
                  {context.description}
                </p>
              </div>

              {/* Thông tin kết nối tài khoản */}
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
                <div className="flex items-center justify-between p-3.5">
                  <span className="text-xs font-medium text-slate-500">Địa chỉ Email</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-800">{user?.email || "—"}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(user?.email || "", "email")}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                      title="Sao chép email"
                    >
                      {copiedKey === "email" ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5">
                  <span className="text-xs font-medium text-slate-500">Mã người dùng (ID)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-slate-600">
                      {user?.id ? user.id.slice(0, 12) + "…" : "—"}
                    </span>
                    {user?.id && (
                      <button
                        type="button"
                        onClick={() => handleCopy(user.id, "userId")}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                        title="Sao chép ID"
                      >
                        {copiedKey === "userId" ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5">
                  <span className="text-xs font-medium text-slate-500">Khu vực làm việc</span>
                  <span className="text-xs font-semibold text-slate-800">{context.locationText}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (2/5): TRUNG TÂM BẢO MẬT & ĐĂNG XUẤT */}
          <div className="lg:col-span-2 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-2xs">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Bảo mật & Phiên làm việc
                </h2>
                <p className="text-xs text-slate-400">
                  Quản lý mật khẩu và quyền đăng xuất
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Thẻ Đổi mật khẩu */}
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shrink-0">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">Đổi mật khẩu tài khoản</h3>
                    <p className="text-[11px] text-slate-400">Cập nhật mật khẩu để bảo vệ an toàn</p>
                  </div>
                </div>

                <Link
                  to="/profile/change-password"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold py-2.5 px-4 shadow-xs hover:shadow transition-all"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>Tiến hành đổi mật khẩu</span>
                </Link>
              </div>

              {/* Thẻ Đăng xuất */}
              <div className="p-4 rounded-2xl border border-rose-100 bg-rose-50/40 hover:bg-rose-50/70 transition-colors space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-600 shrink-0">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">Đăng xuất tài khoản</h3>
                    <p className="text-[11px] text-slate-400">Đóng phiên làm việc trên trình duyệt</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs sm:text-sm font-semibold py-2.5 px-4 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4 text-rose-600" />
                  <span>Đăng xuất khỏi hệ thống</span>
                </button>
              </div>

              {/* Gợi ý an toàn */}
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500">
                <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Hệ thống tự động gia hạn token phiên làm việc ngầm khi thao tác liên tục. Đăng xuất an toàn khi dùng máy tính công cộng.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4. MODAL XÁC NHẬN ĐĂNG XUẤT                                         */}
      {/* =================================================================== */}
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
              <span className="font-bold text-slate-900">{context.fullName}</span>?
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

      {/* =================================================================== */}
      {/* 5. MODAL TẢI LÊN ẢNH ĐẠI DIỆN                                       */}
      {/* =================================================================== */}
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
