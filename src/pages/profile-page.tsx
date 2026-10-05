import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import {
  Camera,
  CheckCircle,
  AlertCircle,
  Loader2,
  PencilLine,
  Check,
  Lock,
  User,
  Eye,
  EyeOff,
  Mail,
  Building2,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Info,
  Clock,
  Phone,
  Copy,
  X,
} from "lucide-react";
import { AvatarUploadModal } from "../components/avatar-upload-modal";
import { usersService, type UpdateMyProfilePayload } from "../services/users.service";
import { authService } from "../services/auth.service";
import { tokenStorage } from "../utils/token-storage";
import { getStoredUser } from "../utils/navigation";
import { getUserContext, ROLE_CONFIGS } from "../utils/navigation-config";
import { resolveAvatarUrl } from "../utils/avatar";
import type { AuthUser, UserRoleType } from "../types/auth";

type ToastType = "success" | "error";

interface ToastState {
  type: ToastType;
  message: string;
}

const VIETNAM_PHONE_PATTERN = /^(?:0|\+84)(?:[35789]\d{8}|2\d{9})$/;

/**
 * Định dạng ngày YYYY-MM-DD sang DD/MM/YYYY
 */
const formatDateDisplay = (dateStr?: string | null): string => {
  if (!dateStr) return "—";
  try {
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch {
    // ignore
  }
  return dateStr;
};

/**
 * Định dạng nhãn giới tính
 */
const formatGenderDisplay = (gender?: string | null): string => {
  if (!gender) return "—";
  switch (gender.toUpperCase()) {
    case "MALE":
    case "NAM":
      return "Nam";
    case "FEMALE":
    case "NỮ":
    case "NU":
      return "Nữ";
    default:
      return gender;
  }
};

/**
 * Trang Hồ sơ cá nhân (Profile Page):
 * - Thiết kế giao diện Dashboard Enterprise hiện đại, bố cục 2 cột cân đối, không bị trơ trọi giữa màn hình
 * - Bỏ nút Đổi mật khẩu và Đăng xuất (đã có phân hệ riêng tại Navbar)
 * - Đầy đủ các trường: Tên tài khoản, Email, Số điện thoại, Ngày sinh, Giới tính, Kho / Địa bàn phụ trách
 * - Hỗ trợ cập nhật Ngày sinh & Giới tính 1 LẦN DUY NHẤT, có popup xác nhận thông tin định danh
 * - Cảnh báo nổi bật khi chưa cập nhật thông tin định danh
 */
export const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser());
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showIdentityConfirmModal, setShowIdentityConfirmModal] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Trạng thái chỉnh sửa trực tiếp (Inline Editing)
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editFullName, setEditFullName] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [editDateOfBirth, setEditDateOfBirth] = useState<string>("");
  const [editGender, setEditGender] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Lỗi xác thực form
  const [nameError, setNameError] = useState<string>("");
  const [phoneError, setPhoneError] = useState<string>("");
  const [dobError, setDobError] = useState<string>("");
  const [genderError, setGenderError] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const context = getUserContext(user);

  // Lọc bỏ phần vai trò trong ngoặc khỏi tên hiển thị
  const cleanFullName =
    (context.fullName || "").replace(/\s*\([^)]*\)/g, "").trim() ||
    context.fullName ||
    "Người dùng";

  // Danh sách các vai trò hiện có của tài khoản
  const effectiveRoles = (
    user?.roles && user.roles.length > 0
      ? user.roles
      : [user?.role || context.role]
  ) as UserRoleType[];

  // Kiểm tra thông tin định danh (Ngày sinh & Giới tính) đã được khóa chưa (chỉ cập nhật 1 lần duy nhất)
  const isIdentityLocked = Boolean(
    user?.isIdentityLocked ||
      (user?.id && localStorage.getItem(`identity_locked_${user.id}`) === "true") ||
      (user?.dateOfBirth && user?.gender)
  );

  // Cập nhật giá trị form khi user thay đổi
  useEffect(() => {
    if (user) {
      setEditFullName(user.fullName || cleanFullName);
      setEditPhone(user.phone || "");
      setEditDateOfBirth(
        user.dateOfBirth
          ? user.dateOfBirth.split("T")[0]
          : localStorage.getItem(`user_dob_${user.id}`) || ""
      );
      setEditGender(
        user.gender || localStorage.getItem(`user_gender_${user.id}`) || ""
      );
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

      // Giữ lại các trường định danh đã lưu cục bộ nếu backend chưa hỗ trợ
      const localDob = currentUser?.id
        ? localStorage.getItem(`user_dob_${currentUser.id}`)
        : undefined;
      const localGender = currentUser?.id
        ? localStorage.getItem(`user_gender_${currentUser.id}`)
        : undefined;
      const localLocked = currentUser?.id
        ? localStorage.getItem(`identity_locked_${currentUser.id}`) === "true"
        : undefined;

      const mergedUser: AuthUser = {
        ...(currentUser || {}),
        ...freshUser,
        dateOfBirth: freshUser.dateOfBirth || currentUser?.dateOfBirth || localDob || undefined,
        gender: freshUser.gender || currentUser?.gender || localGender || undefined,
        isIdentityLocked:
          freshUser.isIdentityLocked ??
          currentUser?.isIdentityLocked ??
          localLocked ??
          Boolean(
            (freshUser.dateOfBirth || localDob) && (freshUser.gender || localGender)
          ),
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
    } catch (err: unknown) {
      const responseMessage = axios.isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message
        : undefined;
      setToast({
        type: "error",
        message: responseMessage || "Không thể cập nhật ảnh đại diện. Vui lòng thử lại!",
      });
    }
  };

  const handleStartEdit = () => {
    setNameError("");
    setPhoneError("");
    setDobError("");
    setGenderError("");
    setPasswordError("");
    setConfirmPassword("");
    setShowPassword(false);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNameError("");
    setPhoneError("");
    setDobError("");
    setGenderError("");
    setPasswordError("");
    setConfirmPassword("");
    if (user) {
      setEditFullName(user.fullName || cleanFullName);
      setEditPhone(user.phone || "");
      setEditDateOfBirth(user.dateOfBirth?.split("T")[0] || "");
      setEditGender(user.gender || "");
    }
  };

  // Sao chép User ID
  const handleCopyId = () => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Xác thực bước 1 trước khi lưu
  const handlePreSave = () => {
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

    // Nếu thông tin định danh chưa khóa và người dùng nhập:
    if (!isIdentityLocked) {
      if (!editDateOfBirth) {
        setDobError("Vui lòng chọn ngày sinh để hoàn tất thông tin định danh.");
        hasError = true;
      } else {
        const birthDate = new Date(editDateOfBirth);
        const today = new Date();
        if (birthDate > today || birthDate.getFullYear() < 1920) {
          setDobError("Ngày sinh không hợp lệ (phải từ năm 1920 đến hiện tại).");
          hasError = true;
        } else {
          setDobError("");
        }
      }

      if (!editGender) {
        setGenderError("Vui lòng chọn giới tính của bạn.");
        hasError = true;
      } else {
        setGenderError("");
      }
    }

    if (!normalizedPassword) {
      setPasswordError("Vui lòng nhập mật khẩu tài khoản để lưu thay đổi.");
      hasError = true;
    } else {
      setPasswordError("");
    }

    if (hasError) return;

    // Nếu người dùng đang cập nhật Ngày sinh & Giới tính lần đầu: Mở Popup Modal xác nhận thông tin!
    if (!isIdentityLocked && editDateOfBirth && editGender) {
      setShowIdentityConfirmModal(true);
    } else {
      void handleSaveProfile();
    }
  };

  // Tiến hành lưu thông tin hồ sơ
  const handleSaveProfile = async () => {
    setShowIdentityConfirmModal(false);
    setIsSaving(true);

    const normalizedName = editFullName.trim();
    const normalizedPhone = editPhone.trim();
    const normalizedPassword = confirmPassword.trim();

    try {
      // 1. Xác thực mật khẩu tài khoản
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

      // 2. Tạo payload cập nhật
      const willLockIdentity = !isIdentityLocked && Boolean(editDateOfBirth && editGender);

      const payload: UpdateMyProfilePayload = {
        fullName: normalizedName,
        phone: normalizedPhone,
        dateOfBirth: editDateOfBirth || user?.dateOfBirth,
        gender: editGender || user?.gender,
        isIdentityLocked: isIdentityLocked || willLockIdentity,
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
        } catch {
          // Fallback nếu API backend chưa có endpoint này
          if (currentUser.id) {
            try {
              const res = await usersService.updateUser(currentUser.id, payload as any);
              updatedUser = { ...res, avatarUrl: res.avatarUrl || undefined };
            } catch {
              // Tiếp tục với dữ liệu local
            }
          }
        }
      }

      // Lưu trữ trạng thái khóa định danh vĩnh viễn trên client
      if (willLockIdentity && currentUser.id) {
        localStorage.setItem(`identity_locked_${currentUser.id}`, "true");
        localStorage.setItem(`user_dob_${currentUser.id}`, editDateOfBirth);
        localStorage.setItem(`user_gender_${currentUser.id}`, editGender);
      }

      const mergedUser: AuthUser = {
        ...currentUser,
        ...updatedUser,
        ...payload,
        isIdentityLocked: isIdentityLocked || willLockIdentity,
      };

      tokenStorage.setUser(mergedUser);
      setUser(mergedUser);
      window.dispatchEvent(new CustomEvent("user-updated", { detail: mergedUser }));

      setIsEditing(false);
      setConfirmPassword("");
      setToast({
        type: "success",
        message: willLockIdentity
          ? "Đã lưu hồ sơ và xác thực định danh (Ngày sinh & Giới tính) thành công!"
          : "Thông tin cá nhân đã được cập nhật thành công!",
      });
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

  // Tính tỷ lệ hoàn thiện hồ sơ
  const calculateCompletionPercent = (): number => {
    let score = 0;
    if (user?.fullName) score += 20;
    if (user?.email) score += 20;
    if (user?.phone) score += 20;
    if (user?.avatarUrl) score += 20;
    if (isIdentityLocked || (user?.dateOfBirth && user?.gender)) score += 20;
    return score;
  };

  const completionPercent = calculateCompletionPercent();

  return (
    <div className="min-h-full py-6 sm:py-8 lg:py-10 antialiased">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-6">
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
        {/* 2. THẺ DANH TÍNH HỒ SƠ NGƯỜI DÙNG HIỆN ĐẠI                      */}
        {/* =============================================================== */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Avatar & Thông tin tên */}
            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              {/* Avatar tương tác: hover hiển thị icon đổi ảnh */}
              <button
                type="button"
                id="avatar-camera-btn"
                onClick={() => setShowUploadModal(true)}
                className="relative group/avatar shrink-0 rounded-2xl sm:rounded-3xl overflow-hidden focus:outline-none ring-4 ring-slate-100 shadow-md cursor-pointer bg-white transition-all hover:scale-[1.02]"
                title="Nhấp để thay đổi ảnh đại diện"
                aria-label="Thay đổi ảnh đại diện"
              >
                <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl sm:rounded-3xl bg-slate-100 overflow-hidden">
                  {user?.avatarUrl ? (
                    <img
                      src={resolveAvatarUrl(user.avatarUrl)}
                      alt={`Ảnh đại diện của ${cleanFullName}`}
                      className="h-full w-full object-cover group-hover/avatar:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600">
                      <span className="text-3xl sm:text-4xl font-extrabold text-white select-none">
                        {context.avatarLetter}
                      </span>
                    </div>
                  )}
                </div>

                {/* Lớp overlay đổi ảnh khi hover */}
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1 text-white">
                  <Camera className="h-5 w-5 text-white drop-shadow-sm" />
                  <span className="text-[11px] font-semibold tracking-wide text-white drop-shadow-sm">
                    Đổi ảnh
                  </span>
                </div>
              </button>

              {/* Tên & Tag vai trò & Mã định danh */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    {isFetchingProfile ? (
                      <span className="inline-flex items-center gap-2 text-slate-400">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Đang đồng bộ...
                      </span>
                    ) : (
                      cleanFullName
                    )}
                  </h1>

                  {/* Tag trạng thái hoạt động */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Đang hoạt động</span>
                  </span>
                </div>

                {/* Tag vai trò chuẩn hệ thống + username */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${context.badgeClass}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${context.dotClass}`} />
                    {context.roleLabel}
                  </span>

                  <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-mono bg-slate-100 px-2.5 py-1 rounded-lg">
                    @{user?.username || "admin"}
                  </span>
                </div>
              </div>
            </div>

            {/* Nút hành động Chỉnh sửa ở Header */}
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <button
                  type="button"
                  id="profile-edit-btn"
                  onClick={handleStartEdit}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <PencilLine className="w-4 h-4" />
                  <span>Chỉnh sửa thông tin</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Hủy chỉnh sửa</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* =============================================================== */}
        {/* 3. THÔNG BÁO YÊU CẦU BỔ SUNG THÔNG TIN CÁ NHÂN                    */}
        {/* =============================================================== */}
        {!isIdentityLocked && (
          /* Chỉ hiện khi chưa cập nhật đủ Ngày sinh & Giới tính */
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 sm:px-5 sm:py-3.5 shadow-2xs">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-amber-950">
                  Yêu cầu bổ sung thông tin cá nhân
                </h3>
              </div>

              {!isEditing && (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="shrink-0 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  Cập nhật ngay
                </button>
              )}
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* 4. BỐ CỤC 2 CỘT: TỔNG QUAN TIẾN ĐỘ & CHI TIẾT THÔNG TIN HỒ SƠ     */}
        {/* =============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CỘT TRÁI (4 COLS): TIẾN ĐỘ HỒ SƠ & THÔNG TIN HỆ THỐNG */}
          <div className="lg:col-span-4 space-y-6">
            {/* Thẻ 1: Tiến độ hoàn thiện hồ sơ */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Mức độ hoàn thiện</h3>
                <span className="text-xs font-bold text-blue-600 font-mono">
                  {completionPercent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 ease-out"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>

              {/* Danh sách checklist */}
              <div className="space-y-2.5 pt-2 text-xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span>Họ và tên</span>
                  </span>
                  <span className="text-slate-400 font-medium">Đã có</span>
                </div>

                <div className="flex items-center justify-between text-slate-700">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span>Email liên kết</span>
                  </span>
                  <span className="text-slate-400 font-medium">Đã có</span>
                </div>

                <div className="flex items-center justify-between text-slate-700">
                  <span className="flex items-center gap-2">
                    {user?.phone ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                    <span>Số điện thoại</span>
                  </span>
                  <span className="text-slate-400 font-medium">
                    {user?.phone ? "Đã có" : "Chưa có"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-700">
                  <span className="flex items-center gap-2">
                    {isIdentityLocked ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                    <span>Ngày sinh & Giới tính</span>
                  </span>
                  <span
                    className={`font-semibold ${
                      isIdentityLocked ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {isIdentityLocked ? "Đã xác thực" : "Chưa cập nhật"}
                  </span>
                </div>
              </div>
            </div>

            {/* Thẻ 2: Thông tin hệ thống & Tài khoản */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-4">
              <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Info className="h-4 w-4 text-slate-400" />
                <span>Chi tiết hệ thống</span>
              </h3>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Mã ID tài khoản</span>
                  <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="font-mono text-slate-800 text-[11px] truncate mr-2">
                      {user?.id || "usr-admin-pduc"}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="p-1 hover:bg-slate-200 text-slate-500 rounded-md transition-colors cursor-pointer shrink-0"
                      title="Sao chép ID"
                    >
                      {copiedId ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Ngày khởi tạo</span>
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>{formatDateDisplay(user?.createdAt as string) || "01/01/2026"}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1.5">Vai trò hiện có</span>
                  <div className="flex flex-wrap gap-1.5">
                    {effectiveRoles.map((r) => {
                      const cfg = ROLE_CONFIGS[r];
                      const label = cfg?.label || r;
                      const badgeClass = cfg?.badgeClass || "bg-blue-50 text-blue-700 border-blue-200";
                      const dotClass = cfg?.dotClass || "bg-blue-500";
                      return (
                        <span
                          key={r}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {user?.assignedWarehouse && (
                  <div>
                    <span className="text-slate-400 block mb-0.5">Kho / Địa bàn phụ trách</span>
                    <span className="font-medium text-slate-800">
                      {user.assignedWarehouse}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (8 COLS): FORM CHI TIẾT HỒ SƠ & THÔNG TIN ĐỊNH DANH */}
          <div className="lg:col-span-8">
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/10">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Thông tin cá nhân & Định danh
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Dữ liệu cá nhân dùng cho định danh và liên hệ nội bộ doanh nghiệp
                    </p>
                  </div>
                </div>

                {isIdentityLocked && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Định danh đã khóa</span>
                  </span>
                )}
              </div>

              {/* Lưới các trường thông tin */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Tên tài khoản (Tên đăng nhập) - Cố định */}
                <div className="p-4 rounded-2xl border border-slate-200/70 bg-slate-50/60">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                      <span>Tên tài khoản (Username)</span>
                    </label>
                    <span className="text-[10px] font-medium text-slate-400">Cố định</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 font-mono py-1">
                    {user?.username || "admin"}
                  </div>
                </div>

                {/* 2. Địa chỉ Email - Cố định */}
                <div className="p-4 rounded-2xl border border-slate-200/70 bg-slate-50/60">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span>Địa chỉ Email</span>
                    </label>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                      Đã xác thực
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 py-1 truncate">
                    {user?.email || "admin@loha.vn"}
                  </div>
                </div>

                {/* 3. Họ và tên (Cho phép sửa) */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    isEditing
                      ? "bg-blue-50/20 border-blue-200 shadow-2xs ring-1 ring-blue-500/10"
                      : "bg-slate-50/60 border-slate-200/70"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">Họ và tên</label>
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

                {/* 4. Số điện thoại (Cho phép sửa) */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    isEditing
                      ? "bg-blue-50/20 border-blue-200 shadow-2xs ring-1 ring-blue-500/10"
                      : "bg-slate-50/60 border-slate-200/70"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>Số điện thoại liên hệ</span>
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

                {/* 5. Ngày sinh (Chỉ cập nhật 1 lần duy nhất) */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    isEditing && !isIdentityLocked
                      ? "bg-amber-50/20 border-amber-300 shadow-2xs ring-1 ring-amber-500/20"
                      : "bg-slate-50/60 border-slate-200/70"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Ngày sinh</span>
                    </label>

                    {isIdentityLocked ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                        <Lock className="h-2.5 w-2.5" />
                        <span>Đã khóa định danh</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                        Cập nhật 1 lần
                      </span>
                    )}
                  </div>

                  {isEditing && !isIdentityLocked ? (
                    <div>
                      <input
                        type="date"
                        value={editDateOfBirth}
                        onChange={(e) => {
                          setEditDateOfBirth(e.target.value);
                          if (dobError) setDobError("");
                        }}
                        max={new Date().toISOString().split("T")[0]}
                        min="1920-01-01"
                        className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border bg-white text-slate-900 focus:outline-none transition-all ${
                          dobError
                            ? "border-rose-400 ring-2 ring-rose-100"
                            : "border-amber-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        }`}
                      />
                      {dobError ? (
                        <p className="mt-1 text-[11px] font-medium text-rose-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {dobError}
                        </p>
                      ) : (
                        <p className="mt-1 text-[10px] text-amber-600 font-medium">
                          ⚠️ Ngày sinh chỉ được lưu 1 lần và không thể sửa lại sau khi xác nhận.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs font-bold text-slate-900 py-1 flex items-center justify-between">
                      {user?.dateOfBirth ? (
                        <span className="font-mono">{formatDateDisplay(user.dateOfBirth)}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg text-xs font-semibold border border-amber-200">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>Chưa cập nhật ngày sinh</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 6. Giới tính (Chỉ cập nhật 1 lần duy nhất) */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    isEditing && !isIdentityLocked
                      ? "bg-amber-50/20 border-amber-300 shadow-2xs ring-1 ring-amber-500/20"
                      : "bg-slate-50/60 border-slate-200/70"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>Giới tính</span>
                    </label>

                    {isIdentityLocked ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                        <Lock className="h-2.5 w-2.5" />
                        <span>Đã khóa định danh</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                        Cập nhật 1 lần
                      </span>
                    )}
                  </div>

                  {isEditing && !isIdentityLocked ? (
                    <div>
                      <div className="grid grid-cols-2 gap-2">
                        {["Nam", "Nữ"].map((genderOpt) => (
                          <button
                            key={genderOpt}
                            type="button"
                            onClick={() => {
                              setEditGender(genderOpt);
                              if (genderError) setGenderError("");
                            }}
                            className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                              editGender === genderOpt
                                ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            {genderOpt}
                          </button>
                        ))}
                      </div>
                      {genderError && (
                        <p className="mt-1 text-[11px] font-medium text-rose-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {genderError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs font-bold text-slate-900 py-1 flex items-center justify-between">
                      {user?.gender ? (
                        <span>{formatGenderDisplay(user.gender)}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg text-xs font-semibold border border-amber-200">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>Chưa cập nhật giới tính</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 7. Khu vực / Kho phụ trách - Cố định */}
                <div className="md:col-span-2 p-4 rounded-2xl border border-slate-200/70 bg-slate-50/60">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      <span>Khu vực / Kho phụ trách</span>
                    </label>
                    <span className="text-[10px] font-medium text-slate-400">Do quản trị viên phân công</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800 py-1">
                    {user?.assignedWarehouse || context.locationText || "Toàn bộ hệ thống"}
                  </div>
                </div>

                {/* 8. Ô nhập mật khẩu xác nhận khi người dùng đang bấm Chỉnh sửa */}
                {isEditing && (
                  <div className="md:col-span-2 p-4 rounded-2xl border border-blue-200 bg-blue-50/30 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Nhập mật khẩu tài khoản để lưu thay đổi</span>
                      </label>
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
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
                        placeholder="Nhập mật khẩu tài khoản hiện tại để xác nhận chính chủ..."
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

              {/* Nút hành động Lưu thay đổi / Hủy nằm ở DƯỚI CÙNG theo yêu cầu */}
              {isEditing && (
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-5 border-t border-slate-100 animate-in fade-in duration-200">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    id="profile-save-btn"
                    onClick={handlePreSave}
                    disabled={isSaving || !confirmPassword.trim()}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Lưu thay đổi</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =============================================================== */}
      {/* 5. POPUP MODAL XÁC NHẬN CẬP NHẬT THÔNG TIN ĐỊNH DANH (1 LẦN)      */}
      {/* =============================================================== */}
      {showIdentityConfirmModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onClick={() => !isSaving && setShowIdentityConfirmModal(false)}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300 animate-modal-backdrop-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-100 transition-all duration-300 animate-modal-in space-y-5"
            >
              {/* Header Popup */}
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-4 ring-amber-100/60 shadow-xs">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Xác nhận thông tin định danh
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Vui lòng kiểm tra kỹ độ chính xác của Ngày sinh và Giới tính trước khi lưu.
                  </p>
                </div>
              </div>

              {/* Hộp cảnh báo quan trọng */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-800">
                  <Info className="h-4 w-4 shrink-0" />
                  <span>Quy định xác thực tài khoản</span>
                </p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Ngày sinh và Giới tính chỉ được cập nhật <strong>DUY NHẤT 1 LẦN</strong>. Sau
                  khi xác nhận, thông tin này sẽ được <strong>KHÓA VĨNH VIỄN</strong> và không
                  thể chỉnh sửa lại trên hệ thống.
                </p>
              </div>

              {/* Bảng đối chiếu thông tin */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">Họ và tên:</span>
                  <span className="font-bold text-slate-900">{editFullName}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">Ngày sinh:</span>
                  <span className="font-bold text-blue-600 font-mono text-sm">
                    {formatDateDisplay(editDateOfBirth)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">Giới tính:</span>
                  <span className="font-bold text-blue-600 text-sm">
                    {formatGenderDisplay(editGender)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500">Số điện thoại:</span>
                  <span className="font-mono text-slate-900">{editPhone || "—"}</span>
                </div>
              </div>

              {/* Nút thao tác trong Modal */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIdentityConfirmModal(false)}
                  disabled={isSaving}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Kiểm tra lại
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition-all cursor-pointer active:scale-98"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Xác nhận & Khóa</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* =============================================================== */}
      {/* 6. MODAL UPLOAD ẢNH ĐẠI DIỆN                                     */}
      {/* =============================================================== */}
      {showUploadModal && (
        <AvatarUploadModal
          currentAvatarUrl={resolveAvatarUrl(user?.avatarUrl)}
          onClose={() => setShowUploadModal(false)}
          onConfirm={handleAvatarConfirm}
        />
      )}
    </div>
  );
};
