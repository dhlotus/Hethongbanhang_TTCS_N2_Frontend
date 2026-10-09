import React from "react";
import { Loader2 } from "lucide-react";

export type IconButtonVariant = "default" | "primary" | "secondary" | "danger" | "outline";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  tooltip?: string;
  isLoading?: boolean;
}

/**
 * Component Icon Button chuẩn LOHA SALES (UI_GUIDELINES Section 11)
 * - Vùng click tối thiểu 36-40px (min-w-[36px] min-h-[36px])
 * - Icon căn giữa tuyệt đối
 * - Trạng thái: Default, Hover, Active, Focus, Disabled, Loading
 * - Phân cấp hành động: Danger (Xóa), Default (Ghost), Primary, Secondary
 */
export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = "default",
  size = "md",
  tooltip,
  isLoading = false,
  disabled,
  className = "",
  title,
  ...props
}) => {
  const sizeStyles = {
    sm: "w-9 h-9 min-w-[36px] min-h-[36px] text-sm", // 36px chuẩn tối thiểu
    md: "w-10 h-10 min-w-[40px] min-h-[40px] text-base", // 40px chuẩn thoải mái
    lg: "w-11 h-11 min-w-[44px] min-h-[44px] text-lg",
  }[size];

  const variantStyles = {
    default:
      "text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:bg-slate-200 focus:ring-slate-300/40",
    primary:
      "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] focus:ring-[var(--color-primary-ring)]",
    secondary:
      "bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] active:bg-[var(--color-primary-subtle)] focus:ring-[var(--color-primary-ring)]",
    danger:
      "text-rose-500 hover:text-rose-700 hover:bg-rose-50 active:bg-rose-100 focus:ring-rose-500/25",
    outline:
      "border border-[var(--color-border)] text-slate-600 hover:text-slate-900 hover:border-[var(--color-border-hover)] hover:bg-slate-50 active:bg-slate-100 focus:ring-slate-300/30",
  }[variant];

  const accessibleLabel = props["aria-label"] || tooltip || title;

  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      title={tooltip || title}
      aria-label={accessibleLabel}
      className={`inline-flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer select-none focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-primary-ring)] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-95 ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        icon
      )}
    </button>
  );
};
