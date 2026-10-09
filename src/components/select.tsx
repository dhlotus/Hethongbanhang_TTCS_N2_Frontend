import React, { forwardRef } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
}

/**
 * Component Select chuẩn UI/UX LOHA SALES (UI_GUIDELINES Section 14)
 * - Đồng bộ chiều cao h-10.5/h-11, viền và radius với Input
 * - Icon mũi tên ChevronDown tinh tế
 * - Focus ring Primary Brand Color (#371cdb)
 * - Báo lỗi với AlertCircle và border Error
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      error,
      helperText,
      placeholder,
      required,
      id,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const selectId = id || props.name;

    return (
      <div className="w-full text-left">
        <label htmlFor={selectId} className="block text-sm font-medium text-slate-700 mb-2">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            className={`w-full h-10.5 sm:h-11 pl-4 pr-10 rounded-md text-base bg-white border text-slate-900 transition-all duration-200 outline-none appearance-none cursor-pointer focus:ring-4 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-border-focus)] disabled:bg-slate-100 disabled:text-slate-400 disabled:border-[var(--color-border-disabled)] disabled:cursor-not-allowed ${
              error
                ? 'border-[var(--color-border-error)] focus:border-[var(--color-border-error)] focus:ring-rose-500/10'
                : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
            } ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled hidden>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
            <ChevronDown className="w-4 h-4" />
          </div>
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

Select.displayName = 'Select';
