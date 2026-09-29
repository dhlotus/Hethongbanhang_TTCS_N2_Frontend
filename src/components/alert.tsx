import React from "react";
import { AlertCircle, ShieldAlert, CheckCircle2 } from "lucide-react";

interface AlertProps {
  type?: "error" | "warning" | "success";
  title?: string;
  message: string;
}

/**
 * Component thông báo trạng thái Alert (Lỗi, Cảnh báo khóa, Thành công)
 */
export const Alert: React.FC<AlertProps> = ({ type = "error", title, message }) => {
  if (!message) return null;

  const config = {
    error: {
      wrapperClass: "bg-rose-50/80 border-rose-200/80 text-rose-900",
      icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />,
      defaultTitle: "Đăng nhập thất bại",
      textColor: "text-rose-700",
    },
    warning: {
      wrapperClass: "bg-amber-50/80 border-amber-200/80 text-amber-900",
      icon: <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
      defaultTitle: "Cảnh báo bảo mật",
      textColor: "text-amber-800",
    },
    success: {
      wrapperClass: "bg-emerald-50/80 border-emerald-200/80 text-emerald-900",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
      defaultTitle: "Thành công",
      textColor: "text-emerald-700",
    },
  }[type];

  return (
    <div
      role="alert"
      className={`p-3.5 sm:p-4 rounded-xl border text-sm flex items-start gap-3 shadow-xs transition-all animate-in fade-in duration-200 ${config.wrapperClass}`}
    >
      {config.icon}
      <div className="text-left flex-1">
        <strong className="block font-semibold mb-0.5">{title || config.defaultTitle}</strong>
        <p className={`text-xs sm:text-sm leading-relaxed ${config.textColor}`}>{message}</p>
      </div>
    </div>
  );
};
