import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, User, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import logoImg from '../assets/logo.png';
import loginBg from '../assets/login-bg.jpg';
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onTouched',
  });

  const [hasPassword, setHasPassword] = useState(false);
  const [isNavigatingAway, setIsNavigatingAway] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  const handleNavigateToForgot = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsNavigatingAway(true);
    setTimeout(() => {
      navigate('/auth/forgot-password');
    }, 280);
  };

  const passwordValue = watch('password');

  // Theo dõi giá trị mật khẩu (hỗ trợ nhập tay, copy/paste, và cả autofill từ trình duyệt)
  useEffect(() => {
    const el = passwordInputRef.current;
    const checkValue = () => {
      const val = el?.value || passwordValue || '';
      setHasPassword(Boolean(val && val.length > 0));
    };

    checkValue();

    if (el) {
      el.addEventListener('input', checkValue);
      el.addEventListener('change', checkValue);
      el.addEventListener('focus', checkValue);
      el.addEventListener('blur', checkValue);
    }

    const t1 = setTimeout(checkValue, 100);
    const t2 = setTimeout(checkValue, 300);
    const t3 = setTimeout(checkValue, 800);
    const t4 = setTimeout(checkValue, 1500);

    return () => {
      if (el) {
        el.removeEventListener('input', checkValue);
        el.removeEventListener('change', checkValue);
        el.removeEventListener('focus', checkValue);
        el.removeEventListener('blur', checkValue);
      }
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [passwordValue]);

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
    <div className="login-glass-container relative w-full min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-950 text-white antialiased overflow-hidden select-none">
      {/* ===================================================================== */}
      {/* 1. BACKGROUND WALLPAPER: Kho hàng thông minh & Cực quang ban đêm      */}
      {/* ===================================================================== */}
      {/* Ảnh nền Fullscreen Smart Warehouse & Logistics Center ban đêm */}
      <img
        src={loginBg}
        alt="Smart Warehouse & Logistics Hub"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none transition-transform duration-1000 scale-105"
      />

      {/* Lớp overlay màu tím - xanh đêm dịu nhẹ tôn vinh hình nền */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-[#1e1b4b]/35 via-[#0f172a]/45 to-[#020617]/65 backdrop-blur-[0.5px] pointer-events-none"
      />

      {/* Quầng sáng cực quang phát sáng dịu nhẹ phía sau tấm kính */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] lg:w-[700px] lg:h-[700px] rounded-full bg-[#371cdb]/20 blur-[150px] pointer-events-none animate-glass-pulse" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] lg:w-[540px] lg:h-[540px] rounded-full bg-cyan-400/12 blur-[140px] pointer-events-none" />

      {/* Thương hiệu LOHA SALES cố định góc trên trái khung nhìn */}
      <div className="absolute top-5 left-5 sm:top-7 sm:left-8 flex items-center gap-2.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/15 shadow-[0_8px_20px_rgba(0,0,0,0.3)] z-20 pointer-events-none">
        <img
          src={logoImg}
          alt="LOHA SALES"
          className="h-6 sm:h-7 w-auto object-contain drop-shadow-[0_2px_8px_rgba(255,255,255,0.4)]"
        />
        <span className="text-xs sm:text-sm font-black tracking-[0.2em] text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          LOHA SALES
        </span>
      </div>

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
      {/* 2. THẺ KÍNH CHÍNH (Siêu Trong Suốt Pha Lê - Bố Cục Cân Đối Hoàn Mỹ)       */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 2. THẺ KÍNH CHÍNH (Siêu Trong Suốt Pha Lê - Chiều Cao Thoáng Đãng Cân Đối)  */}
      {/* ========================================================================= */}
      <div className={`relative z-10 w-full max-w-[92vw] sm:max-w-[450px] md:max-w-[470px] lg:max-w-[480px] bg-white/[0.06] backdrop-blur-xl rounded-[36px] sm:rounded-[42px] border border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.18)] py-11 sm:py-14 md:py-16 px-6 sm:px-10 md:px-12 text-center my-auto transition-all duration-300 ${isNavigatingAway ? 'animate-glass-card-exit' : 'animate-glass-card-enter'}`}>
        {/* Header: Logo & Title - Khoảng cách thoáng đãng */}
        <div className="flex flex-col items-center justify-center mb-8 sm:mb-10 md:mb-12">
          <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white/[0.08] backdrop-blur-xl border border-white/20 shadow-[0_8px_25px_rgba(0,0,0,0.25)] mb-4 sm:mb-5">
            <img
              src={logoImg}
              alt="LOHA SALES"
              className="h-11 sm:h-13 w-auto object-contain drop-shadow-[0_4px_12px_rgba(255,255,255,0.4)]"
            />
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-[32px] font-extrabold text-white tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
            Đăng nhập
          </h1>
        </div>

        {/* Form đăng nhập - Các phần tử giãn cách rộng rãi, không bị dồn ép */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 sm:space-y-6 md:space-y-7">
          {/* Input Username / Email dạng Capsule Kính Mờ */}
          <div className="space-y-1.5 text-left">
            <div className="relative flex items-center">
              <input
                id="login-email"
                type="text"
                placeholder="Tên đăng nhập hoặc Email"
                autoComplete="username"
                disabled={isSubmitting}
                className={`glass-input w-full h-13 sm:h-14 md:h-[58px] pl-6 sm:pl-7 pr-12 sm:pr-14 rounded-full text-sm sm:text-base bg-white/10 hover:bg-white/15 focus:bg-white/20 border text-white placeholder-white/50 transition-all outline-none backdrop-blur-md ${
                  errors.email
                    ? 'border-rose-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-400/25'
                    : 'border-white/20 hover:border-white/35 focus:border-white/70 focus:ring-2 focus:ring-white/20'
                }`}
                {...register('email')}
              />
              <div className="absolute inset-y-0 right-0 pr-4.5 sm:pr-5.5 flex items-center pointer-events-none text-white/70">
                <User className="w-4.5 sm:w-5 h-4.5 sm:h-5" />
              </div>
            </div>
            {errors.email && (
              <p className="ml-3 sm:ml-4 text-xs sm:text-sm text-rose-300 flex items-center gap-1.5 font-medium pt-1">
                <AlertCircle className="w-3.5 sm:w-4 h-3.5 sm:h-4 shrink-0" />
                <span>{errors.email.message}</span>
              </p>
            )}
          </div>

          {/* Input Password dạng Capsule Kính Mờ - 3 Trạng thái Icon (1: Chưa nhập -> Ổ khóa, 2: Đã nhập -> Con mắt mở xem, 3: Đang xem -> Con mắt đóng/gạch) */}
          <div className="space-y-1.5 text-left">
            <div className="relative flex items-center">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mật khẩu"
                autoComplete="current-password"
                disabled={isSubmitting}
                className={`glass-input w-full h-13 sm:h-14 md:h-[58px] pl-6 sm:pl-7 pr-12 sm:pr-14 rounded-full text-sm sm:text-base bg-white/10 hover:bg-white/15 focus:bg-white/20 border text-white placeholder-white/50 transition-all outline-none backdrop-blur-md ${
                  errors.password
                    ? 'border-rose-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-400/25'
                    : 'border-white/20 hover:border-white/35 focus:border-white/70 focus:ring-2 focus:ring-white/20'
                }`}
                {...register('password')}
                ref={(el) => {
                  register('password').ref(el);
                  passwordInputRef.current = el;
                }}
                onInput={(e) => {
                  setHasPassword(e.currentTarget.value.length > 0);
                }}
                onChange={(e) => {
                  register('password').onChange(e);
                  setHasPassword(e.target.value.length > 0);
                }}
              />
              {!hasPassword ? (
                /* Icon 1: Khi chưa nhập gì -> Hiện ổ khóa */
                <div
                  className="absolute inset-y-0 right-0 pr-4.5 sm:pr-5.5 flex items-center pointer-events-none text-white/70"
                  title="Chưa nhập mật khẩu"
                >
                  <Lock className="w-4.5 sm:w-5 h-4.5 sm:h-5" />
                </div>
              ) : (
                /* Khi đã nhập mật khẩu -> Nút chuyển đổi xem / ẩn */
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Mở xem mật khẩu'}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Mở xem mật khẩu'}
                  disabled={isSubmitting}
                  className="absolute inset-y-0 right-0 pr-4.5 sm:pr-5.5 flex items-center text-white/70 hover:text-white transition-colors focus:outline-none cursor-pointer"
                >
                  {showPassword ? (
                    /* Icon 3: Khi đang xem mật khẩu -> Hiện con mắt gạch để ẩn đi */
                    <EyeOff className="w-4.5 sm:w-5 h-4.5 sm:h-5" />
                  ) : (
                    /* Icon 2: Khi đã nhập nhưng đang ẩn -> Hiện con mắt mở để bấm xem */
                    <Eye className="w-4.5 sm:w-5 h-4.5 sm:h-5" />
                  )}
                </button>
              )}
            </div>
            {errors.password && (
              <p className="ml-3 sm:ml-4 text-xs sm:text-sm text-rose-300 flex items-center gap-1.5 font-medium pt-1">
                <AlertCircle className="w-3.5 sm:w-4 h-3.5 sm:h-4 shrink-0" />
                <span>{errors.password.message}</span>
              </p>
            )}
          </div>

          {/* Tùy chọn Ghi nhớ đăng nhập & Quên mật khẩu? */}
          <div className="flex items-center justify-between text-xs sm:text-sm pt-2.5 sm:pt-3.5 px-1 sm:px-2">
            <label className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white select-none transition-colors">
              <input
                type="checkbox"
                defaultChecked
                disabled={isSubmitting}
                className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded border-white/40 bg-white/10 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-indigo-500"
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>

            <button
              type="button"
              onClick={handleNavigateToForgot}
              className="text-white/80 hover:text-white hover:underline focus:outline-none transition-colors cursor-pointer"
            >
              Quên mật khẩu?
            </button>
          </div>

          {/* Nút Submit Trắng Nguyên Khối Bo Tròn (Solid White Pill Button) - Khoảng cách thoáng đãng */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-13 sm:h-14 md:h-[58px] mt-7 sm:mt-9 md:mt-10 rounded-full bg-white hover:bg-white/95 active:scale-[0.98] text-[#1e1b4b] font-bold text-sm sm:text-base tracking-wide shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4.5 sm:w-5 h-4.5 sm:h-5 animate-spin text-[#1e1b4b]" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <>
                <span>Đăng nhập</span>
                <ArrowRight className="w-4.5 sm:w-5 h-4.5 sm:h-5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
