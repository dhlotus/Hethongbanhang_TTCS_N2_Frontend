import React from "react";
import { X } from "lucide-react";

export type BadgeVariant =
  | "success"
  | "error"
  | "danger"
  | "warning"
  | "info"
  | "neutral"
  | "primary";

export type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  rounded?: "full" | "md";
  dot?: boolean;
  icon?: React.ReactNode;
  onRemove?: () => void;
}

/**
 * Component Badge / Tag chuẩn LOHA SALES (UI_GUIDELINES Section 25)
 * - Tuân thủ Semantic Color System (success: xanh lá, danger: đỏ, warning: vàng, info: xanh dương, neutral: xám)
 * - Hỗ trợ dot trạng thái, icon đi kèm, nút xóa Tag (onRemove)
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  size = "md",
  rounded = "full",
  dot = false,
  icon,
  onRemove,
  className = "",
  ...props
}) => {
  const normalizedVariant = variant === "danger" ? "error" : variant;

  const variantStyles = {
    success:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
    error: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
    warning: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
    info: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
    neutral: "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20",
    primary:
      "bg-[var(--color-primary-light)] text-[var(--color-primary)] ring-1 ring-inset ring-[var(--color-primary)]/20",
  }[normalizedVariant];

  const dotStyles = {
    success: "bg-emerald-500",
    error: "bg-rose-500",
    warning: "bg-amber-500",
    info: "bg-sky-500",
    neutral: "bg-slate-400",
    primary: "bg-[var(--color-primary)]",
  }[normalizedVariant];

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
  }[size];

  return (
    <span
      className={`inline-flex items-center font-semibold select-none leading-none tracking-tight ${
        rounded === "full" ? "rounded-full" : "rounded-md"
      } ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyles}`}
          aria-hidden="true"
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-black/10 transition-colors cursor-pointer"
          title="Xóa nhãn"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};
