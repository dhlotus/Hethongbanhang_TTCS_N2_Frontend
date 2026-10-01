import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { Button } from "../components/button";
import { Input } from "../components/input";
import { authService } from "../services/auth.service";
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from "../utils/validation";

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onTouched",
  });

  const newPasswordValue = watch("newPassword") || "";
  const hasMinLength = newPasswordValue.length >= 8;
  const hasLetter = /[A-Za-z]/.test(newPasswordValue);
  const hasNumber = /\d/.test(newPasswordValue);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setErrorMessage(null);

    if (!token.trim()) {
      setErrorMessage(
        "Mã token xác thực không hợp lệ hoặc bị thiếu. Vui lòng bấm vào đường dẫn đầy đủ trong email của bạn!",
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
          "Mã xác thực không hợp lệ hoặc đã hết hạn (30 phút). Vui lòng yêu cầu cấp lại liên kết mới!",
      );
    }
  };

  // Trường hợp không có token trong query params
  if (!token.trim()) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 text-slate-800 antialiased">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm sm:shadow-md p-6 sm:p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mb-3 shadow-2xs">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Thiếu mã xác thực
            </h1>

            <p className="text-slate-500 text-xs sm:text-sm mt-2 leading-relaxed">
              Không tìm thấy mã token đặt lại mật khẩu trong đường dẫn liên kết. Vui lòng kiểm tra lại liên kết được gửi trong email hoặc gửi lại yêu cầu mới.
            </p>

            <div className="mt-6 space-y-2.5">
              <Link
                to="/auth/forgot-password"
                className="w-full h-10.5 sm:h-11 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Yêu cầu lại liên kết mới</span>
              </Link>

              <Link
                to="/auth/login"
                className="w-full h-10.5 sm:h-11 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                <span>Quay lại trang Đăng nhập</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 text-slate-800 antialiased">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm sm:shadow-md p-6 sm:p-8 transition-all">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 mb-3 shadow-2xs">
              {isSuccess ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-blue-600" />
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {isSuccess ? "Đặt lại mật khẩu thành công!" : "Thiết lập mật khẩu mới"}
            </h1>

            <p className="text-slate-500 text-xs sm:text-sm mt-1.5 leading-relaxed">
              {isSuccess
                ? "Mật khẩu của bạn đã được cập nhật an toàn. Toàn bộ phiên đăng nhập cũ đã được thu hồi."
                : "Vui lòng nhập mật khẩu mới bảo mật cho tài khoản LOHA SALES của bạn."}
            </p>
          </div>

          {/* Cảnh báo lỗi */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">Không thể đổi mật khẩu</span>
                <span>{errorMessage}</span>
                <div className="pt-1">
                  <Link
                    to="/auth/forgot-password"
                    className="text-rose-800 underline font-semibold hover:text-rose-900 inline-block"
                  >
                    Yêu cầu gửi lại liên kết mới tại đây
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Trạng thái 1: Thành công */}
          {isSuccess ? (
            <div className="space-y-4 pt-1">
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-slate-700 text-xs sm:text-sm space-y-1.5 leading-relaxed">
                <p className="font-semibold text-emerald-800">
                  Cập nhật hoàn tất!
                </p>
                <p className="text-slate-600">
                  Bạn có thể dùng mật khẩu mới này để đăng nhập vào toàn bộ hệ thống ngay bây giờ.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  onClick={() => navigate("/auth/login", { replace: true })}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <span>Đăng nhập ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            /* Trạng thái 2: Form đổi mật khẩu */
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {/* Input Mật khẩu mới */}
              <Input
                label="Mật khẩu mới"
                type={showNewPassword ? "text" : "password"}
                placeholder="Tối thiểu 8 ký tự, gồm chữ và số"
                autoComplete="new-password"
                required
                disabled={isSubmitting}
                leftIcon={<Lock className="w-4 h-4" />}
                error={errors.newPassword?.message}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    disabled={isSubmitting}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
                {...register("newPassword")}
              />

              {/* Checklist độ mạnh mật khẩu */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
                <span className="font-semibold text-slate-600 block">
                  Tiêu chuẩn mật khẩu an toàn:
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        hasMinLength ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                    <span className={hasMinLength ? "text-emerald-700 font-medium" : ""}>
                      Tối thiểu 8 ký tự
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        hasLetter ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                    <span className={hasLetter ? "text-emerald-700 font-medium" : ""}>
                      Có chứa chữ cái (A-Z)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        hasNumber ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                    <span className={hasNumber ? "text-emerald-700 font-medium" : ""}>
                      Có chứa chữ số (0-9)
                    </span>
                  </div>
                </div>
              </div>

              {/* Input Xác nhận mật khẩu mới */}
              <Input
                label="Xác nhận mật khẩu mới"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Nhập lại mật khẩu mới"
                autoComplete="new-password"
                required
                disabled={isSubmitting}
                leftIcon={<Lock className="w-4 h-4" />}
                error={errors.confirmPassword?.message}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    disabled={isSubmitting}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
                {...register("confirmPassword")}
              />

              <Button
                type="submit"
                isLoading={isSubmitting}
                loadingText="Đang cập nhật mật khẩu..."
                className="w-full mt-2"
              >
                Cập nhật mật khẩu mới
              </Button>

              <div className="pt-2 text-center">
                <Link
                  to="/auth/login"
                  className="text-xs sm:text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors"
                >
                  Quay lại trang Đăng nhập
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-slate-400">
          Hệ thống Bán hàng & Quản lý Kho — LOHA SALES
        </div>
      </div>
    </div>
  );
};
