import React from "react";

export type ProgressStatus = "default" | "success" | "error";

export interface ProgressBarProps {
  value?: number; // 0 đến 100
  max?: number; // mặc định 100
  status?: ProgressStatus;
  indeterminate?: boolean;
  label?: string;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Component ProgressBar chuẩn LOHA SALES (UI_GUIDELINES Section 39)
 * - Xác định được: hiển thị % chính xác kèm hiệu ứng mượt mà
 * - Không xác định: thanh chuyển động liên tục (indeterminate)
 * - Màu sắc: Primary (mặc định), Success (xanh lá khi xong), Error (đỏ khi lỗi)
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value = 0,
  max = 100,
  status = "default",
  indeterminate = false,
  label,
  showPercentage = false,
  size = "md",
  className = "",
}) => {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));

  const heightStyles = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  }[size];

  const colorStyles = {
    default: "bg-[var(--color-primary)]",
    success: "bg-emerald-600",
    error: "bg-rose-600",
  }[status];

  return (
    <div className={`w-full select-none text-left ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1.5">
          {label && <span>{label}</span>}
          {showPercentage && !indeterminate && (
            <span className="font-mono text-slate-500 font-bold">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}

      <div
        className={`w-full ${heightStyles} bg-slate-100 rounded-full overflow-hidden border border-slate-200/50`}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {indeterminate ? (
          <div
            className={`h-full w-1/3 ${colorStyles} rounded-full animate-[progressIndeterminate_1.5s_infinite_ease-in-out]`}
          />
        ) : (
          <div
            className={`h-full ${colorStyles} rounded-full transition-all duration-300 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
    </div>
  );
};
