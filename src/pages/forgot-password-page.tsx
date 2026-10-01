import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ArrowLeft, CheckCircle2, ShieldAlert, KeyRound } from "lucide-react";
import { Button } from "../components/button";
import { Input } from "../components/input";
import { authService } from "../services/auth.service";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from "../utils/validation";

export const ForgotPasswordPage: React.FC = () => {
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [submittedEmail, setSubmittedEmail] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
    mode: "onTouched",
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setErrorMessage(null);

    try {
      await authService.forgotPassword({ email: data.email });
      setSubmittedEmail(data.email);
      setIsSuccess(true);
    } catch (error: unknown) {
      const err = error as Error;
      setErrorMessage(
        err.message || "Đã xảy ra sự cố khi gửi yêu cầu. Vui lòng thử lại sau!",
      );
    }
  };

  const handleResetForm = () => {
    setIsSuccess(false);
    setSubmittedEmail("");
    setErrorMessage(null);
    reset();
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 text-slate-800 antialiased">
      <div className="w-full max-w-md">
        {/* Card chứa form */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm sm:shadow-md p-6 sm:p-8 transition-all">
          {/* Header Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 mb-3 shadow-2xs">
              {isSuccess ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              ) : (
                <KeyRound className="w-6 h-6 text-blue-600" />
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {isSuccess ? "Kiểm tra hộp thư của bạn" : "Quên mật khẩu?"}
            </h1>

            <p className="text-slate-500 text-xs sm:text-sm mt-1.5 leading-relaxed">
              {isSuccess ? (
                <>
                  Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến địa chỉ{" "}
                  <span className="font-semibold text-slate-800">{submittedEmail}</span>.
                </>
              ) : (
                "Nhập địa chỉ email liên kết với tài khoản của bạn để nhận liên kết đặt lại mật khẩu an toàn."
              )}
            </p>
          </div>

          {/* Cảnh báo lỗi nếu có */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Trạng thái 1: Đã gửi email thành công */}
          {isSuccess ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-slate-700 text-xs sm:text-sm space-y-2 leading-relaxed">
                <div className="flex items-center gap-2 font-medium text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Yêu cầu đã được tiếp nhận</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs">
                  <li>Liên kết có hiệu lực trong vòng <strong>30 phút</strong>.</li>
                  <li>Liên kết chỉ có thể sử dụng được <strong>một lần duy nhất</strong>.</li>
                  <li>Nếu không thấy trong Hộp thư đến, vui lòng kiểm tra thư mục <strong>Spam</strong> hoặc <strong>Rác</strong>.</li>
                </ul>
              </div>

              <div className="pt-2 space-y-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetForm}
                  className="w-full text-xs sm:text-sm"
                >
                  Gửi lại yêu cầu với email khác
                </Button>

                <Link
                  to="/auth/login"
                  className="w-full h-10.5 sm:h-11 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Quay lại Đăng nhập</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Trạng thái 2: Form nhập email */
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <Input
                label="Địa chỉ email tài khoản"
                type="email"
                placeholder="nhanvienkinhdoanh@loha.vn"
                autoComplete="email"
                required
                disabled={isSubmitting}
                leftIcon={<Mail className="w-4 h-4" />}
                error={errors.email?.message}
                {...register("email")}
              />

              <Button
                type="submit"
                isLoading={isSubmitting}
                loadingText="Đang gửi liên kết..."
                className="w-full mt-2"
              >
                Gửi liên kết đặt lại mật khẩu
              </Button>

              <div className="pt-2 text-center">
                <Link
                  to="/auth/login"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 hover:text-blue-600 font-medium transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại trang Đăng nhập</span>
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Footer ghi chú hệ thống */}
        <div className="mt-6 text-center text-xs text-slate-400">
          Hệ thống Bán hàng & Quản lý Kho — LOHA SALES
        </div>
      </div>
    </div>
  );
};
