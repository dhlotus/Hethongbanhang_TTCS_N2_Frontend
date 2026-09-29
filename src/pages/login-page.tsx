import React, { useState } from "react";
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
  PackageCheck,
  WalletCards,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { Input } from "../components/input";
import { Button } from "../components/button";
import { Alert } from "../components/alert";
import { loginSchema, type LoginFormData } from "../utils/validation";
import { authService } from "../services/auth.service";

interface DemoRole {
  badge: string;
  roleTitle: string;
  email: string;
  dotColor: string;
}

const DEMO_ROLES: DemoRole[] = [
  { badge: "Admin", roleTitle: "Quản trị viên", email: "admin@system.local", dotColor: "bg-purple-500" },
  { badge: "NV Sale", roleTitle: "Kinh doanh", email: "sales@system.local", dotColor: "bg-blue-500" },
  { badge: "Thủ kho", roleTitle: "Quản lý kho", email: "warehouse@system.local", dotColor: "bg-amber-500" },
  { badge: "Kế toán", roleTitle: "Kế toán", email: "accountant@system.local", dotColor: "bg-emerald-500" },
  { badge: "Khách hàng", roleTitle: "Đại lý B2B", email: "customer@gmail.com", dotColor: "bg-sky-500" },
];

/**
 * Trang Đăng nhập LOHA SALES:
 * - Cột Trái (55%): Tinh gọn, sang trọng, tập trung vào giá trị cốt lõi
 * - Cột Phải (45%): Form đăng nhập hiện đại chuẩn UI/UX Senior Frontend Developer
 * - Chuẩn Responsive Mobile-first: < lg tự động ẩn cột trái, giữ trải nghiệm mượt mà trên mobile
 */
