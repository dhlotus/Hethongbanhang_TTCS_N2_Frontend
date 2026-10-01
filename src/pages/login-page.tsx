import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Layers,
  KeyRound,
  X,
  ShieldCheck,
} from "lucide-react";
import { Input } from "../components/input";
import { Button } from "../components/button";
import { Toast, type ToastType } from "../components/toast";
import { loginSchema, type LoginFormData } from "../utils/validation";
import { authService } from "../services/auth.service";
import { getRedirectPathByUser } from "../utils/navigation";
import { tokenStorage } from "../utils/token-storage";
import {
  SESSION_TIMEOUT_EVENT,
  SESSION_TIMEOUT_STORAGE_KEY,
  DEFAULT_SESSION_TIMEOUT_MESSAGE,
} from "../utils/session-timeout";
import loginPoster from "../assets/login-poster.jpg";

interface ToastState {
  type: ToastType;
  title: string;
  message: string;
}

/**
 * Trích xuất thông báo phiên hết hạn từ URL Search Param hoặc SessionStorage khi khởi tạo trang
 */
const getInitialSessionToast = (): ToastState | null => {
  if (typeof window === "undefined") return null;

  try {
    const searchParams = new URLSearchParams(window.location.search);
    const hasExpiredParam =
      searchParams.get("expired") === "1" ||
      searchParams.get("session_expired") === "1" ||
      searchParams.get("session_expired") === "true";

    const sessionExpiredMessage =
      sessionStorage.getItem(SESSION_TIMEOUT_STORAGE_KEY) ||
      (hasExpiredParam ? DEFAULT_SESSION_TIMEOUT_MESSAGE : null);

    if (sessionExpiredMessage) {
      sessionStorage.removeItem(SESSION_TIMEOUT_STORAGE_KEY);
      window.history.replaceState({}, document.title, window.location.pathname);

      const isLocked =
        sessionExpiredMessage.toLowerCase().includes("khóa") ||
        sessionExpiredMessage.toLowerCase().includes("khoá") ||
        sessionExpiredMessage.toLowerCase().includes("locked");

      return {
        type: isLocked ? "error" : "warning",
        title: isLocked ? "Tài khoản đã bị khóa" : "Phiên làm việc đã hết hạn",
        message: sessionExpiredMessage,
      };
    }
  } catch {
    // Bỏ qua lỗi trình duyệt
  }

  return null;
};

/**
 * Trang Đăng nhập LOHA SALES:
 * - Chuyển hướng thông minh sau đăng nhập dựa vào Role của người dùng
 * - Thông báo lỗi qua Toast nổi ở góc màn hình, tuyệt đối không chèn Alert làm vỡ form
 * - Thích ứng Responsive hoàn hảo trên mọi kích thước (Mobile, Tablet, Laptop, Desktop)
 */
export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(getInitialSessionToast);

  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Đăng nhập | LOHA SALES";

    // Nếu không có thông báo phiên hết hạn và người dùng đã đăng nhập hợp lệ
    if (!toast) {
      const token = tokenStorage.getAccessToken();
      const storedUser = tokenStorage.getUser();
      if (token && storedUser) {
        navigate(getRedirectPathByUser(storedUser), { replace: true });
      }
    }
  }, [navigate, toast]);

  // Lắng nghe sự kiện session-timeout phát ra từ Axios Interceptor khi đang ở trang Login
  useEffect(() => {
    const handleTimeoutEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      const msg = customEvent.detail?.message || DEFAULT_SESSION_TIMEOUT_MESSAGE;

      setToast({
        type: "warning",
        title: "Phiên làm việc đã hết hạn",
        message: msg,
      });
    };

    window.addEventListener(SESSION_TIMEOUT_EVENT, handleTimeoutEvent);
    return () => {
      window.removeEventListener(SESSION_TIMEOUT_EVENT, handleTimeoutEvent);
    };
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onTouched",
  });

  // Modal Đổi mật khẩu bằng mã cấp từ Admin
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState("");

  const handleResetWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");

    if (!resetIdentifier.trim()) {
      setResetError("Vui lòng nhập Tên đăng nhập hoặc Email");
      return;
    }
    if (!resetCode.trim()) {
      setResetError("Vui lòng nhập Mã cấp đổi mật khẩu (VD: LH-123456)");
      return;
    }
    if (resetNewPassword.length < 8) {
      setResetError("Mật khẩu mới phải có tối thiểu 8 ký tự");
      return;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(resetNewPassword)) {
      setResetError("Mật khẩu mới phải bao gồm cả chữ cái và chữ số");
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError("Xác nhận mật khẩu mới không trùng khớp");
      return;
    }

    try {
      setIsResetting(true);
      const res = await authService.resetPasswordWithCode({
        identifier: resetIdentifier,
        resetCode: resetCode,
        newPassword: resetNewPassword,
      });

      setResetModalOpen(false);
      setToast({
        type: "success",
        title: "Đổi mật khẩu thành công!",
        message: res.message || "Bạn có thể đăng nhập ngay với mật khẩu mới.",
      });
      setValue("email", resetIdentifier.trim());
      setValue("password", resetNewPassword);
    } catch (err: any) {
      setResetError(err.message || "Không thể đặt lại mật khẩu với mã này.");
    } finally {
      setIsResetting(false);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setToast(null);

    try {
      const response = await authService.login(data);

      // Lưu trữ Token an toàn qua tokenStorage (hỗ trợ cả access_token và refresh_token)
      tokenStorage.setTokens(response.accessToken, response.refreshToken);
      tokenStorage.setUser(response.user);

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

              <Link
                to="/auth/forgot-password"
                className="text-blue-600 hover:text-blue-700 font-medium hover:underline focus:outline-none transition-colors cursor-pointer"
              >
                Quên mật khẩu?
              </Link>
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

            {/* Tùy chọn đổi mật khẩu bằng mã cấp từ Admin */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setResetError("");
                  setResetModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline focus:outline-none transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Đổi mật khẩu bằng mã cấp từ Quản trị viên</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal Đổi mật khẩu bằng mã cấp từ Admin */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <button
              type="button"
              onClick={() => setResetModalOpen(false)}
              className="absolute top-4 right-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Đổi mật khẩu bằng mã cấp
                </h3>
                <p className="text-xs text-slate-500">
                  Nhập mã được Quản trị viên cấp để thiết lập mật khẩu mới
                </p>
              </div>
            </div>

            {resetError && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {resetError}
              </div>
            )}

            <form onSubmit={handleResetWithCode} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên đăng nhập hoặc Email công việc <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={resetIdentifier}
                  onChange={(e) => setResetIdentifier(e.target.value)}
                  placeholder="VD: sales_rep hoặc sales@loha.vn"
                  required
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã cấp đổi mật khẩu từ Admin <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.toUpperCase())}
                  placeholder="VD: LH-829401"
                  required
                  className="w-full font-mono font-bold tracking-wider rounded-xl border border-slate-200 px-3.5 py-2 text-sm uppercase focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Mã có định dạng LH-XXXXXX do Quản trị viên cấp trong mục Quản lý người dùng.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Tối thiểu 8 ký tự, có chữ và số"
                  required
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {isResetting ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
