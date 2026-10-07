import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: "primary" | "secondary" | "outline";
}

/**
 * Component Button chuẩn thiết kế LOHA SALES (h-12, rounded-xl, smooth transition)
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  isLoading = false,
  loadingText = "Đang xử lý...",
  variant = "primary",
  disabled,
  className = "",
  ...props
}) => {
  const baseStyles =
    "w-full h-10.5 sm:h-11 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-4 select-none disabled:opacity-60 disabled:cursor-not-allowed";

  const variantStyles = {
    primary:
      "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] text-white shadow-sm hover:shadow focus:ring-[var(--color-primary-ring)]",
    secondary:
      "bg-[var(--color-primary-light)] hover:bg-[var(--color-primary-subtle)] active:bg-[var(--color-primary-subtle)] text-[var(--color-primary)] focus:ring-[var(--color-primary-ring)]",
    outline:
      "border border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-slate-50 active:bg-slate-100 text-slate-700 focus:ring-slate-300/30",
  }[variant];

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-white" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};
