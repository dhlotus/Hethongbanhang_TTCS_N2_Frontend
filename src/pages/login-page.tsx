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
import { Alert } from "../components/alert";
import { loginSchema, type LoginFormData } from "../utils/validation";
import { authService } from "../services/auth.service";
import loginPoster from "../assets/login-poster.jpg";

/**
 * Trang Đăng nhập LOHA SALES:
 * - Cột Trái: Poster hình ảnh phân phối & kho vận tinh tế, nhẹ nhàng, không cầu kỳ
 * - Cột Phải: Form đăng nhập chuẩn UI/UX, vừa vặn tuyệt đối 100% viewport, loại bỏ hoàn toàn thanh kéo
 * - Thích ứng responsive đa thiết bị
 */
export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isLocked, setIsLocked] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Đăng nhập | LOHA SALES";
  }, []);

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
    setErrorMessage("");
    setIsLocked(false);

    try {
      const response = await authService.login(data);

      localStorage.setItem("auth_token", response.accessToken);
      localStorage.setItem("auth_user", JSON.stringify(response.user));

      navigate("/", { replace: true });
    } catch (error: unknown) {
      const err = error as Error;
      const message = err.message || "Tài khoản hoặc mật khẩu không chính xác";
      setErrorMessage(message);

      if (
        message.toLowerCase().includes("khóa tạm thời") ||
        message.toLowerCase().includes("15 phút") ||
        message.toLowerCase().includes("tạm khóa")
      ) {
        setIsLocked(true);
      }
    }
  };

  return (
    <div className="w-full h-screen max-h-screen overflow-hidden flex bg-slate-50 text-slate-800 antialiased">
      {/* ========================================================================= */}
      {/* CỘT TRÁI: Poster Hình Ảnh Tinh Tế, Nhẹ Nhàng, Không Cầu Kỳ                 */}
      {/* ========================================================================= */}
      <section className="relative hidden lg:flex lg:w-1/2 xl:w-5/12 h-full p-4 lg:p-6 xl:p-8 shrink-0">
        <div className="relative w-full h-full rounded-2xl xl:rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs bg-slate-100 flex flex-col justify-between">
          <img
            src={loginPoster}
            alt="LOHA SALES - Hệ thống Quản lý Bán hàng & Kho B2B"
            className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
          />

          {/* Lớp phủ gradient mờ nhẹ ở trên và dưới để tăng độ tương phản và sang trọng */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-transparent to-slate-900/30 pointer-events-none"
          />

          {/* Badge nhận diện thương hiệu tinh tế ở góc trên */}
          <div className="relative z-10 p-5 sm:p-6 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white shadow-md flex items-center justify-center">
              <Layers className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-base font-bold text-white block leading-tight tracking-tight drop-shadow-xs">
                LOHA SALES
              </span>
              <span className="text-[10px] text-blue-100/90 font-medium block drop-shadow-xs">
                Hệ thống Quản lý Bán hàng & Kho B2B
              </span>
            </div>
          </div>

          {/* Tagline nhẹ nhàng ở đáy poster */}
          <div className="relative z-10 p-5 sm:p-6 text-[11px] text-white/80 font-medium drop-shadow-xs">
            Vận hành phân phối & kho vận thông minh
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CỘT PHẢI: Form Đăng Nhập Chuẩn UI/UX, Vừa Vặn Không Scrollbar             */}
      {/* ========================================================================= */}
      <section className="relative flex-1 h-full flex flex-col justify-center items-center p-4 sm:p-6 overflow-y-auto lg:overflow-hidden">
        {/* Card Form Đăng nhập */}
        <div className="relative w-full max-w-[380px] bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_24px_rgb(0,0,0,0.03)] p-6 sm:p-7">
          {/* Header Card */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 mb-2.5 shadow-2xs">
              <Layers className="w-5 h-5 text-blue-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Đăng nhập
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Nhập email và mật khẩu của bạn để tiếp tục
            </p>
          </div>

          {/* Thông báo lỗi / Khóa tài khoản */}
          {errorMessage && (
            <div className="mb-4">
              <Alert
                type={isLocked ? "warning" : "error"}
                title={isLocked ? "Cảnh báo bảo mật" : "Đăng nhập thất bại"}
                message={errorMessage}
              />
            </div>
          )}

          {/* Form đăng nhập */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3.5">
            {/* Input Email */}
            <Input
              label="Email"
              type="email"
              placeholder="nhap.email@loha.vn"
              autoComplete="email"
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
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  disabled={isSubmitting}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
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
      </section>
    </div>
  );
};
