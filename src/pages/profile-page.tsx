import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Camera,
  CheckCircle,
  AlertCircle,
  Loader2,
  KeyRound,
  LogOut,
  PencilLine,
  Check,
  Lock,
  User,
  Eye,
  EyeOff,
  Mail,
  Building2,
} from "lucide-react";
import { AvatarUploadModal } from "../components/avatar-upload-modal";
import { usersService, type UpdateMyProfilePayload } from "../services/users.service";
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

const VIETNAM_PHONE_PATTERN = /^(?:0|\+84)(?:[35789]\d{8}|2\d{9})$/;

/**
 * Trang Hồ sơ cá nhân (Profile Page - SN-17):
 * - Tag vai trò đặt ngay dưới họ tên, bỏ dòng mô tả phụ
 * - Đổi tiêu đề thành "Thông tin cá nhân", bỏ dòng mô tả phụ
 * - Tối giản danh mục thông tin: Họ tên, Số điện thoại, Email, Kho phụ trách
 * - Bỏ chữ "Cố định", bỏ dấu sao, bỏ tên đăng nhập và vai trò lặp lại
 * - Chỉnh sửa thông tin trực tiếp (inline edit), yêu cầu nhập mật khẩu để lưu
 * - Thiết kế chuẩn Clean SaaS, thẩm mỹ cao và tối ưu trải nghiệm người dùng
 */
