import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
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
 * - Card Form độc lập, căn giữa trang trọng, chuẩn UI/UX Dashboard
 * - Độ rộng cân đối tối ưu (max-w-2xl mx-auto), không bị lệch hoặc để trống khoảng lớn
 * - Khi nhập sai mật khẩu cũ: Giữ nguyên màn hình, hiển thị lỗi chính xác, không bị out nhầm
 * - Khi đổi thành công: Hiển thị Modal đếm ngược 3 giây lịch sự trước khi đăng xuất an toàn
 */
export const ChangePasswordPage: React.FC = () => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [countdown, setCountdown] = useState(3);
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
    setError,
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

  // Bộ đếm ngược 3 giây khi đổi mật khẩu thành công
  useEffect(() => {
    if (!successModalOpen) return;

    if (countdown <= 0) {
      tokenStorage.clearAuthData();
      navigate("/auth/login", { replace: true });
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [successModalOpen, countdown, navigate]);

  const handleImmediateLoginRedirect = () => {
    tokenStorage.clearAuthData();
    navigate("/auth/login", { replace: true });
  };

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
      await authService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      // 1. Mở modal thông báo đếm ngược 3 giây lịch sự
      setSuccessModalOpen(true);
      setCountdown(3);
      reset();
    } catch (error: unknown) {
      const err = error as Error;
      const message =
        err.message || "Không thể đổi mật khẩu. Vui lòng kiểm tra lại thông tin!";

      // Nếu là lỗi sai mật khẩu hiện tại, đánh dấu lỗi đỏ ngay dưới ô nhập
      if (message.toLowerCase().includes("mật khẩu hiện tại")) {
        setError("currentPassword", {
          type: "manual",
          message,
        });
      }

      setToast({
        type: "error",
        title: "Đổi mật khẩu thất bại",
        message,
      });
    }
  };

  return (
    <div className="w-full max-w-[1520px] mx-auto py-2 sm:py-4 antialiased">
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

      {/* Modal thông báo đếm ngược 3 giây lịch sự khi đổi mật khẩu thành công */}
      {successModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-center space-y-5 animate-in zoom-in-95 duration-200">
              {/* Icon thành công với vòng tỏa ánh sáng */}
              <div className="relative mx-auto w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                <CheckCircle2 className="w-9 h-9 text-emerald-600 animate-in zoom-in-50 duration-300" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                </span>
              </div>

              {/* Tiêu đề & Thông báo lịch sự theo đúng yêu cầu */}
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  Đổi mật khẩu thành công!
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Mật khẩu đã thay đổi thành công. Hệ thống sẽ đăng xuất để đảm bảo an toàn sau{" "}
                  <span className="font-bold text-emerald-600 text-base">{countdown}s</span>
                </p>
              </div>

              {/* Thanh tiến trình đếm ngược 3s */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${(countdown / 3) * 100}%` }}
                />
              </div>

              {/* Nút hành động đăng nhập lại ngay */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleImmediateLoginRedirect}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-sm shadow-sm shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Đăng nhập lại ngay ({countdown}s)</span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Card Form Đổi mật khẩu độc lập, căn giữa trang trọng, chuẩn UI/UX */}
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.03)] p-6 sm:p-8 lg:p-10 transition-all">
          {/* Header Card */}
          <div className="flex items-start gap-4 mb-6 pb-6 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
              <KeyRound className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                Cập nhật mật khẩu tài khoản
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                Cập nhật mật khẩu mới định kỳ để bảo vệ an toàn cho tài khoản và dữ liệu kinh doanh của bạn.
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
              disabled={isSubmitting || successModalOpen}
              leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
              error={errors.currentPassword?.message}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  aria-label={showCurrentPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  disabled={isSubmitting || successModalOpen}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                disabled={isSubmitting || successModalOpen}
                leftIcon={<KeyRound className="w-4 h-4 text-slate-400" />}
                error={errors.newPassword?.message}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"}
                    disabled={isSubmitting || successModalOpen}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
              disabled={isSubmitting || successModalOpen}
              leftIcon={<ShieldCheck className="w-4 h-4 text-slate-400" />}
              error={errors.confirmPassword?.message}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Ẩn xác nhận mật khẩu" : "Hiện xác nhận mật khẩu"}
                  disabled={isSubmitting || successModalOpen}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              {...register("confirmPassword")}
            />

            {/* Hộp nhắc nhở an toàn */}
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-slate-600">
              <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                Sau khi đổi mật khẩu thành công, hệ thống sẽ đăng xuất để bạn đăng nhập lại với mật khẩu mới.
              </span>
            </div>

            {/* Hành động Submit & Hủy */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <Button
                type="submit"
                isLoading={isSubmitting || successModalOpen}
                loadingText={
                  successModalOpen ? "Đang xử lý..." : "Đang đổi mật khẩu..."
                }
                className="w-full sm:flex-1 h-11 text-sm font-semibold shadow-xs hover:shadow active:scale-[0.99]"
              >
                <span>Xác nhận đổi mật khẩu</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting || successModalOpen}
                onClick={() => reset()}
                className="w-full sm:w-32 h-11 text-sm font-medium border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                <span>Nhập lại</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
