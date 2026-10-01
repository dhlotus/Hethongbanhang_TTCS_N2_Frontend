import React, { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Check,
  Circle,
  ArrowLeft,
  ShieldAlert,
} from "lucide-react";
import { Input } from "../components/input";
import { Button } from "../components/button";
import { Toast, type ToastType } from "../components/toast";
import {
  changePasswordSchema,
  type ChangePasswordFormData,
} from "../utils/validation";
import { authService } from "../services/auth.service";
import { tokenStorage } from "../utils/token-storage";

interface ToastState {
  type: ToastType;
  title: string;
  message: string;
}

/**
 * Trang Đổi mật khẩu (Change Password Page):
 * - Tuân thủ nghiêm ngặt chuẩn thiết kế UI_GUIDELINES.md & CODE_CONVENTION.md
 * - Card Form hiện đại, gọn gàng, hiệu ứng chuyển động mượt mà
 * - Đầy đủ 3 trường: Mật khẩu hiện tại, Mật khẩu mới, Xác nhận mật khẩu mới
 * - Gợi ý độ mạnh mật khẩu trực quan theo thời gian thực (Realtime Password Strength)
 * - Tự động xóa token và chuyển hướng về /auth/login sau khi đổi thành công
 */
export const ChangePasswordPage: React.FC = () => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccessRedirecting, setIsSuccessRedirecting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Đổi mật khẩu | LOHA SALES";
  }, []);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const watchNewPassword = useWatch({ control, name: "newPassword" }) || "";

  // Tính toán độ mạnh mật khẩu và danh sách tiêu chí
  const passwordCriteria = [
    {
      id: "length",
      label: "Tối thiểu 8 ký tự",
      met: watchNewPassword.length >= 8,
    },
    {
      id: "letter",
      label: "Chứa chữ cái (a-z, A-Z)",
      met: /[A-Za-z]/.test(watchNewPassword),
    },
    {
      id: "number",
      label: "Chứa chữ số (0-9)",
      met: /\d/.test(watchNewPassword),
    },
  ];

  const metCount = passwordCriteria.filter((c) => c.met).length;

  let strengthLabel = "Chưa nhập";
  let strengthColor = "bg-slate-200";
  let strengthTextColor = "text-slate-400";

  if (watchNewPassword.length > 0) {
    if (metCount === 1) {
      strengthLabel = "Yếu";
      strengthColor = "bg-rose-500";
      strengthTextColor = "text-rose-600";
    } else if (metCount === 2) {
      strengthLabel = "Trung bình";
      strengthColor = "bg-amber-500";
      strengthTextColor = "text-amber-600";
    } else if (metCount === 3) {
      strengthLabel = "Mạnh";
      strengthColor = "bg-emerald-500";
      strengthTextColor = "text-emerald-600";
    }
  }

  const onSubmit = async (data: ChangePasswordFormData) => {
    setToast(null);

    try {
      const response = await authService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      // 1. Hiển thị Toast thông báo thành công xanh mát
      setToast({
        type: "success",
        title: "Thành công",
        message:
          response.message ||
          "Đổi mật khẩu thành công! Vui lòng đăng nhập lại.",
      });

      setIsSuccessRedirecting(true);
      reset();

      // 2. Dọn sạch toàn bộ Token & User Info trong localStorage
      tokenStorage.clearAuthData();

      // 3. Tự động chuyển hướng về trang /auth/login sau 1.8 giây
      setTimeout(() => {
        navigate("/auth/login", { replace: true });
      }, 1800);
    } catch (error: unknown) {
      const err = error as Error;
      setToast({
        type: "error",
        title: "Đổi mật khẩu thất bại",
        message:
          err.message ||
          "Không thể đổi mật khẩu. Vui lòng kiểm tra lại thông tin!",
      });
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full py-6 sm:py-8 lg:py-10 px-4 sm:px-6 flex flex-col justify-center items-center antialiased">
      {/* Toast thông báo nổi ở góc phải trên màn hình */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
          duration={toast.type === "success" ? 3000 : 4000}
        />
      )}

      <div className="w-full max-w-xl mx-auto space-y-4">
        {/* Nút Quay lại / Breadcrumb */}
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={isSubmitting || isSuccessRedirecting}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors focus:outline-none cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>

          <span className="text-xs text-slate-400 font-medium">
            Cài đặt bảo mật
          </span>
        </div>

        {/* Card Form Đổi Mật Khẩu */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.03)] p-6 sm:p-8 lg:p-10">
          {/* Header Card */}
          <div className="flex items-start gap-4 mb-6 pb-6 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
              <KeyRound className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                Đổi mật khẩu
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                Cập nhật mật khẩu mới định kỳ để bảo vệ tài khoản và dữ liệu kinh
                doanh của bạn.
              </p>
            </div>
          </div>

          {/* Form đổi mật khẩu */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 sm:space-y-5">
            {/* 1. Mật khẩu hiện tại */}
            <Input
              label="Mật khẩu hiện tại"
              type={showCurrentPassword ? "text" : "password"}
              placeholder="Nhập mật khẩu đang sử dụng"
              autoComplete="current-password"
              required
              disabled={isSubmitting || isSuccessRedirecting}
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.currentPassword?.message}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  aria-label={
                    showCurrentPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                  }
                  disabled={isSubmitting || isSuccessRedirecting}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
              {...register("currentPassword")}
            />

            {/* 2. Mật khẩu mới */}
            <div className="space-y-2">
              <Input
                label="Mật khẩu mới"
                type={showNewPassword ? "text" : "password"}
                placeholder="Tối thiểu 8 ký tự (chữ cái & chữ số)"
                autoComplete="new-password"
                required
                disabled={isSubmitting || isSuccessRedirecting}
                leftIcon={<KeyRound className="w-4 h-4" />}
                error={errors.newPassword?.message}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={
                      showNewPassword ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"
                    }
                    disabled={isSubmitting || isSuccessRedirecting}
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

              {/* Thanh gợi ý độ mạnh mật khẩu (Password Strength Indicator) */}
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Độ mạnh mật khẩu:</span>
                  <span className={`font-bold ${strengthTextColor}`}>
                    {strengthLabel}
                  </span>
                </div>

                {/* 3 vạch tiến độ */}
                <div className="grid grid-cols-3 gap-1.5 h-1.5">
                  <div
                    className={`rounded-full transition-colors duration-300 ${
                      metCount >= 1 ? strengthColor : "bg-slate-200"
                    }`}
                  />
                  <div
                    className={`rounded-full transition-colors duration-300 ${
                      metCount >= 2 ? strengthColor : "bg-slate-200"
                    }`}
                  />
                  <div
                    className={`rounded-full transition-colors duration-300 ${
                      metCount >= 3 ? strengthColor : "bg-slate-200"
                    }`}
                  />
                </div>

                {/* Danh sách tiêu chí trực quan */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-1 text-[11px]">
                  {passwordCriteria.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-1.5 font-medium transition-colors ${
                        item.met ? "text-emerald-700" : "text-slate-400"
                      }`}
                    >
                      {item.met ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Xác nhận mật khẩu mới */}
            <Input
              label="Xác nhận mật khẩu mới"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Nhập lại mật khẩu mới"
              autoComplete="new-password"
              required
              disabled={isSubmitting || isSuccessRedirecting}
              leftIcon={<ShieldCheck className="w-4 h-4" />}
              error={errors.confirmPassword?.message}
              rightElement={
                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Ẩn xác nhận mật khẩu"
                      : "Hiện xác nhận mật khẩu"
                  }
                  disabled={isSubmitting || isSuccessRedirecting}
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

            {/* Hộp nhắc nhở an toàn */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-slate-600">
              <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Sau khi đổi mật khẩu thành công, hệ thống sẽ đăng xuất để bạn đăng nhập lại với mật khẩu mới.
              </span>
            </div>

            {/* Hành động Submit & Hủy */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Button
                type="submit"
                isLoading={isSubmitting || isSuccessRedirecting}
                loadingText={
                  isSuccessRedirecting
                    ? "Đang chuyển hướng..."
                    : "Đang đổi mật khẩu..."
                }
                className="flex-1 shadow-2xs hover:shadow-xs active:scale-[0.99]"
              >
                <span>Đổi mật khẩu</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting || isSuccessRedirecting}
                onClick={() => navigate(-1)}
                className="sm:w-32"
              >
                <span>Hủy</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
