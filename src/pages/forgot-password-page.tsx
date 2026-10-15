import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Mail,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Loader2,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import logoImg from '../assets/logo.png';
import loginBg from '../assets/login-bg.jpg';
import { authService } from '../services/auth.service';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../utils/validation';

export const ForgotPasswordPage: React.FC = () => {
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [submittedEmail, setSubmittedEmail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState<boolean>(false);

  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
    mode: 'onTouched',
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setErrorMessage(null);

    try {
      await authService.forgotPassword({ email: data.email });
      setSubmittedEmail(data.email);
      setIsSuccess(true);
    } catch (error: unknown) {
      const err = error as Error;
      setErrorMessage(err.message || 'Đã xảy ra sự cố khi gửi yêu cầu. Vui lòng thử lại sau!');
    }
  };

  const handleResetForm = () => {
    setIsSuccess(false);
    setSubmittedEmail('');
    setErrorMessage(null);
    reset();
  };

  const handleNavigateBack = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsExiting(true);
    setTimeout(() => {
      navigate('/auth/login');
    }, 280);
  };

  return (
    <div className="auth-glass-container relative w-full min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-950 text-white antialiased overflow-hidden select-none">
      {/* ===================================================================== */}
      {/* 1. BACKGROUND WALLPAPER: Kho hàng thông minh & Cực quang ban đêm      */}
      {/* ===================================================================== */}
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

      {/* ========================================================================= */}
      {/* 2. THẺ KÍNH CHÍNH (Glassmorphism Siêu Trong Suốt Pha Lê)                  */}
      {/* ========================================================================= */}
      <div
        className={`relative z-10 w-full max-w-[92vw] sm:max-w-[460px] md:max-w-[480px] lg:max-w-[490px] bg-white/[0.06] backdrop-blur-xl rounded-[36px] sm:rounded-[42px] border border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.18)] py-11 sm:py-14 md:py-16 px-6 sm:px-10 md:px-12 text-center my-auto transition-all duration-300 ${
          isExiting ? 'animate-glass-card-exit' : 'animate-glass-card-enter'
        }`}
      >
        {/* Header: Icon & Title */}
        <div className="flex flex-col items-center justify-center mb-8 sm:mb-10">
          <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white/[0.08] backdrop-blur-xl border border-white/20 shadow-[0_8px_25px_rgba(0,0,0,0.25)] mb-4 sm:mb-5">
            {isSuccess ? (
              <CheckCircle2 className="w-10 sm:w-11 h-10 sm:h-11 text-emerald-400 drop-shadow-[0_4px_12px_rgba(52,211,153,0.5)]" />
            ) : (
              <KeyRound className="w-10 sm:w-11 h-10 sm:h-11 text-indigo-300 drop-shadow-[0_4px_12px_rgba(165,180,252,0.4)]" />
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
            {isSuccess ? 'Kiểm tra hộp thư' : 'Quên mật khẩu?'}
          </h1>

          <p className="text-xs sm:text-sm text-white/70 mt-2 leading-relaxed max-w-sm">
            {isSuccess ? (
              <>
                Hướng dẫn đặt lại mật khẩu đã được gửi đến email{' '}
                <span className="font-semibold text-white underline underline-offset-2">
                  {submittedEmail}
                </span>
                .
              </>
            ) : (
              'Nhập địa chỉ email tài khoản LOHA của bạn để nhận liên kết đặt lại mật khẩu an toàn.'
            )}
          </p>
        </div>

        {/* Thông báo lỗi nếu có */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-400/30 text-rose-200 text-xs sm:text-sm flex items-start gap-3 text-left backdrop-blur-md">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Trạng thái 1: Đã gửi email thành công */}
        {isSuccess ? (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white/[0.05] border border-white/10 text-left text-xs sm:text-sm text-white/80 space-y-3 backdrop-blur-md">
              <div className="flex items-center gap-2 font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Yêu cầu đã được tiếp nhận</span>
              </div>
              <ul className="space-y-1.5 text-white/70 list-disc pl-5 text-xs">
                <li>
                  Liên kết có hiệu lực trong vòng <strong className="text-white">30 phút</strong>.
                </li>
                <li>
                  Liên kết chỉ sử dụng được <strong className="text-white">1 lần duy nhất</strong>.
                </li>
                <li>Kiểm tra cả thư mục Spam / Rác nếu không thấy trong Hộp thư đến.</li>
              </ul>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleNavigateBack}
                className="w-full h-13 sm:h-14 rounded-full bg-white hover:bg-white/95 active:scale-[0.98] text-[#1e1b4b] font-bold text-sm sm:text-base tracking-wide shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2 group"
              >
                <ArrowLeft className="w-4.5 sm:w-5 h-4.5 sm:h-5 transition-transform group-hover:-translate-x-1" />
                <span>Quay lại Đăng nhập</span>
              </button>

              <button
                type="button"
                onClick={handleResetForm}
                className="w-full h-11 rounded-full bg-white/10 hover:bg-white/15 text-white/80 hover:text-white border border-white/15 text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Gửi lại với email khác</span>
              </button>
            </div>
          </div>
        ) : (
          /* Trạng thái 2: Form nhập email */
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 sm:space-y-6">
            <div className="space-y-1.5 text-left">
              <div className="relative flex items-center">
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="Địa chỉ email (vd: nhanvien@loha.vn)"
                  autoComplete="email"
                  disabled={isSubmitting}
                  className={`glass-input w-full h-13 sm:h-14 md:h-[58px] pl-6 sm:pl-7 pr-12 sm:pr-14 rounded-full text-sm sm:text-base bg-white/10 hover:bg-white/15 focus:bg-white/20 border text-white placeholder-white/50 transition-all outline-none backdrop-blur-md ${
                    errors.email
                      ? 'border-rose-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-400/25'
                      : 'border-white/20 hover:border-white/35 focus:border-white/70 focus:ring-2 focus:ring-white/20'
                  }`}
                  {...register('email')}
                />
                <div className="absolute inset-y-0 right-0 pr-4.5 sm:pr-5.5 flex items-center pointer-events-none text-white/70">
                  <Mail className="w-4.5 sm:w-5 h-4.5 sm:h-5" />
                </div>
              </div>
              {errors.email && (
                <p className="ml-3 sm:ml-4 text-xs sm:text-sm text-rose-300 flex items-center gap-1.5 font-medium pt-1">
                  <AlertCircle className="w-3.5 sm:w-4 h-3.5 sm:h-4 shrink-0" />
                  <span>{errors.email.message}</span>
                </p>
              )}
            </div>

            {/* Nút gửi yêu cầu */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-13 sm:h-14 md:h-[58px] mt-2 rounded-full bg-white hover:bg-white/95 active:scale-[0.98] text-[#1e1b4b] font-bold text-sm sm:text-base tracking-wide shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4.5 sm:w-5 h-4.5 sm:h-5 animate-spin text-[#1e1b4b]" />
                  <span>Đang gửi liên kết...</span>
                </>
              ) : (
                <>
                  <span>Gửi liên kết khôi phục</span>
                  <ArrowRight className="w-4.5 sm:w-5 h-4.5 sm:h-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>

            {/* Nút quay lại trang đăng nhập với transition mượt */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleNavigateBack}
                className="inline-flex items-center gap-2 text-xs sm:text-sm text-white/70 hover:text-white transition-colors cursor-pointer group"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span>Quay lại trang Đăng nhập</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
