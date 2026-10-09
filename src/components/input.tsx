import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  required?: boolean;
}

/**
 * Component Input chuẩn UI/UX cao cấp cho hệ thống LOHA SALES (UI_GUIDELINES Section 12)
 * - Label rõ ràng, dấu required *
 * - Focus Ring Primary Brand Color (#371cdb)
 * - Trạng thái Error với màu Error và AlertCircle
 * - Hỗ trợ helperText, leftIcon, rightElement
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, helperText, leftIcon, rightElement, required, id, className = '', ...props },
    ref
  ) => {
    const inputId = id || props.name;

    return (
      <div className="w-full text-left">
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-2">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full h-10.5 sm:h-11 rounded-md text-base bg-white border text-slate-900 placeholder-slate-400 transition-all duration-200 outline-none focus:ring-4 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-border-focus)] disabled:bg-slate-100 disabled:text-slate-400 disabled:border-[var(--color-border-disabled)] disabled:cursor-not-allowed ${
              leftIcon ? 'pl-10.5' : 'pl-4'
            } ${rightElement ? 'pr-10.5' : 'pr-4'} ${
              error
                ? 'border-[var(--color-border-error)] focus:border-[var(--color-border-error)] focus:ring-rose-500/10'
                : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
            } ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
              {rightElement}
            </div>
          )}
        </div>
        {error ? (
          <p className="mt-2 text-xs text-rose-600 flex items-center gap-2 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        ) : helperText ? (
          <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
