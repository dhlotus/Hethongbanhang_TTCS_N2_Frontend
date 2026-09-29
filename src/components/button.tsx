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
    "w-full h-12 rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-4 select-none disabled:opacity-60 disabled:cursor-not-allowed";

  const variantStyles = {
    primary:
      "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm hover:shadow focus:ring-blue-500/25",
    secondary:
      "bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 focus:ring-slate-400/20",
    outline:
      "border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-700 focus:ring-slate-300/30",
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
