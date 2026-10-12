import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import logoImg from '../assets/logo.png';
import { Input } from '../components/input';
import { Button } from '../components/button';
import { showToast } from '../components/toast';
import { AccountLockedModal } from '../components/account-locked-modal';
import { LoginSplashTransition } from '../components/login-splash-transition';
import type { AuthUser } from '../types/auth';
import { loginSchema, type LoginFormData } from '../utils/validation';
import { authService, AccountLockedError } from '../services/auth.service';
import { getRedirectPathByUser } from '../utils/navigation';
import { tokenStorage } from '../utils/token-storage';
import {
  SESSION_TIMEOUT_EVENT,
  SESSION_TIMEOUT_STORAGE_KEY,
  DEFAULT_SESSION_TIMEOUT_MESSAGE,
} from '../utils/session-timeout';
import loginPoster from '../assets/login-poster.jpg';

interface LockedModalState {
  isOpen: boolean;
  reason?: string;
  message?: string;
}

/**
 * Trích xuất trạng thái khóa tài khoản nếu session bị thu hồi do khóa tài khoản
 */
const getInitialLockedModal = (): LockedModalState | null => {
  if (typeof window === 'undefined') return null;

  try {
    const searchParams = new URLSearchParams(window.location.search);
    const hasExpiredParam =
      searchParams.get('expired') === '1' ||
      searchParams.get('session_expired') === '1' ||
      searchParams.get('session_expired') === 'true';

    const sessionExpiredMessage =
      sessionStorage.getItem(SESSION_TIMEOUT_STORAGE_KEY) ||
      (hasExpiredParam ? DEFAULT_SESSION_TIMEOUT_MESSAGE : null);

    if (sessionExpiredMessage) {
      const isLocked =
        sessionExpiredMessage.toLowerCase().includes('khóa') ||
        sessionExpiredMessage.toLowerCase().includes('khoá') ||
        sessionExpiredMessage.toLowerCase().includes('locked');

      if (isLocked) {
        sessionStorage.removeItem(SESSION_TIMEOUT_STORAGE_KEY);
        window.history.replaceState({}, document.title, window.location.pathname);

        const reason = sessionExpiredMessage.includes('Lý do:')
          ? sessionExpiredMessage.split('Lý do:')[1]?.split('.')[0]?.trim()
          : undefined;

        return {
          isOpen: true,
          reason,
          message: sessionExpiredMessage,
        };
      }
    }
  } catch {
    // Bỏ qua lỗi trình duyệt
  }

  return null;
};

/**
 * Trang Đăng nhập LOHA SALES:
 * - Chuyển hướng thông minh sau đăng nhập dựa vào Role của người dùng
 * - Thông báo lỗi qua Toast nổi ở góc màn hình hoặc Popup Modal khi tài khoản bị khóa
 * - Thích ứng Responsive hoàn hảo trên mọi kích thước (Mobile, Tablet, Laptop, Desktop)
 */
