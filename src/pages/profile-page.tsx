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
  Pencil,
  Phone,
  Lock,
  X,
  Save,
  UserCheck,
} from "lucide-react";
import { AvatarUploadModal } from "../components/avatar-upload-modal";
import { usersService } from "../services/users.service";
import { authService } from "../services/auth.service";
import { tokenStorage } from "../utils/token-storage";
import { getStoredUser } from "../utils/navigation";
import { getUserContext } from "../utils/navigation-config";
import { resolveAvatarUrl } from "../utils/avatar";
import { updateProfileSchema, VIETNAM_PHONE_REGEX } from "../utils/validation";
import type { AuthUser } from "../types/auth";
import type { UpdateProfilePayload } from "../types/user";

type ToastType = "success" | "error" | "info";

interface ToastState {
  type: ToastType;
  message: string;
}

/**
 * Trang Hồ sơ cá nhân (Profile Page):
 * - SN-17: Cập nhật thông tin cá nhân (Họ tên, Số điện thoại Việt Nam)
 * - Khóa chặt không cho phép tự sửa tài khoản, vai trò, kho hàng (chỉ Admin mới có quyền)
 * - Thiết kế hiện đại, tinh tế theo phong cách Clean SaaS
 * - Tích hợp đổi ảnh đại diện nhanh qua modal
 * - Hỗ trợ đổi mật khẩu và đăng xuất an toàn
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

  // -------------------------------------------------------------------------
  // SN-17: Quản lý trạng thái Form Chỉnh sửa hồ sơ cá nhân
  // -------------------------------------------------------------------------
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<{ fullName: string; phone: string }>({
    fullName: "",
    phone: "",
  });
  const [formErrors, setFormErrors] = useState<{ fullName?: string; phone?: string }>({});

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
        phone: freshUser.phone ?? currentUser?.phone,
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
  const handleCopy = (text: string, key: string): void => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Mở form chỉnh sửa, điền sẵn thông tin hiện tại
  const handleOpenEdit = (): void => {
    setEditForm({
      fullName: user?.fullName ?? "",
      phone: user?.phone ?? "",
    });
    setFormErrors({});
    setIsEditMode(true);
  };

  // Hủy chỉnh sửa
  const handleCancelEdit = (): void => {
    setIsEditMode(false);
    setFormErrors({});
  };

  // Xử lý thay đổi trường nhập liệu
  const handleInputChange = (field: "fullName" | "phone", value: string): void => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // -------------------------------------------------------------------------
  // SN-17: Submit Form Cập nhật thông tin cá nhân
  // -------------------------------------------------------------------------
  const handleSubmitProfile = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    // Validate bằng Zod Schema
    const validationResult = updateProfileSchema.safeParse(editForm);
    if (!validationResult.success) {
      const errors: { fullName?: string; phone?: string } = {};
      for (const issue of validationResult.error.issues) {
        if (issue.path[0] === "fullName") errors.fullName = issue.message;
        if (issue.path[0] === "phone") errors.phone = issue.message;
      }
      setFormErrors(errors);
      return;
    }

    const trimmedName = validationResult.data.fullName.trim();
    const trimmedPhone = (validationResult.data.phone || "").trim();
    const currentName = (user?.fullName || "").trim();
    const currentPhone = (user?.phone || "").trim();

    // Nếu không có thay đổi nào
    if (trimmedName === currentName && trimmedPhone === currentPhone) {
      setIsEditMode(false);
      setToast({ type: "info", message: "Thông tin hồ sơ không có thay đổi nào." });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: UpdateProfilePayload = {
        fullName: trimmedName,
        phone: trimmedPhone || undefined,
      };

      const updatedUser = await usersService.updateProfile(payload);
      const currentUser = tokenStorage.getUser() || user;
      const mergedUser: AuthUser = {
        ...(currentUser as AuthUser),
        ...updatedUser,
        fullName: updatedUser.fullName || trimmedName,
        phone: updatedUser.phone !== undefined ? updatedUser.phone : trimmedPhone,
      };

      tokenStorage.setUser(mergedUser);
      setUser(mergedUser);

      // Bắn event để Header và các component liên quan đồng bộ tên mới ngay lập tức
      window.dispatchEvent(new CustomEvent("user-updated", { detail: mergedUser }));

      setIsEditMode(false);
      setToast({
        type: "success",
        message: "Cập nhật hồ sơ cá nhân thành công!",
      });
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string | string[] } };
      };
      const rawMessage = axiosErr?.response?.data?.message;
      const errorMsg = Array.isArray(rawMessage)
        ? rawMessage.join(", ")
        : rawMessage || "Cập nhật thất bại, vui lòng kiểm tra lại thông tin.";

      setToast({ type: "error", message: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
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
  const handleLogout = async (): Promise<void> => {
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

  // Kiểm tra tính hợp lệ số điện thoại theo thời gian thực để hiển thị badge
  const isPhoneValid = editForm.phone
    ? VIETNAM_PHONE_REGEX.test(editForm.phone.trim())
    : false;

  return (
    <div className="min-h-full py-4 sm:py-6 lg:py-8 antialiased">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* ================================================================= */}
        {/* THÔNG BÁO TOAST NỔI                                               */}
        {/* ================================================================= */}
        {toast && (
          <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300 max-w-md">
            <div
              className={`flex items-start gap-3 rounded-2xl p-4 shadow-xl border backdrop-blur-md ${
                toast.type === "success"
                  ? "bg-emerald-50/95 border-emerald-200 text-emerald-900"
                  : toast.type === "info"
                  ? "bg-blue-50/95 border-blue-200 text-blue-900"
                  : "bg-rose-50/95 border-rose-200 text-rose-900"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : toast.type === "info" ? (
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-semibold leading-relaxed">
                  {toast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg transition-colors cursor-pointer"
                title="Đóng thông báo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 1. KHỐI HERO: COVER, AVATAR, ĐỔI MẬT KHẨU & ĐĂNG XUẤT              */}
        {/* ================================================================= */}
        <div className="overflow-hidden rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all">
          {/* Cover gradient nghệ thuật */}
          <div className="h-32 sm:h-40 bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-500 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent opacity-60" />
            <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-white border border-white/30 shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>LOHA SALES • Vận hành chuẩn hóa</span>
            </div>
          </div>

          <div className="px-5 sm:px-8 pb-6 sm:pb-8 pt-0">
            {/* Hàng ngang Avatar & Nút bấm thao tác chính */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-14 sm:-mt-16 gap-4">
              {/* Cụm Avatar và Nút đổi ảnh */}
              <div className="relative group">
                <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-3xl ring-4 ring-white shadow-xl overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-3xl font-extrabold text-white">
                  {user?.avatarUrl ? (
                    <img
                      src={resolveAvatarUrl(user.avatarUrl)}
                      alt={context.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    context.avatarLetter
                  )}
                </div>

                <button
                  type="button"
                  id="profile-change-avatar-btn"
                  onClick={() => setShowUploadModal(true)}
                  className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900/85 hover:bg-slate-950 text-white shadow-md border-2 border-white transition-all cursor-pointer group-hover:scale-105"
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
                {user?.phone && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="font-medium text-blue-600 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {user.phone}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Thanh thông số nhanh (Summary Highlights Bar) */}
            <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Highlight 1: Tên đăng nhập */}
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
        {/* 2. KHỐI CẬP NHẬT HỒ SƠ & LIÊN HỆ CÁ NHÂN (SN-17)                   */}
        {/* ================================================================= */}
        <div
          className={`rounded-3xl bg-white border transition-all shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-6 sm:p-7 ${
            isEditMode
              ? "border-blue-300 ring-4 ring-blue-500/10"
              : "border-slate-200/80"
          }`}
        >
          {/* Header của Khối */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="flex items-start sm:items-center gap-3.5">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-2xs ${
                  isEditMode
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-blue-50 text-blue-600 border-blue-100"
                }`}
              >
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Hồ sơ & Thông tin liên lạc
                  </h2>
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                    SN-17
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thông tin liên lạc chuẩn xác giúp bộ phận Kho vận gọi điện xác nhận đơn hàng và điều phối hàng hóa
                </p>
              </div>
            </div>

            {/* Nút bật/tắt chế độ sửa */}
            <div className="shrink-0 self-end sm:self-auto">
              {!isEditMode ? (
                <button
                  type="button"
                  id="profile-edit-btn"
                  onClick={handleOpenEdit}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs sm:text-sm font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
                >
                  <Pencil className="h-4 w-4" />
                  <span>Chỉnh sửa thông tin</span>
                </button>
              ) : (
                <button
                  type="button"
                  id="profile-cancel-edit-btn"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  <span>Hủy bỏ</span>
                </button>
              )}
            </div>
          </div>

          {/* NỘI DUNG CHẾ ĐỘ XEM (VIEW MODE) */}
          {!isEditMode ? (
            <div className="mt-6 space-y-6">
              {/* Lưới các thông tin liên lạc & định danh */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Họ và tên đầy đủ (Có thể sửa) */}
                <div className="p-4 rounded-2xl border border-blue-100/80 bg-blue-50/20 relative overflow-hidden group">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Họ và tên đầy đủ
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      <Check className="h-3 w-3" />
                      Cho phép sửa
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-sm sm:text-base font-bold text-slate-900">
                      {user?.fullName || "Chưa cập nhật họ tên"}
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenEdit}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-800 p-1"
                      title="Chỉnh sửa họ tên"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Tên chính thức hiển thị trên phiếu kho và chứng từ
                  </p>
                </div>

                {/* 2. Số điện thoại liên lạc (Có thể sửa) */}
                <div className="p-4 rounded-2xl border border-blue-100/80 bg-blue-50/20 relative overflow-hidden group">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Số điện thoại liên lạc
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      <Check className="h-3 w-3" />
                      Cho phép sửa
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p
                      className={`text-sm sm:text-base font-bold ${
                        user?.phone ? "text-slate-900" : "text-amber-600 font-medium"
                      }`}
                    >
                      {user?.phone ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-4 w-4 text-blue-600" />
                          {user.phone}
                        </span>
                      ) : (
                        "Chưa cập nhật số điện thoại"
                      )}
                    </p>
                    {user?.phone && (
                      <button
                        type="button"
                        onClick={() => handleCopy(user.phone || "", "phone")}
                        className="text-slate-400 hover:text-slate-600 p-1 transition-colors"
                        title="Sao chép số điện thoại"
                      >
                        {copiedKey === "phone" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Định dạng Việt Nam • Dùng để kho liên hệ khi giao vận đơn
                  </p>
                </div>

                {/* 3. Tên đăng nhập (Cố định - Không thể sửa) */}
                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Tên đăng nhập
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      <Lock className="h-3 w-3 text-slate-400" />
                      Cố định
                    </span>
                  </div>
                  <p className="mt-2 text-sm sm:text-base font-bold text-slate-700">
                    @{user?.username || "—"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Định danh hệ thống duy nhất, không thể thay đổi
                  </p>
                </div>

                {/* 4. Địa chỉ Email (Cố định - Không thể sửa) */}
                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Địa chỉ Email
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      <Lock className="h-3 w-3 text-slate-400" />
                      Cố định
                    </span>
                  </div>
                  <p className="mt-2 text-sm sm:text-base font-bold text-slate-700 truncate">
                    {user?.email || "—"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Email tài khoản, liên hệ Quản trị viên nếu cần đổi
                  </p>
                </div>

                {/* 5. Vai trò hệ thống (Cố định - Không thể sửa) */}
                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Vai trò hệ thống
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      <Lock className="h-3 w-3 text-slate-400" />
                      Phân quyền
                    </span>
                  </div>
                  <p className="mt-2 text-sm sm:text-base font-bold text-slate-700">
                    {context.roleLabel}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Quyền hạn RBAC được cấp phát bởi Quản trị viên
                  </p>
                </div>

                {/* 6. Kho / Địa bàn trực thuộc (Cố định - Không thể sửa) */}
                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Kho / Địa bàn công tác
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      <Lock className="h-3 w-3 text-slate-400" />
                      Chỉ định
                    </span>
                  </div>
                  <p className="mt-2 text-sm sm:text-base font-bold text-slate-700 truncate">
                    {context.locationText}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Khu vực nghiệp vụ được chỉ định bởi ban quản lý
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* NỘI DUNG CHẾ ĐỘ CHỈNH SỬA (EDIT FORM) */
            <form onSubmit={handleSubmitProfile} className="mt-6 space-y-6">
              {/* Lưu ý nghiệp vụ SN-17 */}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50/90 border border-blue-200/80 text-xs sm:text-sm text-blue-900">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">
                    Quy chuẩn an toàn thông tin nhân sự (SN-17):
                  </p>
                  <p className="text-blue-800 text-xs leading-relaxed">
                    Bạn được quyền cập nhật <strong>Họ và tên</strong> và <strong>Số điện thoại liên lạc</strong>.
                    Để đảm bảo tính toàn vẹn hệ thống và phân quyền bảo mật, tên tài khoản, vai trò và kho hàng là các thông tin cố định do Quản trị viên quản lý.
                  </p>
                </div>
              </div>

              {/* Lưới nhập liệu 2 trường cho phép sửa */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Nhập Họ và tên */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="profile-fullname-input"
                      className="text-xs sm:text-sm font-bold text-slate-800"
                    >
                      Họ và tên <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {editForm.fullName.length}/100 ký tự
                    </span>
                  </div>

                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      id="profile-fullname-input"
                      type="text"
                      maxLength={100}
                      value={editForm.fullName}
                      onChange={(e) => handleInputChange("fullName", e.target.value)}
                      placeholder="Nhập họ và tên đầy đủ..."
                      disabled={isSubmitting}
                      className={`w-full rounded-xl border bg-white pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                        formErrors.fullName
                          ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/20"
                          : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      }`}
                    />
                  </div>

                  {formErrors.fullName ? (
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 mt-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{formErrors.fullName}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Họ và tên người dùng hiển thị trên toàn hệ thống
                    </p>
                  )}
                </div>

                {/* 2. Nhập Số điện thoại Việt Nam */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="profile-phone-input"
                      className="text-xs sm:text-sm font-bold text-slate-800"
                    >
                      Số điện thoại liên lạc
                    </label>
                    {editForm.phone && (
                      <span
                        className={`text-[11px] font-semibold flex items-center gap-1 ${
                          isPhoneValid ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {isPhoneValid ? (
                          <>
                            <Check className="h-3 w-3" />
                            Định dạng hợp lệ
                          </>
                        ) : (
                          "Đang kiểm tra định dạng"
                        )}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      id="profile-phone-input"
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="Ví dụ: 0912345678 hoặc +84912345678"
                      disabled={isSubmitting}
                      className={`w-full rounded-xl border bg-white pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                        formErrors.phone
                          ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/20"
                          : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      }`}
                    />
                  </div>

                  {formErrors.phone ? (
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 mt-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{formErrors.phone}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Định dạng chuẩn Việt Nam: di động 10 số (03x, 05x, 07x, 08x, 09x) hoặc số bàn 11 số (02x)
                    </p>
                  )}
                </div>
              </div>

              {/* Lưới 4 trường cố định ở chế độ Disabled kèm nhãn Bảo mật */}
              <div className="pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                  Các thông tin không được tự thay đổi (Được bảo vệ)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Tên đăng nhập */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 opacity-80">
                    <span className="text-[10px] font-semibold text-slate-400 block">Tên đăng nhập</span>
                    <span className="text-xs font-bold text-slate-700 truncate block mt-0.5">
                      @{user?.username}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                      <Lock className="h-3 w-3" /> Cố định
                    </span>
                  </div>

                  {/* Email */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 opacity-80">
                    <span className="text-[10px] font-semibold text-slate-400 block">Email</span>
                    <span className="text-xs font-bold text-slate-700 truncate block mt-0.5">
                      {user?.email}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                      <Lock className="h-3 w-3" /> Cố định
                    </span>
                  </div>

                  {/* Vai trò */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 opacity-80">
                    <span className="text-[10px] font-semibold text-slate-400 block">Vai trò</span>
                    <span className="text-xs font-bold text-slate-700 truncate block mt-0.5">
                      {context.roleLabel}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                      <Lock className="h-3 w-3" /> Phân quyền
                    </span>
                  </div>

                  {/* Kho trực thuộc */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 opacity-80">
                    <span className="text-[10px] font-semibold text-slate-400 block">Kho / Địa bàn</span>
                    <span className="text-xs font-bold text-slate-700 truncate block mt-0.5">
                      {context.locationText}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                      <Lock className="h-3 w-3" /> Chỉ định
                    </span>
                  </div>
                </div>
              </div>

              {/* Thanh nút bấm submit/cancel */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Hủy thao tác
                </button>

                <button
                  type="submit"
                  id="profile-save-btn"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang lưu hồ sơ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Lưu thay đổi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
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
                  Phân quyền & Định danh nhân sự
                </h2>
                <p className="text-xs text-slate-400">
                  Chi tiết thẩm quyền và phạm vi hoạt động trong chuỗi cung ứng
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Mã vai trò hệ thống</span>
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    {user?.role || (user?.roles && user.roles[0]) || "USER"}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {context.description}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 divide-y divide-slate-100 text-xs">
                <div className="flex items-center justify-between p-3.5">
                  <span className="text-xs font-medium text-slate-500">Mã định danh (ID)</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-800">
                      {user?.id ? `${user.id.slice(0, 8)}...${user.id.slice(-6)}` : "—"}
                    </span>
                    {user?.id && (
                      <button
                        type="button"
                        onClick={() => handleCopy(user.id, "userId")}
                        className="text-slate-400 hover:text-slate-600 p-1 transition-colors"
                        title="Sao chép ID người dùng"
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
                onClick={() => void handleLogout()}
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