export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isLocked, setIsLocked] = useState(false);

  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
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

  const handleSelectDemoRole = (email: string) => {
    setValue("email", email, { shouldValidate: true });
    setValue("password", "123456", { shouldValidate: true });
    clearErrors();
    setErrorMessage("");
    setIsLocked(false);
  };

  return (
    <div className="w-full min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row antialiased bg-slate-50">
      {/* ========================================================================= */}
      {/* CỘT TRÁI (Brand Showcase & Value Proposition) - Tinh tế, không rườm rà     */}
      {/* ========================================================================= */}
      <section className="relative hidden lg:flex lg:w-[55%] bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-12 xl:p-16 2xl:p-20 flex-col justify-between overflow-hidden text-white select-none">
        {/* Họa tiết chấm bi mờ tinh tế */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.035] pointer-events-none bg-[radial-gradient(#ffffff_1.2px,transparent_1.2px)] [background-size:24px_24px]"
        />

        {/* Ánh sáng gradient dịu nhẹ ở các góc tạo chiều sâu thị giác */}
        <div
          aria-hidden="true"
          className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"
        />

        {/* 1. Header Thương hiệu (Gọn gàng, loại bỏ badge phiên bản thừa) */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-500/25 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white block leading-tight">
                LOHA SALES
              </span>
              <span className="text-[11px] font-semibold text-blue-300 uppercase tracking-widest block">
                Enterprise B2B OMS
              </span>
            </div>
          </div>
        </div>

        {/* 2. Nội dung chính: Tiêu đề, Mô tả và 3 Điểm nhấn giá trị tinh tế */}
        <div className="relative z-10 my-auto py-6 max-w-lg">
          <h2 className="text-2xl xl:text-3xl 2xl:text-4xl font-extrabold text-white tracking-tight leading-snug mb-4">
            Nền tảng quản lý phân phối & kho vận B2B thông minh.
          </h2>

          <p className="text-slate-300 text-sm xl:text-base leading-relaxed mb-9">
            Tối ưu hóa toàn diện chu trình bán hàng doanh nghiệp: tự động áp giá chiết khấu, kiểm soát hạn mức công nợ và xuất kho chính xác từng lô hàng.
          </p>

          {/* 3 Dòng tính năng thanh thoát, khoảng cách thoáng, bố cục cao cấp */}
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-400/20 flex items-center justify-center shrink-0 mt-0.5">
                <PackageCheck className="w-4.5 h-4.5" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-white">Quản lý tồn kho real-time</h3>
                <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                  Kiểm soát tồn khả dụng tức thời, xuất hàng chuẩn FEFO, chấm dứt hoàn toàn sai lệch số liệu.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-400/20 flex items-center justify-center shrink-0 mt-0.5">
                <WalletCards className="w-4.5 h-4.5" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-white">Kiểm soát công nợ thông minh</h3>
                <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                  Cảnh báo hạn mức nợ và tuổi nợ theo thời gian thực, tự động chặn đơn khi quá hạn.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-400/20 flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="w-4.5 h-4.5" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-white">Duyệt đơn đa kênh tức thì</h3>
                <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                  Phân quyền 7 vai trò chặt chẽ, phê duyệt giá sàn và ngoại lệ nhanh chóng trên di động.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Footer Cột Trái: Đã loại bỏ dòng chữ "Hệ thống phân phối & kho vận thế hệ mới", chỉ giữ huy hiệu bảo mật */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-end text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-blue-200/90 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Bảo mật & Chuẩn hóa dữ liệu</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CỘT PHẢI (Form Đăng nhập Chuẩn UI/UX Senior Frontend Developer)           */}
      {/* ========================================================================= */}
      <section className="relative w-full lg:w-[45%] flex-1 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 overflow-y-auto bg-slate-50/50">
        {/* Họa tiết nền grid mờ tinh tế tạo chiều sâu cho Cột Phải */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-35"
        />

        {/* Card Form Đăng nhập: Thiết kế tinh xảo, bo góc rounded-2xl, đổ bóng đa tầng mềm mại */}
        <div className="relative w-full max-w-[420px] bg-white rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:shadow-[0_12px_40px_rgb(0,0,0,0.06)] p-6 sm:p-9 my-auto">
          {/* Header Card: Icon nhận diện thương hiệu + Tiêu đề căn giữa sang trọng */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100/80 text-blue-600 mb-3.5 shadow-xs">
              <Layers className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Hệ thống quản lý LOHA SALES
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1.5 font-normal">
              Đăng nhập để tiếp tục làm việc
            </p>
          </div>

          {/* Thông báo lỗi / Khóa tài khoản */}
          {errorMessage && (
            <div className="mb-5">
              <Alert
                type={isLocked ? "warning" : "error"}
                title={isLocked ? "Cảnh báo bảo mật" : "Đăng nhập thất bại"}
                message={errorMessage}
              />
            </div>
          )}

          {/* Form đăng nhập */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Input Email / Tên đăng nhập */}
            <Input
              label="Email / Tên đăng nhập"
              type="email"
              placeholder="admin@system.local hoặc email của bạn"
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
              placeholder="Nhập mật khẩu của bạn"
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

            {/* Dòng tùy chọn: Ghi nhớ đăng nhập & Quên mật khẩu */}
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

            {/* Nút Submit Đăng nhập */}
            <Button
              type="submit"
              isLoading={isSubmitting}
              loadingText="Đang xác thực..."
              className="mt-2 group shadow-sm hover:shadow-md hover:shadow-blue-500/20 active:scale-[0.99] transition-all"
            >
              <span>Đăng nhập</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </form>

          {/* Phân cách và Khu vực Đăng nhập nhanh tài khoản mẫu */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
                ⚡ Tài khoản demo:
              </span>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                Pass: 123456
              </span>
            </div>

            {/* Danh sách vai trò thiết kế dạng Chips tương tác hiện đại */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEMO_ROLES.map((role) => (
                <button
                  key={role.badge}
                  type="button"
                  onClick={() => handleSelectDemoRole(role.email)}
                  disabled={isSubmitting}
                  title={`${role.roleTitle} (${role.email})`}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-blue-50/80 hover:border-blue-300 active:bg-blue-100/70 transition-all text-xs font-medium text-slate-700 hover:text-blue-700 cursor-pointer group text-left"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${role.dotColor}`} />
                  <span className="truncate">{role.badge}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer Card: Bảo mật tiêu chuẩn */}
          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>LOHA SALES · Bảo mật tiêu chuẩn JWT</span>
          </div>
        </div>
      </section>
    </div>
  );
};