export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [lockedModal, setLockedModal] = useState<LockedModalState | null>(getInitialLockedModal);
  const [transitionUser, setTransitionUser] = useState<AuthUser | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Đăng nhập | LOHA SALES';

    // Kiểm tra thông báo phiên làm việc hết hạn khi truy cập
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const hasExpiredParam =
        searchParams.get('expired') === '1' ||
        searchParams.get('session_expired') === '1' ||
        searchParams.get('session_expired') === 'true';

      const sessionExpiredMessage =
        sessionStorage.getItem(SESSION_TIMEOUT_STORAGE_KEY) ||
        (hasExpiredParam ? DEFAULT_SESSION_TIMEOUT_MESSAGE : null);

      if (sessionExpiredMessage) {
        const isLocked =
          sessionExpiredMessage.toLowerCase().includes('khóa') ||
          sessionExpiredMessage.toLowerCase().includes('khoá') ||
          sessionExpiredMessage.toLowerCase().includes('locked');

        if (!isLocked) {
          sessionStorage.removeItem(SESSION_TIMEOUT_STORAGE_KEY);
          window.history.replaceState({}, document.title, window.location.pathname);
          showToast('error', 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại');
        }
      }
    } catch {
      // Bỏ qua lỗi trình duyệt
    }

    // Nếu không có thông báo phiên hết hạn và người dùng đã đăng nhập hợp lệ (bỏ qua nếu đang chạy animation chuyển cảnh)
    if (!lockedModal?.isOpen && !isTransitioning) {
      const token = tokenStorage.getAccessToken();
      const storedUser = tokenStorage.getUser();
      if (token && storedUser) {
        navigate(getRedirectPathByUser(storedUser), { replace: true });
      }
    }
  }, [navigate, lockedModal, isTransitioning]);

  // Lắng nghe sự kiện session-timeout phát ra từ Axios Interceptor khi đang ở trang Login
  useEffect(() => {
    const handleTimeoutEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      const msg = customEvent.detail?.message || DEFAULT_SESSION_TIMEOUT_MESSAGE;
      const lower = msg.toLowerCase();
      const isLocked = lower.includes('khóa') || lower.includes('khoá') || lower.includes('locked');

      if (isLocked) {
        const reason = msg.includes('Lý do:')
          ? msg.split('Lý do:')[1]?.split('.')[0]?.trim()
          : undefined;

        setLockedModal({
          isOpen: true,
          reason,
          message: msg,
        });
      } else {
        showToast('error', 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại');
      }
    };

    window.addEventListener(SESSION_TIMEOUT_EVENT, handleTimeoutEvent);
    return () => {
      window.removeEventListener(SESSION_TIMEOUT_EVENT, handleTimeoutEvent);
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onTouched',
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await authService.login(data);

      // Lưu trữ Token an toàn qua tokenStorage (hỗ trợ cả access_token và refresh_token)
      tokenStorage.setTokens(response.accessToken, response.refreshToken);
      tokenStorage.setUser(response.user);

      // Kích hoạt hiệu ứng chuyển cảnh đăng nhập mượt mà (Login Success Transition & Splash Screen)
      setTransitionUser(response.user);
      setIsTransitioning(true);
    } catch (error: unknown) {
      const err = error as Error & {
        isLocked?: boolean;
        isAdminLocked?: boolean;
        isTemporaryLocked?: boolean;
        lockReason?: string;
      };

      const message = err.message || 'Tài khoản hoặc mật khẩu không chính xác';
      const normalizedMsg = (message + ' ' + (err.lockReason || '')).normalize('NFC').toLowerCase();

      // Kiểm tra tài khoản bị khóa bởi Quản trị viên
      const isAccountLocked =
        err instanceof AccountLockedError ||
        Boolean(err.isLocked) ||
        Boolean(err.isAdminLocked) ||
        normalizedMsg.includes('quản trị viên khóa') ||
        normalizedMsg.includes('quản trị viên khoá') ||
        normalizedMsg.includes('tài khoản đã bị') ||
        normalizedMsg.includes('đã bị khóa') ||
        normalizedMsg.includes('đã bị khoá');

      // Kiểm tra khóa tạm thời do sai mật khẩu 5 lần
      const isTemporaryLock =
        Boolean(err.isTemporaryLocked) ||
        normalizedMsg.includes('khóa tạm thời') ||
        normalizedMsg.includes('khoá tạm thời') ||
        normalizedMsg.includes('tạm khóa') ||
        normalizedMsg.includes('tạm khoá') ||
        normalizedMsg.includes('15 phút');

      if (isAccountLocked && !isTemporaryLock) {
        let reason = err.lockReason;
        if (!reason && message.includes('Lý do:')) {
          reason = message.split('Lý do:')[1]?.split('.')[0]?.trim();
        }

        // Bật popup hiển thị tài khoản bị khóa chuẩn SN-15
        setLockedModal({
          isOpen: true,
          reason:
            reason || 'Tài khoản hiện đang bị tạm khóa theo quyết định của Quản trị viên hệ thống.',
          message,
        });
        return;
      }

      if (isTemporaryLock) {
        showToast('error', 'Tài khoản bị khóa tạm thời 15 phút do nhập sai mật khẩu');
        return;
      }

      showToast('error', message || 'Tài khoản hoặc mật khẩu không chính xác');
    }
  };

  const handleTransitionFinish = () => {
    if (transitionUser) {
      const targetPath = getRedirectPathByUser(transitionUser);
      navigate(targetPath, { replace: true });
    }
  };

  return (
    <div className="w-full min-h-screen lg:h-screen flex items-center justify-center p-3 sm:p-4 lg:p-6 bg-slate-50 text-slate-800 antialiased overflow-hidden">
      {/* Hiệu ứng chuyển cảnh đăng nhập thành công & Splash Screen chuyển trang */}
      {isTransitioning && transitionUser && (
        <LoginSplashTransition
          userName={transitionUser.fullName || transitionUser.username}
          userRole={transitionUser.roles}
          onFinish={handleTransitionFinish}
        />
      )}

      {/* Modal popup cảnh báo tài khoản bị khóa */}
      {lockedModal?.isOpen && (
        <AccountLockedModal
          isOpen={lockedModal.isOpen}
          reason={lockedModal.reason}
          message={lockedModal.message}
          onClose={() => setLockedModal(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* CONTAINER CHÍNH: Dùng đơn vị tương đối (82vh, max 560px) luôn vừa khít     */}
      {/* ========================================================================= */}
      <div className="w-full max-w-md lg:max-w-4xl xl:max-w-5xl lg:h-[82vh] lg:max-h-[560px] bg-white rounded-xl border border-slate-200/80 shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden grid grid-cols-1 lg:grid-cols-2 my-auto">
        {/* ===================================================================== */}
        {/* CỘT TRÁI: Poster (Chiếm chính xác 50% chiều rộng & 100% chiều cao)     */}
        {/* ===================================================================== */}
        <div className="relative hidden lg:block w-full h-full bg-slate-900 select-none overflow-hidden">
          {/* Ảnh poster nền kho hàng 3D rực rỡ, rõ nét và sống động toàn diện */}
          <img
            src={loginPoster}
            alt="LOHA SALES"
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none transition-transform duration-1000 hover:scale-105"
          />

          {/* Lớp overlay nhẹ nhàng, trong trẻo, làm dịu các chi tiết nền để tôn chữ nổi bật (chuẩn UI/UX) */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-white/40 backdrop-blur-[1px] pointer-events-none"
          />

          {/* Quầng sáng nhẹ nhàng tự nhiên phía sau Logo & Chữ giúp thương hiệu nổi bật 100% không cần vỏ card */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[220px] rounded-full bg-white/75 blur-2xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-[#371cdb]/15 blur-[85px] pointer-events-none" />

          {/* Khối thương hiệu trung tâm: Tự nhiên, không có vỏ card, chữ nổi bật tuyệt đối */}
          <div className="relative z-10 w-full h-full flex items-center justify-center p-6 text-center">
            {/* Vòng quỹ đạo ánh sáng mảnh xoay tròn xung quanh khối thương hiệu */}
            <div
              className="absolute w-72 h-72 rounded-full border border-indigo-400/30 border-dashed pointer-events-none"
              style={{ animation: 'spin 25s linear infinite' }}
            />

            {/* Logo & Tên thương hiệu đứng độc lập, nổi bật sắc nét */}
            <div className="relative flex flex-col items-center justify-center">
              {/* Logo LOHA SALES trong suốt, nổi bật với drop-shadow mượt mà */}
              <div className="relative mb-3 flex items-center justify-center">
                <img
                  src={logoImg}
                  alt="LOHA SALES"
                  className="h-16 sm:h-20 w-auto object-contain drop-shadow-[0_12px_28px_rgba(55,28,219,0.35)] transition-transform duration-500 hover:scale-105"
                />
              </div>

              {/* Tên thương hiệu LOHA SALES đậm nét, tương phản sắc sảo trên lớp nền êm dịu */}
              <h2 className="text-2xl xl:text-3xl font-black tracking-[0.25em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#1e1b4b] via-[#371cdb] to-[#1e1b4b] drop-shadow-[0_2px_12px_rgba(255,255,255,0.95)]">
                LOHA SALES
              </h2>

              {/* Dải phân cách viền phát sáng thương hiệu */}
              <div className="w-14 h-0.5 bg-gradient-to-r from-transparent via-[#371cdb] to-transparent mt-3 rounded-full shadow-[0_0_10px_rgba(55,28,219,0.5)]" />
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* CỘT PHẢI: Form Đăng Nhập (Cân xứng tuyệt đối với cột Poster)           */}
        {/* ===================================================================== */}
        <div className="w-full h-full flex flex-col justify-center p-6 sm:p-8 lg:p-8 xl:p-10 bg-white overflow-y-auto">
          {/* Header Card */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl overflow-hidden shadow-xs mb-2">
              <img src={logoImg} alt="LOHA SALES" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Đăng nhập
            </h1>
            <p className="text-slate-500 text-xs mt-2">
              Nhập email và mật khẩu của bạn để tiếp tục
            </p>
          </div>

          {/* Form đăng nhập */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Input Tên đăng nhập / Email */}
            <Input
              label="Tên đăng nhập / Email"
              type="text"
              placeholder="admin hoặc email@loha.vn"
              autoComplete="username"
              required
              disabled={isSubmitting}
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            {/* Input Mật khẩu */}
            <Input
              label="Mật khẩu"
              type={showPassword ? 'text' : 'password'}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              required
              disabled={isSubmitting}
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  disabled={isSubmitting}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              {...register('password')}
            />

            {/* Tùy chọn Ghi nhớ & Quên mật khẩu */}
            <div className="flex items-center justify-between text-xs sm:text-sm pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  disabled={isSubmitting}
                  className="w-4 h-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary-ring)] cursor-pointer"
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>

              <Link
                to="/auth/forgot-password"
                className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium hover:underline focus:outline-none transition-colors cursor-pointer"
              >
                Quên mật khẩu?
              </Link>
            </div>

            {/* Nút Submit */}
            <Button
              type="submit"
              isLoading={isSubmitting}
              loadingText="Đang xác thực..."
              rightIcon={
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              }
              className="mt-1 group shadow-2xs hover:shadow-xs active:scale-[0.99] transition-all"
            >
              Đăng nhập
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
