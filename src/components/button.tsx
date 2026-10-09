import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

/**
 * Component Button chuẩn thiết kế LOHA SALES (UI_GUIDELINES Section 10)
 * - Phân cấp hành động: Primary (chính), Secondary (phụ), Danger (nguy hiểm), Ghost (thao tác dòng), Outline (viền)
 * - Chuẩn hóa trạng thái: Default, Hover, Active/Pressed, Focus, Disabled, Loading
 * - Radius chuẩn radius-md (8px), font-weight-medium/semibold
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  isLoading = false,
  loadingText = 'Đang xử lý...',
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth = true,
  disabled,
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'h-9 px-3 text-xs gap-1.5',
    md: 'h-10.5 sm:h-11 px-4 text-sm gap-2',
    lg: 'h-12 px-5 text-base gap-2.5',
  }[size];

  const variantStyles = {
    primary:
      'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] text-white focus:ring-[var(--color-primary-ring)] shadow-none',
    secondary:
      'bg-[var(--color-primary-light)] hover:bg-[var(--color-primary-subtle)] active:bg-[var(--color-primary-subtle)] text-[var(--color-primary)] focus:ring-[var(--color-primary-ring)]',
    danger:
      'bg-[var(--color-error)] hover:bg-[var(--color-error-hover)] active:bg-[#991b1b] text-white focus:ring-rose-500/25',
    ghost:
      'bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-700 hover:text-slate-900 focus:ring-slate-300/30',
    outline:
      'border border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-slate-50 active:bg-slate-100 text-slate-700 focus:ring-slate-300/30',
  }[variant];

  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-md transition-all duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-4 disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${fullWidth ? 'w-full' : 'w-auto'} ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2
            className={`w-4 h-4 animate-spin shrink-0 ${variant === 'primary' || variant === 'danger' ? 'text-white' : 'text-current'}`}
          />
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          {leftIcon && (
            <span className="inline-flex shrink-0 items-center justify-center">{leftIcon}</span>
          )}
          {children}
          {rightIcon && (
            <span className="inline-flex shrink-0 items-center justify-center">{rightIcon}</span>
          )}
        </>
      )}
    </button>
  );
};
