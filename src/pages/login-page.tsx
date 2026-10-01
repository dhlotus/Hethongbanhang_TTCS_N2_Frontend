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
} from "lucide-react";
import { Input } from "../components/input";
import { Button } from "../components/button";
import { Toast, type ToastType } from "../components/toast";
import { AccountLockedModal } from "../components/account-locked-modal";
import { loginSchema, type LoginFormData } from "../utils/validation";
import { authService, AccountLockedError } from "../services/auth.service";
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

interface LockedModalState {
  isOpen: boolean;
  reason?: string;
  message?: string;
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
      const isLocked =
        sessionExpiredMessage.toLowerCase().includes("khóa") ||
        sessionExpiredMessage.toLowerCase().includes("khoá") ||
        sessionExpiredMessage.toLowerCase().includes("locked");

      // Nếu là thông báo khóa tài khoản, nhường việc hiển thị cho AccountLockedModal
      if (isLocked) {
        return null;
      }

      sessionStorage.removeItem(SESSION_TIMEOUT_STORAGE_KEY);
      window.history.replaceState({}, document.title, window.location.pathname);

      return {
        type: "warning",
        title: "Phiên làm việc đã hết hạn",
        message: sessionExpiredMessage,
      };
    }
  } catch {
    // Bỏ qua lỗi trình duyệt
  }

  return null;
};

/**
 * Trích xuất trạng thái khóa tài khoản nếu session bị thu hồi do khóa tài khoản
 */
const getInitialLockedModal = (): LockedModalState | null => {
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
      const isLocked =
        sessionExpiredMessage.toLowerCase().includes("khóa") ||
        sessionExpiredMessage.toLowerCase().includes("khoá") ||
        sessionExpiredMessage.toLowerCase().includes("locked");

      if (isLocked) {
        sessionStorage.removeItem(SESSION_TIMEOUT_STORAGE_KEY);
        window.history.replaceState({}, document.title, window.location.pathname);

        const reason = sessionExpiredMessage.includes("Lý do:")
          ? sessionExpiredMessage.split("Lý do:")[1]?.split(".")[0]?.trim()
          : undefined;

        return {
          isOpen: true,
          reason,
          message: sessionExpiredMessage,
        };
      }
    }
  } catch {
    // Bỏ qua lỗi trình duyệt
  }

  return null;
};

/**
 * Trang Đăng nhập LOHA SALES:
 * - Chuyển hướng thông minh sau đăng nhập dựa vào Role của người dùng
 * - Thông báo lỗi qua Toast nổi ở góc màn hình hoặc Popup Modal khi tài khoản bị khóa
 * - Thích ứng Responsive hoàn hảo trên mọi kích thước (Mobile, Tablet, Laptop, Desktop)
 */
export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(getInitialSessionToast);
  const [lockedModal, setLockedModal] = useState<LockedModalState | null>(getInitialLockedModal);

  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Đăng nhập | LOHA SALES";

    // Nếu không có thông báo phiên hết hạn và người dùng đã đăng nhập hợp lệ
    if (!toast && !lockedModal?.isOpen) {
      const token = tokenStorage.getAccessToken();
      const storedUser = tokenStorage.getUser();
      if (token && storedUser) {
        navigate(getRedirectPathByUser(storedUser), { replace: true });
      }
    }
  }, [navigate, toast, lockedModal]);

  // Lắng nghe sự kiện session-timeout phát ra từ Axios Interceptor khi đang ở trang Login
  useEffect(() => {
    const handleTimeoutEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      const msg = customEvent.detail?.message || DEFAULT_SESSION_TIMEOUT_MESSAGE;
      const lower = msg.toLowerCase();
      const isLocked =
        lower.includes("khóa") || lower.includes("khoá") || lower.includes("locked");

      if (isLocked) {
        const reason = msg.includes("Lý do:")
          ? msg.split("Lý do:")[1]?.split(".")[0]?.trim()
          : undefined;

        setLockedModal({
          isOpen: true,
          reason,
          message: msg,
        });
      } else {
        setToast({
          type: "warning",
          title: "Phiên làm việc đã hết hạn",
          message: msg,
        });
      }
    };

    window.addEventListener(SESSION_TIMEOUT_EVENT, handleTimeoutEvent);
    return () => {
      window.removeEventListener(SESSION_TIMEOUT_EVENT, handleTimeoutEvent);
    };
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
      const err = error as Error & {
        isLocked?: boolean;
        isAdminLocked?: boolean;
        isTemporaryLocked?: boolean;
        lockReason?: string;
      };

      const message = err.message || "Tài khoản hoặc mật khẩu không chính xác";
      const normalizedMsg = (message + " " + (err.lockReason || "")).normalize("NFC").toLowerCase();

      // Kiểm tra tài khoản bị khóa bởi Quản trị viên
      const isAccountLocked =
        err instanceof AccountLockedError ||
        Boolean(err.isLocked) ||
        Boolean(err.isAdminLocked) ||
        normalizedMsg.includes("quản trị viên khóa") ||
        normalizedMsg.includes("quản trị viên khoá") ||
        normalizedMsg.includes("tài khoản đã bị") ||
        normalizedMsg.includes("đã bị khóa") ||
        normalizedMsg.includes("đã bị khoá");

      // Kiểm tra khóa tạm thời do sai mật khẩu 5 lần
      const isTemporaryLock =
        Boolean(err.isTemporaryLocked) ||
        normalizedMsg.includes("khóa tạm thời") ||
        normalizedMsg.includes("khoá tạm thời") ||
        normalizedMsg.includes("tạm khóa") ||
        normalizedMsg.includes("tạm khoá") ||
        normalizedMsg.includes("15 phút");

      if (isAccountLocked && !isTemporaryLock) {
        let reason = err.lockReason;
        if (!reason && message.includes("Lý do:")) {
          reason = message.split("Lý do:")[1]?.split(".")[0]?.trim();
        }

        // Bật popup hiển thị tài khoản bị khóa chuẩn SN-15
        setLockedModal({
          isOpen: true,
          reason: reason || "Tài khoản hiện đang bị tạm khóa theo quyết định của Quản trị viên hệ thống.",
          message,
        });
        return;
      }

      if (isTemporaryLock) {
        setToast({
          type: "warning",
          title: "Cảnh báo bảo mật",
          message: "Tài khoản bị khóa tạm thời 15 phút do nhập sai mật khẩu quá 5 lần liên tiếp.",
        });
        return;
      }

      setToast({
        type: "error",
        title: "Đăng nhập thất bại",
        message: message || "Tài khoản hoặc mật khẩu không chính xác",
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

      {/* Modal popup cảnh báo tài khoản bị khóa */}
      {lockedModal?.isOpen && (
        <AccountLockedModal
          isOpen={lockedModal.isOpen}
          reason={lockedModal.reason}
          message={lockedModal.message}
          onClose={() => setLockedModal(null)}
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
          </form>
        </div>
      </div>
    </div>
  );
};
