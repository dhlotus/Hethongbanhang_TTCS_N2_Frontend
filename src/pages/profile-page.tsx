import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Mail,
  Shield,
  MapPin,
  Camera,
  CheckCircle,
  AlertCircle,
  Loader2,
  KeyRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AvatarUploadModal } from '../components/avatar-upload-modal';
import { usersService } from '../services/users.service';
import { tokenStorage } from '../utils/token-storage';
import { getStoredUser } from '../utils/navigation';
import { getUserContext } from '../utils/navigation-config';
import { resolveAvatarUrl } from '../utils/avatar';
import type { AuthUser } from '../types/auth';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Lấy nhãn vai trò tiếng Việt */
const getRoleLabel = (role: string): string => {
  const map: Record<string, string> = {
    ADMIN: 'Quản trị hệ thống',
    SALES_REP: 'Nhân viên kinh doanh',
    SALES_MANAGER: 'Quản lý kinh doanh',
    WAREHOUSE_KEEPER: 'Thủ kho',
    WAREHOUSE_MANAGER: 'Quản lý kho',
    ACCOUNTANT: 'Kế toán công nợ',
    CUSTOMER: 'Đại lý B2B',
  };
  return map[role] ?? role;
};

// ─── Toast nội bộ ────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error';

interface ToastState {
  type: ToastType;
  message: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser());
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);

  const context = getUserContext(user);

  // Tự động ẩn toast sau 4 giây
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Đồng bộ thông tin profile từ backend khi mount (nếu có backend)
  const fetchProfile = useCallback(async () => {
    const token = tokenStorage.getAccessToken();
    if (!token || token.startsWith('demo-jwt-')) return; // Bỏ qua khi dùng demo

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
      // Lỗi mạng — giữ nguyên data localStorage, không hiện toast
    } finally {
      setIsFetchingProfile(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  // ─── Upload handler ─────────────────────────────────────────────────────

  const handleAvatarConfirm = async (croppedFile: File): Promise<void> => {
    const token = tokenStorage.getAccessToken();

    if (token?.startsWith('demo-jwt-')) {
      // Demo mode: tạo URL tạm để hiển thị, không gọi API
      await new Promise((resolve) => setTimeout(resolve, 800));
      const demoUrl = URL.createObjectURL(croppedFile);
      const updatedUser: AuthUser = { ...(user as AuthUser), avatarUrl: demoUrl };
      tokenStorage.setUser(updatedUser);
      setUser(updatedUser);
      setShowUploadModal(false);
      setToast({ type: 'success', message: 'Ảnh đại diện đã được cập nhật!' });
      // Thông báo Header cập nhật avatar (cùng tab)
      window.dispatchEvent(new CustomEvent('avatar-updated', { detail: demoUrl }));
      return;
    }

    // Production: gọi API thật
    const response = await usersService.uploadAvatar(croppedFile);
    const newAvatarUrl = response.data?.avatarUrl;

    // Merge state - bảo toàn 100% profile người dùng hiện tại
    const currentUser = tokenStorage.getUser() || user;
    if (currentUser) {
      const mergedUser: AuthUser = {
        ...currentUser,
        avatarUrl: newAvatarUrl,
      };
      tokenStorage.setUser(mergedUser);
      setUser(mergedUser);
      // Thông báo Header cập nhật avatar (cùng tab)
      window.dispatchEvent(new CustomEvent('avatar-updated', { detail: newAvatarUrl }));
    }

    setShowUploadModal(false);
    setToast({ type: 'success', message: 'Ảnh đại diện đã được cập nhật!' });
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* Toast notification */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                : 'bg-rose-50 text-rose-800 ring-1 ring-rose-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {toast.message}
          </div>
        )}

        {/* Card chính */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 overflow-hidden">

          {/* Banner gradient */}
          <div className="h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

          {/* Avatar + thông tin cơ bản */}
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="h-24 w-24 rounded-2xl ring-4 ring-white shadow-lg overflow-hidden bg-gradient-to-tr from-blue-100 to-indigo-100">
                  {user?.avatarUrl ? (
                    <img
                      src={resolveAvatarUrl(user.avatarUrl)}
                      alt={`Ảnh đại diện của ${user.fullName}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-blue-600 to-indigo-600">
                      <span className="text-2xl font-bold text-white select-none">
                        {context.avatarLetter}
                      </span>
                    </div>
                  )}
                </div>

                {/* Nút camera */}
                <button
                  type="button"
                  id="avatar-camera-btn"
                  onClick={() => setShowUploadModal(true)}
                  className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md ring-2 ring-white hover:bg-blue-700 transition-colors"
                  title="Thay đổi ảnh đại diện"
                  aria-label="Thay đổi ảnh đại diện"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              {/* Tên & vai trò */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900 truncate">
                    {isFetchingProfile ? (
                      <span className="inline-flex items-center gap-2 text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tải…
                      </span>
                    ) : (
                      user?.fullName ?? '—'
                    )}
                  </h1>
                  {user?.roles?.[0] && (
                    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-semibold ${context.badgeClass}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${context.dotClass}`} />
                      {context.roleLabel}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-slate-500 truncate">
                  {user?.email ?? '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card thông tin chi tiết */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 divide-y divide-slate-100">
          <div className="px-6 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Thông tin tài khoản
            </h2>
          </div>

          {/* Họ và tên */}
          <div className="flex items-center gap-4 px-6 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-400">Họ và tên</p>
              <p className="text-sm font-semibold text-slate-800 truncate">
                {user?.fullName ?? '—'}
              </p>
            </div>
          </div>

          {/* Username */}
          <div className="flex items-center gap-4 px-6 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Shield className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-400">Tên đăng nhập</p>
              <p className="text-sm font-semibold text-slate-800 truncate">
                {user?.username ?? '—'}
              </p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-4 px-6 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Mail className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-400">Email</p>
              <p className="text-sm font-semibold text-slate-800 truncate">
                {user?.email ?? '—'}
              </p>
            </div>
          </div>

          {/* Vai trò */}
          <div className="flex items-center gap-4 px-6 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Shield className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-400">Vai trò hệ thống</p>
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {user?.roles?.length
                  ? user.roles.map((r) => (
                      <span
                        key={r}
                        className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200/60"
                      >
                        {getRoleLabel(r)}
                      </span>
                    ))
                  : <span className="text-sm text-slate-500">—</span>}
              </div>
            </div>
          </div>

          {/* Kho / Địa bàn */}
          {context.locationText && (
            <div className="flex items-center gap-4 px-6 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-400">Kho / Địa bàn làm việc</p>
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {context.locationText}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Card hành động */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 divide-y divide-slate-100">
          <div className="px-6 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Bảo mật
            </h2>
          </div>

          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Đổi mật khẩu</p>
                <p className="text-xs text-slate-400">Cập nhật mật khẩu để bảo vệ tài khoản</p>
              </div>
            </div>
            <Link
              to="/profile/change-password"
              id="profile-change-password-link"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Đổi mật khẩu
            </Link>
          </div>

          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Camera className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Ảnh đại diện</p>
                <p className="text-xs text-slate-400">Tải lên ảnh cá nhân (JPEG/PNG, ≤ 2 MB)</p>
              </div>
            </div>
            <button
              type="button"
              id="profile-avatar-upload-btn"
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Camera className="h-3.5 w-3.5" />
              Thay ảnh
            </button>
          </div>
        </div>

      </div>

      {/* Avatar Upload Modal */}
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