export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(getStoredUser());
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState<boolean>(false);

  // Trạng thái chỉnh sửa trực tiếp (Inline Editing)
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editFullName, setEditFullName] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [nameError, setNameError] = useState<string>("");
  const [phoneError, setPhoneError] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const context = getUserContext(user);

  // Lọc bỏ phần vai trò trong ngoặc khỏi tên hiển thị (ví dụ: "Nguyễn Văn Admin (Quản Trị Viên)" -> "Nguyễn Văn Admin")
  const cleanFullName =
    (context.fullName || "").replace(/\s*\([^)]*\)/g, "").trim() ||
    context.fullName ||
    "Người dùng";

  // Cập nhật giá trị form khi user thay đổi
  useEffect(() => {
    if (user) {
      setEditFullName(user.fullName || cleanFullName);
      setEditPhone(user.phone || "");
    }
  }, [user, cleanFullName]);

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

  // Bắt đầu chỉnh sửa
  const handleStartEdit = () => {
    setEditFullName(user?.fullName || cleanFullName);
    setEditPhone(user?.phone || "");
    setConfirmPassword("");
    setShowPassword(false);
    setNameError("");
    setPhoneError("");
    setPasswordError("");
    setIsEditing(true);
  };

  // Hủy chỉnh sửa
  const handleCancelEdit = () => {
    setEditFullName(user?.fullName || cleanFullName);
    setEditPhone(user?.phone || "");
    setConfirmPassword("");
    setShowPassword(false);
    setNameError("");
    setPhoneError("");
    setPasswordError("");
    setIsEditing(false);
  };

  // Lưu chỉnh sửa thông tin cá nhân inline (kèm xác thực mật khẩu)
  const handleSaveInline = async () => {
    const normalizedName = editFullName.trim();
    const normalizedPhone = editPhone.trim();
    const normalizedPassword = confirmPassword.trim();

    let hasError = false;

    if (!normalizedName) {
      setNameError("Vui lòng nhập họ và tên.");
      hasError = true;
    } else if (normalizedName.length > 100) {
      setNameError("Họ và tên không được vượt quá 100 ký tự.");
      hasError = true;
    } else {
      setNameError("");
    }

    if (normalizedPhone && !VIETNAM_PHONE_PATTERN.test(normalizedPhone)) {
      setPhoneError("Nhập số điện thoại Việt Nam hợp lệ (ví dụ: 0912345678 hoặc +84912345678).");
      hasError = true;
    } else {
      setPhoneError("");
    }

    if (!normalizedPassword) {
      setPasswordError("Vui lòng nhập mật khẩu tài khoản để lưu thay đổi.");
      hasError = true;
    } else {
      setPasswordError("");
    }

    if (hasError) return;

    setIsSaving(true);
    try {
      // 1. Xác thực mật khẩu trước khi lưu thay đổi
      try {
        await authService.login({
          email: user?.email || user?.username || "",
          password: normalizedPassword,
        });
      } catch (authErr: unknown) {
        const errorMsg =
          axios.isAxiosError<{ message?: string }>(authErr) && authErr.response?.data?.message
            ? authErr.response.data.message
            : "Mật khẩu xác nhận không chính xác. Vui lòng kiểm tra lại.";
        setPasswordError(errorMsg);
        setIsSaving(false);
        return;
      }

      // 2. Lưu thông tin hồ sơ
      const payload: UpdateMyProfilePayload = {
        fullName: normalizedName,
        phone: normalizedPhone,
      };

      const currentUser = tokenStorage.getUser() || user;
      if (!currentUser) {
        throw new Error("Không tìm thấy thông tin người dùng. Vui lòng tải lại trang.");
      }

      const token = tokenStorage.getAccessToken();
      let updatedUser: Partial<AuthUser> = { ...payload };

      if (!token?.startsWith("demo-jwt-")) {
        try {
          updatedUser = await usersService.updateMyProfile(payload);
        } catch (err: unknown) {
          // Dự phòng nếu endpoint /users/me chưa được hỗ trợ trên môi trường backend hiện thời
          if (currentUser.id) {
            const res = await usersService.updateUser(currentUser.id, payload);
            updatedUser = { ...res, avatarUrl: res.avatarUrl || undefined };
          } else {
            throw err;
          }
        }
      }

      const mergedUser: AuthUser = { ...currentUser, ...updatedUser, ...payload };
      tokenStorage.setUser(mergedUser);
      setUser(mergedUser);
      window.dispatchEvent(new CustomEvent("user-updated", { detail: mergedUser }));

      setIsEditing(false);
      setConfirmPassword("");
      setToast({ type: "success", message: "Thông tin cá nhân đã được cập nhật thành công!" });
    } catch (error: unknown) {
      const responseMessage = axios.isAxiosError<{ message?: string | string[] }>(error)
        ? error.response?.data?.message
        : undefined;
      const message = Array.isArray(responseMessage)
        ? responseMessage.join(", ")
        : responseMessage || (error instanceof Error ? error.message : "");
      setToast({
        type: "error",
        message: message || "Không thể cập nhật hồ sơ. Vui lòng thử lại.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Đăng xuất an toàn khỏi hệ thống với hiệu ứng chuyển đổi mượt mà
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await Promise.all([
        authService.logout(),
        new Promise((resolve) => setTimeout(resolve, 850)),
      ]);
    } catch {
      // Đăng xuất client-side ngay cả khi rớt mạng
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

  return (
    <div className="min-h-full py-6 sm:py-8 lg:py-10 antialiased">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* =============================================================== */}
        {/* 1. TOAST THÔNG BÁO NỔI                                          */}
        {/* =============================================================== */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`fixed top-20 right-4 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl transition-all duration-300 animate-in fade-in slide-from-top-3 ${
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
        {/* 2. CARD HỒ SƠ CÁ NHÂN (TINH GỌN, HIỆN ĐẠI & RESPONSIVE)         */}
        {/* =============================================================== */}
        <div className="rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 sm:p-8 space-y-6">
          {/* Phần Avatar & Tên & Tag vai trò đặt ngay bên dưới tên */}
          <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 text-center sm:text-left pb-6 border-b border-slate-100">
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

            {/* Tên người dùng & Tag vai trò ngay dưới tên */}
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
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${context.badgeClass}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${context.dotClass}`} />
                  {context.roleLabel}
                </span>
              </div>
            </div>
          </div>

          {/* ============================================================= */}
          {/* 3. KHỐI THÔNG TIN CÁ NHÂN & CHỈNH SỬA TRỰC TIẾP (INLINE)       */}
          {/* ============================================================= */}
          <div className="space-y-4">
            {/* Header thông tin cá nhân kèm nút chỉnh sửa (bỏ mô tả phụ) */}
            <div className="flex items-center justify-between gap-3 pb-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/10 shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">Thông tin cá nhân</h2>
              </div>

              {/* Nút thao tác: Chỉnh sửa vs Lưu/Hủy */}
              {!isEditing ? (
                <button
                  type="button"
                  id="profile-edit-inline-btn"
                  onClick={handleStartEdit}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-700 shadow-2xs transition-all cursor-pointer shrink-0 active:scale-[0.98]"
                >
                  <PencilLine className="w-3.5 h-3.5 text-slate-500" />
                  <span>Chỉnh sửa</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    id="profile-save-inline-btn"
                    onClick={handleSaveInline}
                    disabled={isSaving || !confirmPassword.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Lưu thay đổi</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Bố cục lưới thông tin tinh gọn (Họ tên, SĐT, Email, Kho) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              {/* 1. Họ và tên (Cho phép sửa, không có dấu sao) */}
              <div
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  isEditing
                    ? "bg-blue-50/20 border-blue-200/90 shadow-2xs ring-1 ring-blue-500/10"
                    : "bg-slate-50/50 border-slate-200/70"
                }`}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600">Họ và tên</label>
                  {isEditing && (
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      Cho phép sửa
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => {
                        setEditFullName(e.target.value);
                        if (nameError) setNameError("");
                      }}
                      maxLength={100}
                      placeholder="Nhập họ và tên của bạn..."
                      className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border bg-white text-slate-900 focus:outline-none transition-all ${
                        nameError
                          ? "border-rose-400 ring-2 ring-rose-100"
                          : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      }`}
                    />
                    {nameError && (
                      <p className="mt-1 text-[11px] font-medium text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {nameError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-xs font-bold text-slate-900 py-1">
                    {cleanFullName}
                  </div>
                )}
              </div>

              {/* 2. Số điện thoại (Cho phép sửa & Kiểm tra định dạng SĐT Việt Nam) */}
              <div
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  isEditing
                    ? "bg-blue-50/20 border-blue-200/90 shadow-2xs ring-1 ring-blue-500/10"
                    : "bg-slate-50/50 border-slate-200/70"
                }`}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600">
                    Số điện thoại liên hệ
                  </label>
                  {isEditing && (
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      Cho phép sửa
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <div>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => {
                        setEditPhone(e.target.value);
                        if (phoneError) setPhoneError("");
                      }}
                      placeholder="Ví dụ: 0912345678"
                      className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border bg-white text-slate-900 focus:outline-none transition-all ${
                        phoneError
                          ? "border-rose-400 ring-2 ring-rose-100"
                          : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      }`}
                    />
                    {phoneError ? (
                      <p className="mt-1 text-[11px] font-medium text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {phoneError}
                      </p>
                    ) : (
                      <p className="mt-1 text-[10px] text-slate-400">
                        Định dạng 10 chữ số bắt đầu bằng 0 hoặc +84
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-xs font-bold text-slate-900 py-1">
                    {user?.phone ? (
                      <span className="font-mono">{user.phone}</span>
                    ) : (
                      <span className="text-slate-400 font-normal italic">
                        Chưa cập nhật số điện thoại
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Địa chỉ Email (Không cho sửa lúc chỉnh sửa) */}
              <div
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  isEditing
                    ? "bg-slate-100/70 border-slate-200/50 cursor-not-allowed select-none opacity-80"
                    : "bg-slate-50/50 border-slate-200/70"
                }`}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    Địa chỉ Email
                  </span>
                  {isEditing && (
                    <span className="text-[10px] font-medium text-slate-400">
                      Không thể sửa
                    </span>
                  )}
                </div>
                <div className="text-xs font-medium text-slate-800 py-1 truncate">
                  {user?.email || "—"}
                </div>
              </div>

              {/* 4. Khu vực / Kho phụ trách (Không cho sửa lúc chỉnh sửa) */}
              <div
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  isEditing
                    ? "bg-slate-100/70 border-slate-200/50 cursor-not-allowed select-none opacity-80"
                    : "bg-slate-50/50 border-slate-200/70"
                }`}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    Khu vực / Kho phụ trách
                  </span>
                  {isEditing && (
                    <span className="text-[10px] font-medium text-slate-400">
                      Không thể sửa
                    </span>
                  )}
                </div>
                <div className="text-xs font-semibold text-slate-800 py-1">
                  {user?.assignedWarehouse || context.locationText || "Toàn hệ thống"}
                </div>
              </div>

              {/* 5. Ô nhập Mật khẩu xác nhận khi chỉnh sửa */}
              {isEditing && (
                <div className="md:col-span-2 p-3.5 sm:p-4 rounded-2xl border border-amber-200/80 bg-amber-50/40 space-y-1.5 transition-all animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Nhập mật khẩu để lưu thay đổi</span>
                    </label>
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                      Bắt buộc
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (passwordError) setPasswordError("");
                      }}
                      placeholder="Nhập mật khẩu tài khoản của bạn để xác nhận..."
                      className={`w-full pl-3.5 pr-10 py-2.5 text-xs font-semibold rounded-xl border bg-white text-slate-900 focus:outline-none transition-all ${
                        passwordError
                          ? "border-rose-400 ring-2 ring-rose-100"
                          : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                      title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="mt-1 text-[11px] font-medium text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {passwordError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Phần bên dưới: Đổi mật khẩu */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h3 className="text-sm font-bold text-slate-800">Mật khẩu đăng nhập</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cập nhật mật khẩu định kỳ để nâng cao bảo mật cho tài khoản của bạn
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
        {/* 4. KHU VỰC ĐĂNG XUẤT: CHỈ HIỂN THỊ NÚT ĐĂNG XUẤT KHỎI HỆ THỐNG    */}
        {/* =============================================================== */}
        <div className="flex justify-center pt-1">
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
      {/* 5. MODAL XÁC NHẬN ĐĂNG XUẤT (TINH GỌN + HIỆU ỨNG CHUYỂN CẢNH)     */}
      {/* ================================================================= */}
      {showLogoutModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onClick={() => !isLoggingOut && setShowLogoutModal(false)}
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300 ${
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
                /* Hiệu ứng chuyển đổi khi xác nhận đăng xuất */
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
                  <div className="flex items-center gap-1.5 pt-1">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              ) : (
                /* Popup ngắn gọn tinh gọn */
                <div className="text-center space-y-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 shadow-2xs">
                    <LogOut className="h-5 w-5" />
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
          document.body,
        )}

      {/* ================================================================= */}
      {/* 6. MODAL TẢI LÊN ẢNH ĐẠI DIỆN                                     */}
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
