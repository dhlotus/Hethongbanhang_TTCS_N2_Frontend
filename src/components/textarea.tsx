import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  showCount?: boolean;
}

/**
 * Component Textarea chuẩn UI/UX cao cấp cho hệ thống LOHA SALES (UI_GUIDELINES Section 13)
 * - Chiều cao mặc định hợp lý (min-h-[100px])
 * - Đếm ký tự đã nhập / tối đa khi có maxLength
 * - Hiển thị lỗi rõ ràng với AlertCircle
 * - Focus ring thương hiệu Primary (#371cdb)
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      showCount = false,
      maxLength,
      value,
      defaultValue,
      id,
      className = '',
      rows = 3,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name;
    const currentLength =
      typeof value === 'string'
        ? value.length
        : typeof defaultValue === 'string'
          ? defaultValue.length
          : 0;

    return (
      <div className="w-full text-left">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          {showCount && maxLength && (
            <span className="text-xs text-slate-400 font-mono">
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
        <div className="relative">
          <textarea
            id={inputId}
            ref={ref}
            rows={rows}
            maxLength={maxLength}
            value={value}
            defaultValue={defaultValue}
            className={`w-full min-h-[100px] p-3.5 rounded-md text-sm bg-white border text-slate-900 placeholder-slate-400 transition-all duration-200 outline-none focus:ring-4 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-border-focus)] disabled:bg-slate-100 disabled:text-slate-400 disabled:border-[var(--color-border-disabled)] disabled:cursor-not-allowed resize-y ${
              error
                ? 'border-[var(--color-border-error)] focus:border-[var(--color-border-error)] focus:ring-rose-500/10'
                : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
            } ${className}`}
            {...props}
          />
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

Textarea.displayName = 'Textarea';
