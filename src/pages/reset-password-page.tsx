import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Loader2,
  ArrowLeft,
  Check,
} from 'lucide-react';
import logoImg from '../assets/logo.png';
import loginBg from '../assets/login-bg.jpg';
import { authService } from '../services/auth.service';
import { resetPasswordSchema, type ResetPasswordFormData } from '../utils/validation';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [hasNewPassword, setHasNewPassword] = useState<boolean>(false);
  const [hasConfirmPassword, setHasConfirmPassword] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState<boolean>(false);

  const newPasswordInputRef = useRef<HTMLInputElement | null>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onTouched',
  });

  const newPasswordValue = watch('newPassword') || '';
  const confirmPasswordValue = watch('confirmPassword') || '';
  const hasMinLength = newPasswordValue.length >= 8;
  const hasLetter = /[A-Za-z]/.test(newPasswordValue);
  const hasNumber = /\d/.test(newPasswordValue);

  // Theo dõi giá trị mật khẩu để hiển thị 3 trạng thái icon
  useEffect(() => {
    const elNew = newPasswordInputRef.current;
    const elConfirm = confirmPasswordInputRef.current;

    const checkValues = () => {
      const vNew = elNew?.value || newPasswordValue || '';
      const vConfirm = elConfirm?.value || confirmPasswordValue || '';
      setHasNewPassword(Boolean(vNew && vNew.length > 0));
      setHasConfirmPassword(Boolean(vConfirm && vConfirm.length > 0));
    };

    checkValues();

    if (elNew) {
      elNew.addEventListener('input', checkValues);
      elNew.addEventListener('change', checkValues);
    }
    if (elConfirm) {
      elConfirm.addEventListener('input', checkValues);
      elConfirm.addEventListener('change', checkValues);
    }

    const t1 = setTimeout(checkValues, 100);
    const t2 = setTimeout(checkValues, 400);

    return () => {
      if (elNew) {
        elNew.removeEventListener('input', checkValues);
        elNew.removeEventListener('change', checkValues);
      }
      if (elConfirm) {
        elConfirm.removeEventListener('input', checkValues);
        elConfirm.removeEventListener('change', checkValues);
      }
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [newPasswordValue, confirmPasswordValue]);

  const handleNavigate = (path: string) => {
    setIsExiting(true);
    setTimeout(() => {
      navigate(path);
    }, 280);
  };

  const onSubmit = async (data: ResetPasswordFormData) => {
    setErrorMessage(null);

    if (!token.trim()) {
      setErrorMessage(
        'Mã token xác thực không hợp lệ hoặc bị thiếu. Vui lòng bấm vào đường dẫn đầy đủ trong email của bạn!'
      );
      return;
    }

    try {
      await authService.resetPassword({
        token: token.trim(),
        newPassword: data.newPassword,
      });

      setIsSuccess(true);
    } catch (error: unknown) {
      const err = error as Error;
      setErrorMessage(
        err.message ||
          'Mã xác thực không hợp lệ hoặc đã hết hạn (30 phút). Vui lòng yêu cầu cấp lại liên kết mới!'
      );
    }
  };

  return (
    <div className="auth-glass-container relative w-full min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-950 text-white antialiased overflow-hidden select-none">
      {/* 1. Wallpaper background & Auroras */}
      <img
        src={loginBg}
        alt="Smart Warehouse Hub"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none transition-transform duration-1000 scale-105"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-[#1e1b4b]/35 via-[#0f172a]/45 to-[#020617]/65 backdrop-blur-[0.5px] pointer-events-none"
      />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] lg:w-[700px] lg:h-[700px] rounded-full bg-[#371cdb]/20 blur-[150px] pointer-events-none animate-glass-pulse" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] lg:w-[540px] lg:h-[540px] rounded-full bg-cyan-400/12 blur-[140px] pointer-events-none" />

      {/* Thương hiệu LOHA SALES cố định góc trên trái */}
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

      {/* Trường hợp thiếu mã Token */}
      {!token.trim() ? (
        <div
          className={`relative z-10 w-full max-w-[92vw] sm:max-w-[460px] md:max-w-[480px] bg-white/[0.06] backdrop-blur-xl rounded-[36px] sm:rounded-[42px] border border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.18)] py-11 sm:py-14 px-6 sm:px-10 text-center my-auto transition-all duration-300 ${
            isExiting ? 'animate-glass-card-exit' : 'animate-glass-card-enter'
          }`}
        >
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-300 inline-flex items-center justify-center mb-5 shadow-[0_4px_20px_rgba(245,158,11,0.2)]">
            <AlertTriangle className="w-10 h-10" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            Thiếu mã xác thực
          </h1>

          <p className="text-xs sm:text-sm text-white/70 leading-relaxed mb-8">
            Không tìm thấy mã token đặt lại mật khẩu trong đường dẫn liên kết. Vui lòng bấm vào liên
            kết trong email hoặc yêu cầu gửi lại liên kết mới.
          </p>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleNavigate('/auth/forgot-password')}
              className="w-full h-13 sm:h-14 rounded-full bg-white hover:bg-white/95 active:scale-[0.98] text-[#1e1b4b] font-bold text-sm sm:text-base tracking-wide shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Yêu cầu liên kết mới</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('/auth/login')}
              className="w-full h-11 rounded-full bg-white/10 hover:bg-white/15 text-white/80 hover:text-white border border-white/15 text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại trang Đăng nhập</span>
            </button>
          </div>
        </div>
      ) : (
        /* Thẻ Kính Đặt Lại Mật Khẩu Chính */
        <div
          className={`relative z-10 w-full max-w-[92vw] sm:max-w-[460px] md:max-w-[480px] lg:max-w-[490px] bg-white/[0.06] backdrop-blur-xl rounded-[36px] sm:rounded-[42px] border border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.18)] py-11 sm:py-14 md:py-16 px-6 sm:px-10 md:px-12 text-center my-auto transition-all duration-300 ${
            isExiting ? 'animate-glass-card-exit' : 'animate-glass-card-enter'
          }`}
        >
          {/* Header */}
          <div className="flex flex-col items-center justify-center mb-8 sm:mb-9">
            <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white/[0.08] backdrop-blur-xl border border-white/20 shadow-[0_8px_25px_rgba(0,0,0,0.25)] mb-4 sm:mb-5">
              {isSuccess ? (
                <CheckCircle2 className="w-10 sm:w-11 h-10 sm:h-11 text-emerald-400 drop-shadow-[0_4px_12px_rgba(52,211,153,0.5)]" />
              ) : (
                <ShieldCheck className="w-10 sm:w-11 h-10 sm:h-11 text-indigo-300 drop-shadow-[0_4px_12px_rgba(165,180,252,0.4)]" />
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
              {isSuccess ? 'Đặt lại thành công!' : 'Đổi mật khẩu'}
            </h1>

            <p className="text-xs sm:text-sm text-white/70 mt-2 leading-relaxed max-w-sm">
              {isSuccess
                ? 'Mật khẩu tài khoản LOHA của bạn đã được cập nhật thành công. Bạn có thể đăng nhập ngay.'
                : 'Thiết lập mật khẩu mới bảo mật cho tài khoản của bạn.'}
            </p>
          </div>

          {/* Lỗi cảnh báo nếu có */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-400/30 text-rose-200 text-xs sm:text-sm flex items-start gap-3 text-left backdrop-blur-md">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => handleNavigate('/auth/forgot-password')}
                  className="text-white underline hover:text-white/80 cursor-pointer text-xs"
                >
                  Yêu cầu liên kết mới tại đây
                </button>
              </div>
            </div>
          )}

          {isSuccess ? (
            /* Trạng thái đổi mật khẩu thành công */
            <div className="space-y-5 pt-2">
              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-xs sm:text-sm space-y-1 text-left backdrop-blur-md">
                <p className="font-semibold text-emerald-300">Hoàn tất cập nhật!</p>
                <p className="text-white/80">Toàn bộ phiên đăng nhập cũ đã được thu hồi an toàn.</p>
              </div>

              <button
                type="button"
                onClick={() => handleNavigate('/auth/login')}
                className="w-full h-13 sm:h-14 rounded-full bg-white hover:bg-white/95 active:scale-[0.98] text-[#1e1b4b] font-bold text-sm sm:text-base tracking-wide shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2 group"
              >
                <span>Đăng nhập ngay</span>
                <ArrowRight className="w-4.5 sm:w-5 h-4.5 sm:h-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          ) : (
            /* Form nhập mật khẩu mới */
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 sm:space-y-6">
              {/* 1. Mật khẩu mới */}
              <div className="space-y-1.5 text-left">
                <div className="relative flex items-center">
                  <input
                    id="reset-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Mật khẩu mới"
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    className={`glass-input w-full h-13 sm:h-14 md:h-[58px] pl-6 sm:pl-7 pr-12 sm:pr-14 rounded-full text-sm sm:text-base bg-white/10 hover:bg-white/15 focus:bg-white/20 border text-white placeholder-white/50 transition-all outline-none backdrop-blur-md ${
                      errors.newPassword
                        ? 'border-rose-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-400/25'
                        : 'border-white/20 hover:border-white/35 focus:border-white/70 focus:ring-2 focus:ring-white/20'
                    }`}
                    {...register('newPassword')}
                    ref={(el) => {
                      register('newPassword').ref(el);
                      newPasswordInputRef.current = el;
                    }}
                    onInput={(e) => setHasNewPassword(e.currentTarget.value.length > 0)}
                    onChange={(e) => {
                      register('newPassword').onChange(e);
                      setHasNewPassword(e.target.value.length > 0);
                    }}
                  />
                  {!hasNewPassword ? (
                    <div className="absolute inset-y-0 right-0 pr-4.5 sm:pr-5.5 flex items-center pointer-events-none text-white/70">
                      <Lock className="w-4.5 sm:w-5 h-4.5 sm:h-5" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Mở xem mật khẩu'}
                      disabled={isSubmitting}
                      className="absolute inset-y-0 right-0 pr-4.5 sm:pr-5.5 flex items-center text-white/70 hover:text-white transition-colors focus:outline-none cursor-pointer"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4.5 sm:w-5 h-4.5 sm:h-5" />
                      ) : (
                        <Eye className="w-4.5 sm:w-5 h-4.5 sm:h-5" />
                      )}
                    </button>
                  )}
                </div>
                {errors.newPassword && (
                  <p className="ml-3 sm:ml-4 text-xs text-rose-300 font-medium">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>

              {/* Tiêu chí mật khẩu dạng thẻ chip mờ */}
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white/70 space-y-1.5 text-left backdrop-blur-md">
                <span className="font-semibold text-white/80 block text-[11px] uppercase tracking-wider">
                  Yêu cầu bảo mật:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
                  <div
                    className={`flex items-center gap-1.5 text-[11px] transition-colors ${
                      hasMinLength ? 'text-emerald-300 font-medium' : 'text-white/50'
                    }`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 ${hasMinLength ? 'opacity-100' : 'opacity-40'}`}
                    />
                    <span>Tối thiểu 8 ký tự</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 text-[11px] transition-colors ${
                      hasLetter ? 'text-emerald-300 font-medium' : 'text-white/50'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${hasLetter ? 'opacity-100' : 'opacity-40'}`} />
                    <span>Có chữ cái</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 text-[11px] transition-colors ${
                      hasNumber ? 'text-emerald-300 font-medium' : 'text-white/50'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${hasNumber ? 'opacity-100' : 'opacity-40'}`} />
                    <span>Có chữ số</span>
                  </div>
                </div>
              </div>

              {/* 2. Xác nhận mật khẩu mới */}
              <div className="space-y-1.5 text-left">
                <div className="relative flex items-center">
                  <input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Xác nhận lại mật khẩu"
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    className={`glass-input w-full h-13 sm:h-14 md:h-[58px] pl-6 sm:pl-7 pr-12 sm:pr-14 rounded-full text-sm sm:text-base bg-white/10 hover:bg-white/15 focus:bg-white/20 border text-white placeholder-white/50 transition-all outline-none backdrop-blur-md ${
                      errors.confirmPassword
                        ? 'border-rose-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-400/25'
                        : 'border-white/20 hover:border-white/35 focus:border-white/70 focus:ring-2 focus:ring-white/20'
                    }`}
                    {...register('confirmPassword')}
                    ref={(el) => {
                      register('confirmPassword').ref(el);
                      confirmPasswordInputRef.current = el;
                    }}
                    onInput={(e) => setHasConfirmPassword(e.currentTarget.value.length > 0)}
                    onChange={(e) => {
                      register('confirmPassword').onChange(e);
                      setHasConfirmPassword(e.target.value.length > 0);
                    }}
                  />
                  {!hasConfirmPassword ? (
                    <div className="absolute inset-y-0 right-0 pr-4.5 sm:pr-5.5 flex items-center pointer-events-none text-white/70">
                      <Lock className="w-4.5 sm:w-5 h-4.5 sm:h-5" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Mở xem mật khẩu'}
                      disabled={isSubmitting}
                      className="absolute inset-y-0 right-0 pr-4.5 sm:pr-5.5 flex items-center text-white/70 hover:text-white transition-colors focus:outline-none cursor-pointer"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4.5 sm:w-5 h-4.5 sm:h-5" />
                      ) : (
                        <Eye className="w-4.5 sm:w-5 h-4.5 sm:h-5" />
                      )}
                    </button>
                  )}
                </div>
                {errors.confirmPassword && (
                  <p className="ml-3 sm:ml-4 text-xs text-rose-300 font-medium">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Nút Submit cập nhật mật khẩu */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-13 sm:h-14 md:h-[58px] mt-6 rounded-full bg-white hover:bg-white/95 active:scale-[0.98] text-[#1e1b4b] font-bold text-sm sm:text-base tracking-wide shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4.5 sm:w-5 h-4.5 sm:h-5 animate-spin text-[#1e1b4b]" />
                    <span>Đang cập nhật...</span>
                  </>
                ) : (
                  <>
                    <span>Cập nhật mật khẩu</span>
                    <ArrowRight className="w-4.5 sm:w-5 h-4.5 sm:h-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => handleNavigate('/auth/login')}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm text-white/70 hover:text-white transition-colors cursor-pointer group"
                >
                  <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                  <span>Quay lại trang Đăng nhập</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
