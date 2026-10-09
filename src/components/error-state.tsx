import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "./button";

export interface ErrorStateProps {
  title?: string;
  description?: React.ReactNode;
  onRetry?: () => void;
  retryText?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Component ErrorState chuẩn LOHA SALES (UI_GUIDELINES Section 41)
 * - Nêu rõ thông báo lỗi thân thiện, không chỉ hiện mã lỗi thô
 * - Icon AlertCircle đỏ (Rose) nổi bật
 * - Cung cấp nút Thử lại (Retry action) tiện lợi
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Không thể tải dữ liệu",
  description = "Đã xảy ra lỗi trong quá trình kết nối tới máy chủ. Vui lòng thử lại sau.",
  onRetry,
  retryText = "Thử lại ngay",
  action,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center select-none bg-white rounded-xl border border-slate-200/80 shadow-xs ${className}`}
    >
      <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4 ring-8 ring-rose-50/50">
        <AlertCircle className="w-9 h-9 stroke-[2.2]" />
      </div>

      <h3 className="text-lg font-bold text-slate-900 tracking-tight">
        {title}
      </h3>

      {description && (
        <div className="mt-1.5 text-xs sm:text-sm text-slate-500 max-w-md leading-relaxed">
          {description}
        </div>
      )}

      {(onRetry || action) && (
        <div className="mt-6 flex items-center gap-3">
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              fullWidth={false}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={onRetry}
            >
              {retryText}
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  );
};
