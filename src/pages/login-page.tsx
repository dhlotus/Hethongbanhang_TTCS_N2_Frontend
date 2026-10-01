import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Layers,
} from "lucide-react";
import { Input } from "../components/input";
import { Button } from "../components/button";
import { Toast, type ToastType } from "../components/toast";
import { loginSchema, type LoginFormData } from "../utils/validation";
import { authService } from "../services/auth.service";
import { getRedirectPathByUser } from "../utils/navigation";
import loginPoster from "../assets/login-poster.jpg";

/**
 * Trang Đăng nhập LOHA SALES:
 * - Chuyển hướng thông minh sau đăng nhập dựa vào Role của người dùng
 * - Thông báo lỗi qua Toast nổi ở góc màn hình, tuyệt đối không chèn Alert làm vỡ form
 * - Thích ứng Responsive hoàn hảo trên mọi kích thước (Mobile, Tablet, Laptop, Desktop)
 */
export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState<{
    type: ToastType;
    title: string;
    message: string;
  } | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Đăng nhập | LOHA SALES";

    // Nếu đã đăng nhập trước đó, tự động chuyển về trang tương ứng với vai trò
    const token = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("auth_user");
    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        navigate(getRedirectPathByUser(user), { replace: true });
      } catch {
        // bỏ qua lỗi parse json nếu có
      }
    }
  }, [navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onTouched",
  });

  const onSubmit = async (data: LoginFormData) => {
    setToast(null);

    try {
      const response = await authService.login(data);

      // Lưu trữ Token an toàn vào localStorage (Hỗ trợ access_token và refresh_token)
      localStorage.setItem("auth_token", response.accessToken);
      localStorage.setItem("access_token", response.accessToken);
      if (response.refreshToken) {
        localStorage.setItem("refresh_token", response.refreshToken);
      }
      localStorage.setItem("auth_user", JSON.stringify(response.user));

      // Chuyển hướng mượt mà về đúng route ứng với vai trò của user
      const targetPath = getRedirectPathByUser(response.user);
      navigate(targetPath, { replace: true });
    } catch (error: unknown) {
      const err = error as Error;
      const message = err.message || "Tài khoản hoặc mật khẩu không chính xác";

      const isLock =
        message.toLowerCase().includes("khóa tạm thời") ||
        message.toLowerCase().includes("15 phút") ||
        message.toLowerCase().includes("tạm khóa");

      setToast({
        type: isLock ? "warning" : "error",
        title: isLock ? "Cảnh báo bảo mật" : "Đăng nhập thất bại",
        message,
      });
    }
  };

  return (
    <div className="w-full min-h-screen lg:h-screen flex items-center justify-center p-3 sm:p-4 lg:p-6 bg-slate-50 text-slate-800 antialiased overflow-hidden">
      {/* Toast thông báo lỗi / cảnh báo nổi, không chiếm diện tích form */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* CONTAINER CHÍNH: Dùng đơn vị tương đối (82vh, max 560px) luôn vừa khít     */}
      {/* ========================================================================= */}
      <div className="w-full max-w-md lg:max-w-4xl xl:max-w-5xl lg:h-[82vh] lg:max-h-[560px] bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden grid grid-cols-1 lg:grid-cols-2 my-auto">
        {/* ===================================================================== */}
        {/* CỘT TRÁI: Poster (Chiếm chính xác 50% chiều rộng & 100% chiều cao)     */}
        {/* ===================================================================== */}
        <div className="relative hidden lg:block w-full h-full bg-slate-100 select-none">
          <img
            src={loginPoster}
            alt="LOHA SALES - Hệ thống Quản lý Bán hàng & Kho B2B"
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
          />

          {/* Lớp phủ gradient mờ nhẹ để tôn logo và chữ */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-transparent to-slate-900/35 pointer-events-none"
          />

          {/* Badge thương hiệu góc trên */}
          <div className="relative z-10 p-5 xl:p-6 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white shadow-md flex items-center justify-center">
              <Layers className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-base font-bold text-white block leading-tight tracking-tight drop-shadow-xs">
                LOHA SALES
              </span>
              <span className="text-[10px] text-blue-100 font-medium block drop-shadow-xs">
                Hệ thống Quản lý Bán hàng & Kho B2B
              </span>
            </div>
          </div>

          {/* Tagline góc dưới */}
          <div className="absolute bottom-0 inset-x-0 p-5 xl:p-6 text-[11px] text-white/90 font-medium drop-shadow-xs z-10">
            Vận hành phân phối & kho vận thông minh
          </div>
        </div>

        {/* ===================================================================== */}
        {/* CỘT PHẢI: Form Đăng Nhập (Cân xứng tuyệt đối với cột Poster)           */}
        {/* ===================================================================== */}
        <div className="w-full h-full flex flex-col justify-center p-6 sm:p-8 lg:p-8 xl:p-10 bg-white overflow-y-auto">
          {/* Header Card */}
          <div className="text-center mb-4 sm:mb-5">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 mb-2 shadow-2xs">
              <Layers className="w-5 h-5 text-blue-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Đăng nhập
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Nhập email và mật khẩu của bạn để tiếp tục
            </p>
          </div>

          {/* Form đăng nhập */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3 sm:space-y-3.5">
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
              {...register("email")}
            />

            {/* Input Mật khẩu */}
            <Input
              label="Mật khẩu"
              type={showPassword ? "text" : "password"}
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
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  disabled={isSubmitting}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
              {...register("password")}
            />

            {/* Tùy chọn Ghi nhớ & Quên mật khẩu */}
            <div className="flex items-center justify-between text-xs sm:text-sm pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  disabled={isSubmitting}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>

              <button
                type="button"
                disabled={isSubmitting}
                className="text-blue-600 hover:text-blue-700 font-medium hover:underline focus:outline-none transition-colors cursor-pointer"
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Nút Submit */}
            <Button
              type="submit"
              isLoading={isSubmitting}
              loadingText="Đang xác thực..."
              className="mt-1 group shadow-2xs hover:shadow-xs active:scale-[0.99] transition-all"
            >
              <span>Đăng nhập</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
