import React, { forwardRef, useEffect, useRef } from 'react';
import { Check, Minus } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  indeterminate?: boolean;
  error?: string;
}

/**
 * Component Checkbox chuẩn LOHA SALES (UI_GUIDELINES Section 15)
 * - Click được cả Label
 * - Trạng thái: Unchecked, Checked (Primary Color #371cdb), Indeterminate (-), Disabled, Error
 * - Bo góc chuẩn radius-sm (4px)
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      description,
      checked,
      indeterminate = false,
      disabled = false,
      error,
      id,
      className = '',
      onChange,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const checkboxId = id || props.name || Math.random().toString(36).substring(7);

    // Xử lý indeterminate trạng thái HTML native
    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = Boolean(indeterminate);
      }
    }, [indeterminate]);

    return (
      <div className={`inline-flex flex-col text-left ${className}`}>
        <label
          htmlFor={checkboxId}
          className={`inline-flex items-start gap-2.5 select-none ${
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
          }`}
        >
          <div className="relative flex items-center justify-center mt-0.5">
            <input
              id={checkboxId}
              type="checkbox"
              ref={(node) => {
                inputRef.current = node;
                if (typeof ref === 'function') ref(node);
                else if (ref) ref.current = node;
              }}
              checked={checked}
              disabled={disabled}
              onChange={onChange}
              className="peer sr-only"
              {...props}
            />
            {/* Custom box */}
            <div
              className={`w-5 h-5 rounded-[4px] border transition-all duration-150 flex items-center justify-center ${
                error
                  ? 'border-[var(--color-border-error)] bg-rose-50'
                  : 'border-slate-300 bg-white hover:border-slate-400'
              } peer-focus-visible:ring-4 peer-focus-visible:ring-[var(--color-primary-ring)] peer-checked:bg-[var(--color-primary)] peer-checked:border-[var(--color-primary)] ${
                indeterminate ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : ''
              } ${disabled ? 'bg-slate-100 border-slate-200' : ''}`}
            >
              {indeterminate ? (
                <Minus className="w-3.5 h-3.5 text-white stroke-[3]" />
              ) : (
                <Check
                  className={`w-3.5 h-3.5 text-white stroke-[3] transition-transform duration-150 ${
                    checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                  }`}
                />
              )}
            </div>
          </div>

          {(label || description) && (
            <div className="flex flex-col">
              {label && (
                <span className="text-sm font-medium text-slate-800 leading-tight">{label}</span>
              )}
              {description && <span className="text-xs text-slate-500 mt-0.5">{description}</span>}
            </div>
          )}
        </label>
        {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
