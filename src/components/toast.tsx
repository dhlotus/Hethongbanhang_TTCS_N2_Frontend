import React, { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export type ToastType = "error" | "warning" | "success" | "info";

export interface ToastProps {
  type?: ToastType;
  title?: string;
  message: string;
  onClose: () => void;
  duration?: number;
}

const ICONS = {
  error: AlertCircle,
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info,
};

const STYLES = {
  error: {
    iconBg: "bg-rose-50 text-rose-600 border-rose-100",
    barBg: "bg-rose-500",
    defaultTitle: "Đăng nhập thất bại",
  },
  warning: {
    iconBg: "bg-amber-50 text-amber-600 border-amber-100",
    barBg: "bg-amber-500",
    defaultTitle: "Cảnh báo bảo mật",
  },
  success: {
    iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
    barBg: "bg-emerald-500",
    defaultTitle: "Thành công",
  },
  info: {
    iconBg: "bg-blue-50 text-blue-600 border-blue-100",
    barBg: "bg-blue-500",
    defaultTitle: "Thông báo",
  },
};

/**
 * Toast Component hiển thị thông báo nổi ở góc màn hình:
 * - Không chiếm dụng không gian trong Form, giữ layout ổn định tuyệt đối
 * - Tự động biến mất sau một khoảng thời gian (default: 4000ms)
 * - Tương thích mượt mà trên cả Mobile và Desktop
 */
export const Toast: React.FC<ToastProps> = ({
  type = "error",
  title,
  message,
  onClose,
  duration = 4000,
}) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 250);
  };

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => {
      handleClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  const IconComponent = ICONS[type];
  const style = STYLES[type];
  const displayTitle = title || style.defaultTitle;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-4 right-4 sm:top-6 sm:right-6 z-[9999] w-[calc(100%-2rem)] max-w-sm sm:max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-[0_12px_40px_rgba(0,0,0,0.12)] p-4 flex items-start gap-3.5 transition-all ${
        isClosing ? "animate-toast-out" : "animate-toast-in"
      }`}
    >
      {/* Icon trạng thái */}
      <div
        className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${style.iconBg}`}
      >
        <IconComponent className="w-5 h-5" />
      </div>

      {/* Nội dung thông báo */}
      <div className="flex-1 min-w-0 text-left pr-1">
        <h4 className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
          {displayTitle}
        </h4>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
          {message}
        </p>
      </div>

      {/* Nút đóng */}
      <button
        type="button"
        onClick={handleClose}
        aria-label="Đóng thông báo"
        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

