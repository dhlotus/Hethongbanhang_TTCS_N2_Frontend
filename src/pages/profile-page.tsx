import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
  Camera,
  CheckCircle,
  AlertCircle,
  Loader2,
  PencilLine,
  Check,
  User,
  Mail,
  Building2,
  Calendar,
  ShieldAlert,
  UserCheck,
  Info,
  Clock,
  Phone,
} from 'lucide-react';
import { AvatarUploadModal } from '../components/avatar-upload-modal';
import { usersService, type UpdateMyProfilePayload } from '../services/users.service';
import { tokenStorage } from '../utils/token-storage';
import { getStoredUser } from '../utils/navigation';
import { getUserContext, ROLE_CONFIGS } from '../utils/navigation-config';
import { resolveAvatarUrl } from '../utils/avatar';
import { showToast } from '../components/toast';
import type { AuthUser, UserRoleType } from '../types/auth';

const VIETNAM_PHONE_PATTERN = /^(?:0|\+84)(?:[35789]\d{8}|2\d{9})$/;

/**
 * Định dạng ngày YYYY-MM-DD sang DD/MM/YYYY
 */
const formatDateDisplay = (dateStr?: string | null): string => {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
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
  if (!gender) return '—';
  switch (gender.toUpperCase()) {
    case 'MALE':
    case 'NAM':
      return 'Nam';
    case 'FEMALE':
    case 'NỮ':
    case 'NU':
      return 'Nữ';
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
  const [isFetchingProfile, setIsFetchingProfile] = useState<boolean>(false);

  // Trạng thái chỉnh sửa trực tiếp (Inline Editing)
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editFullName, setEditFullName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editDateOfBirth, setEditDateOfBirth] = useState<string>('');
  const [editGender, setEditGender] = useState<string>('');

  // Lỗi xác thực form
  const [nameError, setNameError] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string>('');
  const [dobError, setDobError] = useState<string>('');
  const [genderError, setGenderError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const context = getUserContext(user);

  // Lọc bỏ phần vai trò trong ngoặc khỏi tên hiển thị
  const cleanFullName =
    (context.fullName || '').replace(/\s*\([^)]*\)/g, '').trim() ||
    context.fullName ||
    'Người dùng';

  // Danh sách các vai trò hiện có của tài khoản
  const effectiveRoles = (
    user?.roles && user.roles.length > 0 ? user.roles : [user?.role || context.role]
  ) as UserRoleType[];

  // Kiểm tra thông tin định danh (Ngày sinh & Giới tính) đã được khóa chưa (chỉ cập nhật 1 lần duy nhất)
  const isIdentityLocked = Boolean(
    user?.isIdentityLocked ||
    (user?.id && localStorage.getItem(`identity_locked_${user.id}`) === 'true') ||
    (user?.dateOfBirth && user?.gender)
  );

  // Cập nhật giá trị form khi user thay đổi
  useEffect(() => {
    if (user) {
      setEditFullName(user.fullName || cleanFullName);
      setEditPhone(user.phone || '');
      setEditDateOfBirth(
        user.dateOfBirth
          ? user.dateOfBirth.split('T')[0]
          : localStorage.getItem(`user_dob_${user.id}`) || ''
      );
      setEditGender(user.gender || localStorage.getItem(`user_gender_${user.id}`) || '');
    }
  }, [user, cleanFullName]);

  // Đồng bộ thông tin profile mới nhất từ backend khi vào trang
  const fetchProfile = useCallback(async () => {
    const token = tokenStorage.getAccessToken();
    if (!token || token.startsWith('demo-jwt-')) return;

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
        ? localStorage.getItem(`identity_locked_${currentUser.id}`) === 'true'
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
          Boolean((freshUser.dateOfBirth || localDob) && (freshUser.gender || localGender)),
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

    if (token?.startsWith('demo-jwt-')) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const demoUrl = URL.createObjectURL(croppedFile);
      const updatedUser: AuthUser = { ...(user as AuthUser), avatarUrl: demoUrl };
      tokenStorage.setUser(updatedUser);
      setUser(updatedUser);
      setShowUploadModal(false);
      showToast('success', 'Cập nhật ảnh đại diện thành công');
      window.dispatchEvent(new CustomEvent('avatar-updated', { detail: demoUrl }));
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
        window.dispatchEvent(new CustomEvent('avatar-updated', { detail: newAvatarUrl }));
      }

      setShowUploadModal(false);
      showToast('success', 'Cập nhật ảnh đại diện thành công');
    } catch (err: unknown) {
      const responseMessage = axios.isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message
        : undefined;
      showToast('error', responseMessage || 'Không thể cập nhật ảnh đại diện');
    }
  };

  const handleStartEdit = () => {
    setNameError('');
    setPhoneError('');
    setDobError('');
    setGenderError('');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNameError('');
    setPhoneError('');
    setDobError('');
    setGenderError('');
    if (user) {
      setEditFullName(user.fullName || cleanFullName);
      setEditPhone(user.phone || '');
      setEditDateOfBirth(user.dateOfBirth?.split('T')[0] || '');
      setEditGender(user.gender || '');
    }
  };

  // Xác thực bước 1 trước khi lưu
  const handlePreSave = () => {
    const normalizedName = editFullName.trim();
    const normalizedPhone = editPhone.trim();

    let hasError = false;

    if (!normalizedName) {
      setNameError('Vui lòng nhập họ và tên.');
      hasError = true;
    } else if (normalizedName.length > 100) {
      setNameError('Họ và tên không được vượt quá 100 ký tự.');
      hasError = true;
    } else {
      setNameError('');
    }

    if (normalizedPhone && !VIETNAM_PHONE_PATTERN.test(normalizedPhone)) {
      setPhoneError('Nhập số điện thoại Việt Nam hợp lệ (ví dụ: 0912345678 hoặc +84912345678).');
      hasError = true;
    } else {
      setPhoneError('');
    }

    // Nếu thông tin định danh chưa khóa và người dùng nhập:
    if (!isIdentityLocked) {
      if (!editDateOfBirth) {
        setDobError('Vui lòng chọn ngày sinh để hoàn tất thông tin định danh.');
        hasError = true;
      } else {
        const birthDate = new Date(editDateOfBirth);
        const today = new Date();
        if (birthDate > today || birthDate.getFullYear() < 1920) {
          setDobError('Ngày sinh không hợp lệ (phải từ năm 1920 đến hiện tại).');
          hasError = true;
        } else {
          setDobError('');
        }
      }

      if (!editGender) {
        setGenderError('Vui lòng chọn giới tính của bạn.');
        hasError = true;
      } else {
        setGenderError('');
      }
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

    try {
      // 1. Tạo payload cập nhật
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
        throw new Error('Không tìm thấy thông tin người dùng. Vui lòng tải lại trang.');
      }

      const token = tokenStorage.getAccessToken();
      let updatedUser: Partial<AuthUser> = { ...payload };

      if (!token?.startsWith('demo-jwt-')) {
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
        localStorage.setItem(`identity_locked_${currentUser.id}`, 'true');
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
      window.dispatchEvent(new CustomEvent('user-updated', { detail: mergedUser }));

      setIsEditing(false);
      showToast(
        'success',
        willLockIdentity
          ? 'Xác thực định danh và lưu hồ sơ thành công'
          : 'Cập nhật thông tin cá nhân thành công'
      );
    } catch (error: unknown) {
      const responseMessage = axios.isAxiosError<{ message?: string | string[] }>(error)
        ? error.response?.data?.message
        : undefined;
      const message = Array.isArray(responseMessage)
        ? responseMessage.join(', ')
        : responseMessage || (error instanceof Error ? error.message : '');
      showToast('error', message || 'Không thể cập nhật hồ sơ');
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
    <div className="space-y-6 w-full max-w-[1520px] mx-auto antialiased">
      {/* =============================================================== */}
      {/* 2. THÔNG BÁO YÊU CẦU BỔ SUNG THÔNG TIN CÁ NHÂN                    */}
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
      {/* 3. BỐ CỤC 2 CỘT: CARD LỚN BÊN TRÁI & 2 CARD NHỎ BÊN PHẢI          */}
      {/* =============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-7 items-start">
        {/* CỘT TRÁI (8 COLS): CARD THÔNG TIN CÁ NHÂN & ĐỊNH DANH (CARD LỚN) */}
        <div className="lg:col-span-8 order-1">
          <div className="rounded-xl bg-white border border-slate-200/80 p-6 sm:p-8 lg:p-9 shadow-xs transition-all duration-300">
            {/* Header card: Tích hợp Avatar tương tác + Họ tên + Nút chỉnh sửa */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-5 sm:gap-6">
                {/* Avatar tương tác: hover hiển thị icon đổi ảnh */}
                <button
                  type="button"
                  id="avatar-camera-btn"
                  onClick={() => setShowUploadModal(true)}
                  className="relative group/avatar shrink-0 rounded-full overflow-hidden focus:outline-none ring-4 ring-slate-100/90 shadow-sm cursor-pointer bg-white transition-all hover:scale-[1.02]"
                  title="Nhấp để thay đổi ảnh đại diện"
                  aria-label="Thay đổi ảnh đại diện"
                >
                  <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-slate-100 overflow-hidden">
                    {user?.avatarUrl ? (
                      <img
                        src={resolveAvatarUrl(user.avatarUrl)}
                        alt={`Ảnh đại diện của ${cleanFullName}`}
                        className="h-full w-full object-cover group-hover/avatar:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600">
                        <span className="text-2xl sm:text-3xl font-extrabold text-white select-none">
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

                {/* Họ tên và tiêu đề thông tin */}
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-[26px] font-extrabold text-slate-900 tracking-tight leading-tight">
                    {isFetchingProfile ? (
                      <span className="inline-flex items-center gap-2 text-slate-400">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Đang đồng bộ...
                      </span>
                    ) : (
                      cleanFullName
                    )}
                  </h1>
                  <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1.5">
                    Hồ sơ nhân sự & Định danh tài khoản
                  </p>
                </div>
              </div>

              {/* Trạng thái nút thao tác trên header - chuyển đổi mượt mà */}
              {!isEditing ? (
                <button
                  type="button"
                  id="profile-edit-btn"
                  onClick={handleStartEdit}
                  className="self-start sm:self-auto shrink-0 inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-2xs transition-all duration-200 cursor-pointer active:scale-[0.98]"
                >
                  <PencilLine className="w-4 h-4 text-blue-600" />
                  <span>Chỉnh sửa thông tin</span>
                </button>
              ) : (
                <div className="self-start sm:self-auto shrink-0 inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 transition-all duration-300 animate-in fade-in">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  <span>Đang chỉnh sửa</span>
                </div>
              )}
            </div>

            {/* Lưới các trường thông tin - Chiều cao cố định h-12 chống giật khi chuyển đổi, cỡ chữ to rõ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 pt-7">
              {/* 1. Tên tài khoản - Cố định */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[13px] sm:text-sm font-semibold text-slate-600">
                  <label className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-slate-400" />
                    <span>Tên tài khoản</span>
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    Cố định
                  </span>
                </div>
                <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50/90 border border-slate-200/90 text-sm sm:text-[15px] font-bold text-slate-900 tracking-tight select-all">
                  {user?.username || 'admin'}
                </div>
              </div>

              {/* 2. Địa chỉ Email - Cố định */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[13px] sm:text-sm font-semibold text-slate-600">
                  <label className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span>Địa chỉ Email</span>
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-md">
                    Đã xác thực
                  </span>
                </div>
                <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50/90 border border-slate-200/90 text-sm sm:text-[15px] font-semibold text-slate-900 truncate">
                  {user?.email || 'admin@loha.vn'}
                </div>
              </div>

              {/* 3. Họ và tên (Cho phép sửa) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[13px] sm:text-sm font-semibold text-slate-700">
                  <label className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span>Họ và tên</span>
                  </label>
                  {isEditing && (
                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md animate-in fade-in duration-200">
                      Cho phép sửa
                    </span>
                  )}
                </div>

                <div className="relative">
                  {isEditing ? (
                    <div className="space-y-1.5 animate-in fade-in duration-200">
                      <input
                        type="text"
                        value={editFullName}
                        onChange={(e) => {
                          setEditFullName(e.target.value);
                          if (nameError) setNameError('');
                        }}
                        maxLength={100}
                        placeholder="Nhập họ và tên của bạn..."
                        className={`w-full h-12 px-4 text-sm sm:text-[15px] font-semibold rounded-xl border bg-white text-slate-900 focus:outline-none transition-all ${
                          nameError
                            ? 'border-rose-400 ring-2 ring-rose-100'
                            : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                        }`}
                      />
                      {nameError && (
                        <p className="text-xs font-medium text-rose-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {nameError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50/90 border border-slate-200/90 text-sm sm:text-[15px] font-bold text-slate-900">
                      {cleanFullName}
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Số điện thoại (Cho phép sửa) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[13px] sm:text-sm font-semibold text-slate-700">
                  <label className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>Số điện thoại liên hệ</span>
                  </label>
                  {isEditing && (
                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md animate-in fade-in duration-200">
                      Cho phép sửa
                    </span>
                  )}
                </div>

                <div className="relative">
                  {isEditing ? (
                    <div className="space-y-1.5 animate-in fade-in duration-200">
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => {
                          setEditPhone(e.target.value);
                          if (phoneError) setPhoneError('');
                        }}
                        placeholder="Ví dụ: 0912345678"
                        className={`w-full h-12 px-4 text-sm sm:text-[15px] font-semibold rounded-xl border bg-white text-slate-900 focus:outline-none transition-all ${
                          phoneError
                            ? 'border-rose-400 ring-2 ring-rose-100'
                            : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                        }`}
                      />
                      {phoneError ? (
                        <p className="text-xs font-medium text-rose-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {phoneError}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400">
                          Định dạng 10 chữ số bắt đầu bằng 0 hoặc +84
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50/90 border border-slate-200/90 text-sm sm:text-[15px] font-bold text-slate-900">
                      {user?.phone ? (
                        <span className="tracking-tight text-slate-900">{user.phone}</span>
                      ) : (
                        <span className="text-slate-400 font-normal italic">
                          Chưa cập nhật số điện thoại
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Ngày sinh (Chỉ cập nhật 1 lần duy nhất) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[13px] sm:text-sm font-semibold text-slate-700">
                  <label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>Ngày sinh</span>
                  </label>
                  {!isIdentityLocked && (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-md animate-in fade-in duration-200">
                      Cập nhật 1 lần
                    </span>
                  )}
                </div>

                <div className="relative">
                  {isEditing && !isIdentityLocked ? (
                    <div className="space-y-1.5 animate-in fade-in duration-200">
                      <input
                        type="date"
                        value={editDateOfBirth}
                        onChange={(e) => {
                          setEditDateOfBirth(e.target.value);
                          if (dobError) setDobError('');
                        }}
                        max={new Date().toISOString().split('T')[0]}
                        min="1920-01-01"
                        className={`w-full h-12 px-4 text-sm sm:text-[15px] font-semibold rounded-xl border bg-white text-slate-900 focus:outline-none transition-all ${
                          dobError
                            ? 'border-rose-400 ring-2 ring-rose-100'
                            : 'border-amber-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                        }`}
                      />
                      {dobError ? (
                        <p className="text-xs font-medium text-rose-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {dobError}
                        </p>
                      ) : (
                        <p className="text-[11px] text-amber-600 font-medium">
                          ⚠️ Ngày sinh chỉ được lưu 1 lần và không thể sửa lại sau khi xác nhận.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="h-12 flex items-center justify-between px-4 rounded-xl bg-slate-50/90 border border-slate-200/90 text-sm sm:text-[15px] font-bold text-slate-900">
                      {user?.dateOfBirth ? (
                        <span className="tracking-tight text-slate-900">
                          {formatDateDisplay(user.dateOfBirth)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-700 text-sm font-semibold">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>Chưa cập nhật ngày sinh</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 6. Giới tính (Chỉ cập nhật 1 lần duy nhất) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[13px] sm:text-sm font-semibold text-slate-700">
                  <label className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span>Giới tính</span>
                  </label>
                  {!isIdentityLocked && (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-md animate-in fade-in duration-200">
                      Cập nhật 1 lần
                    </span>
                  )}
                </div>

                <div className="relative">
                  {isEditing && !isIdentityLocked ? (
                    <div className="space-y-1.5 animate-in fade-in duration-200">
                      <div className="grid grid-cols-2 gap-3 h-12">
                        {['Nam', 'Nữ'].map((genderOpt) => (
                          <button
                            key={genderOpt}
                            type="button"
                            onClick={() => {
                              setEditGender(genderOpt);
                              if (genderError) setGenderError('');
                            }}
                            className={`h-12 text-sm font-semibold rounded-xl border transition-all cursor-pointer ${
                              editGender === genderOpt
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {genderOpt}
                          </button>
                        ))}
                      </div>
                      {genderError && (
                        <p className="text-xs font-medium text-rose-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {genderError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="h-12 flex items-center justify-between px-4 rounded-xl bg-slate-50/90 border border-slate-200/90 text-sm sm:text-[15px] font-bold text-slate-900">
                      {user?.gender ? (
                        <span>{formatGenderDisplay(user.gender)}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-700 text-sm font-semibold">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>Chưa cập nhật giới tính</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 7. Khu vực / Kho phụ trách - Cố định */}
              <div className="sm:col-span-2 space-y-2">
                <div className="flex items-center justify-between text-[13px] sm:text-sm font-semibold text-slate-600">
                  <label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span>Khu vực / Kho phụ trách</span>
                  </label>
                  <span className="text-[11px] font-medium text-slate-400">
                    Do quản trị viên phân công
                  </span>
                </div>
                <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50/90 border border-slate-200/90 text-sm sm:text-[15px] font-semibold text-slate-800">
                  {user?.assignedWarehouse || context.locationText || 'Toàn bộ hệ thống'}
                </div>
              </div>
            </div>

            {/* VÙNG NÚT HÀNH ĐỘNG - HIỆU ỨNG ACCORDION MƯỢT MÀ */}
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                isEditing
                  ? 'grid-rows-[1fr] opacity-100 pt-6 mt-7 border-t border-slate-100'
                  : 'grid-rows-[0fr] opacity-0 pointer-events-none'
              }`}
            >
              <div className="overflow-hidden">
                {/* Nút hành động Lưu thay đổi / Hủy */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3.5">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="w-full sm:w-auto px-6 h-12 flex items-center justify-center text-sm font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    id="profile-save-btn"
                    onClick={handlePreSave}
                    disabled={isSaving}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 h-12 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
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
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (4 COLS): 2 CARD NHỎ (TIẾN ĐỘ HỒ SƠ & THÔNG TIN HỆ THỐNG) */}
        <div className="lg:col-span-4 space-y-6 order-2">
          {/* Thẻ 1: Tiến độ hoàn thiện hồ sơ */}
          <div className="rounded-xl bg-white border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5 transition-all">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Mức độ hoàn thiện</h3>
              <span className="text-base font-extrabold text-blue-600 tracking-tight">
                {completionPercent}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 ease-out"
                style={{ width: `${completionPercent}%` }}
              />
            </div>

            {/* Danh sách checklist */}
            <div className="space-y-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-sm font-medium text-slate-800">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                  <span>Họ và tên</span>
                </span>
                <span className="text-xs font-semibold text-slate-400">Đã có</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-sm font-medium text-slate-800">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                  <span>Email liên kết</span>
                </span>
                <span className="text-xs font-semibold text-slate-400">Đã có</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-sm font-medium text-slate-800">
                  {user?.phone ? (
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                  )}
                  <span>Số điện thoại</span>
                </span>
                <span
                  className={`text-xs font-semibold ${user?.phone ? 'text-slate-400' : 'text-amber-600'}`}
                >
                  {user?.phone ? 'Đã có' : 'Chưa có'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-sm font-medium text-slate-800">
                  {isIdentityLocked ? (
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                  )}
                  <span>Ngày sinh & Giới tính</span>
                </span>
                <span
                  className={`text-xs font-semibold ${
                    isIdentityLocked ? 'text-slate-400' : 'text-amber-600'
                  }`}
                >
                  {isIdentityLocked ? 'Đã có' : 'Chưa cập nhật'}
                </span>
              </div>
            </div>
          </div>

          {/* Thẻ 2: Thông tin hệ thống & Tài khoản */}
          <div className="rounded-xl bg-white border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5 transition-all">
            <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2.5">
              <Info className="h-5 w-5 text-slate-400" />
              <span>Chi tiết hệ thống</span>
            </h3>

            <div className="space-y-4">
              <div>
                <span className="text-[13px] font-semibold text-slate-500 block mb-1.5">
                  Tên tài khoản
                </span>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 font-bold text-slate-900 text-sm tracking-tight">
                  {user?.username || 'admin'}
                </div>
              </div>

              <div>
                <span className="text-[13px] font-semibold text-slate-500 block mb-1">
                  Ngày khởi tạo
                </span>
                <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>{formatDateDisplay(user?.createdAt as string) || '01/01/2026'}</span>
                </div>
              </div>

              <div>
                <span className="text-[13px] font-semibold text-slate-500 block mb-2">
                  Vai trò hiện có
                </span>
                <div className="flex flex-wrap gap-2">
                  {effectiveRoles.map((r) => {
                    const cfg = ROLE_CONFIGS[r];
                    const label = cfg?.label || r;
                    const badgeClass =
                      cfg?.badgeClass || 'bg-blue-50 text-blue-700 border-blue-200';
                    const dotClass = cfg?.dotClass || 'bg-blue-500';
                    return (
                      <span
                        key={r}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-[13px] font-semibold border ${badgeClass}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${dotClass}`} />
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {user?.assignedWarehouse && (
                <div>
                  <span className="text-[13px] font-semibold text-slate-500 block mb-1">
                    Kho / Địa bàn phụ trách
                  </span>
                  <span className="font-semibold text-slate-800 text-sm">
                    {user.assignedWarehouse}
                  </span>
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
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={() => !isSaving && setShowIdentityConfirmModal(false)}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300 animate-modal-backdrop-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-100 transition-all duration-300 animate-modal-in space-y-5"
            >
              {/* Header Popup */}
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-600 ring-4 ring-amber-100/60 shadow-xs">
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
                  Ngày sinh và Giới tính chỉ được cập nhật <strong>DUY NHẤT 1 LẦN</strong>. Sau khi
                  xác nhận, thông tin này sẽ được <strong>KHÓA VĨNH VIỄN</strong> và không thể chỉnh
                  sửa lại trên hệ thống.
                </p>
              </div>

              {/* Bảng đối chiếu thông tin */}
              <div className="rounded-md border border-slate-200 bg-slate-50/60 p-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">Họ và tên:</span>
                  <span className="font-bold text-slate-900">{editFullName}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">Ngày sinh:</span>
                  <span className="font-bold text-blue-600 text-sm tracking-tight">
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
                  <span className="font-bold text-slate-900 tracking-tight">
                    {editPhone || '—'}
                  </span>
                </div>
              </div>

              {/* Nút thao tác trong Modal */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIdentityConfirmModal(false)}
                  disabled={isSaving}
                  className="w-full rounded-md border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Kiểm tra lại
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition-all cursor-pointer active:scale-98"
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
