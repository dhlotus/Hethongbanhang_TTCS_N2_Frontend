import React from 'react';
import { AlertCircle, ShieldAlert, CheckCircle2, Info, X } from 'lucide-react';

export type AlertType = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  type?: AlertType;
  title?: string;
  message?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

/**
 * Component Alert chuẩn LOHA SALES (UI_GUIDELINES Section 34)
 * - 4 trạng thái: info, success, warning, error
 * - Icon tương ứng, tiêu đề in đậm, nội dung rõ ràng
 * - Hỗ trợ nút hành động (action) và nút đóng (onClose)
 */
export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  message,
  children,
  action,
  onClose,
  className = '',
}) => {
  const content = children || message;
  if (!content && !title) return null;

  const config = {
    info: {
      wrapperClass: 'bg-sky-50/90 border-sky-200/90 text-sky-950',
      icon: <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />,
      defaultTitle: 'Thông tin',
      textColor: 'text-sky-800',
    },
    success: {
      wrapperClass: 'bg-emerald-50/90 border-emerald-200/90 text-emerald-950',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
      defaultTitle: 'Thành công',
      textColor: 'text-emerald-800',
    },
    warning: {
      wrapperClass: 'bg-amber-50/90 border-amber-200/90 text-amber-950',
      icon: <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
      defaultTitle: 'Cảnh báo',
      textColor: 'text-amber-800',
    },
    error: {
      wrapperClass: 'bg-rose-50/90 border-rose-200/90 text-rose-950',
      icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />,
      defaultTitle: 'Có lỗi xảy ra',
      textColor: 'text-rose-800',
    },
  }[type];

  return (
    <div
      role="alert"
      className={`p-3.5 sm:p-4 rounded-xl border text-sm flex items-start gap-3 shadow-xs transition-all animate-in fade-in duration-200 ${config.wrapperClass} ${className}`}
    >
      {config.icon}
      <div className="text-left flex-1 min-w-0">
        <strong className="block font-semibold mb-0.5 text-sm">
          {title || config.defaultTitle}
        </strong>
        {content && (
          <div className={`text-xs sm:text-sm leading-relaxed ${config.textColor}`}>{content}</div>
        )}
        {action && <div className="mt-2.5">{action}</div>}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 -mr-1 -mt-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-black/5 transition-colors cursor-pointer"
          title="Đóng cảnh báo"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
