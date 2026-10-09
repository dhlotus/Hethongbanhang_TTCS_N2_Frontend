import React, { useRef, useId } from 'react';
import { Clock, X, AlertCircle } from 'lucide-react';

export interface TimeInputProps {
  value?: string; // Định dạng HH:mm (24 giờ)
  onChange?: (value: string) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  error?: string | null;
  helperText?: string;
  placeholder?: string;
  showClear?: boolean;
  className?: string;
  id?: string;
}

/**
 * Component TimeInput chuẩn LOHA SALES (UI_GUIDELINES Section 18)
 * - Định dạng thời gian chuẩn 24h (HH:mm)
 * - Icon Clock căn trái, nút X xóa nhanh căn phải
 * - Focus ring thương hiệu Primary (#371cdb)
 */
export const TimeInput: React.FC<TimeInputProps> = ({
  value = '',
  onChange,
  disabled = false,
  label,
  required = false,
  error,
  helperText,
  placeholder = 'HH:mm',
  showClear = true,
  className = '',
  id,
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpenPicker = () => {
    if (disabled) return;
    if (inputRef.current) {
      if (typeof inputRef.current.showPicker === 'function') {
        try {
          inputRef.current.showPicker();
        } catch {
          inputRef.current.focus();
        }
      } else {
        inputRef.current.focus();
      }
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange?.('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className={`w-full text-left ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700 mb-2 cursor-pointer"
          onClick={handleOpenPicker}
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div
        onClick={handleOpenPicker}
        className={`relative flex items-center w-full h-10.5 sm:h-11 px-3.5 rounded-md border transition-all cursor-pointer select-none bg-white ${
          disabled
            ? 'bg-slate-100 border-[var(--color-border-disabled)] text-slate-400 cursor-not-allowed'
            : error
              ? 'border-[var(--color-border-error)] focus-within:ring-4 focus-within:ring-rose-500/10'
              : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)] focus-within:border-[var(--color-border-focus)] focus-within:ring-4 focus-within:ring-[var(--color-primary-ring)]'
        }`}
      >
        <Clock className="w-4 h-4 mr-2.5 shrink-0 text-slate-400" />

        <span
          className={`flex-1 text-base truncate font-normal ${
            value ? 'text-slate-900' : 'text-slate-400'
          }`}
        >
          {value || placeholder}
        </span>

        {showClear && Boolean(value) && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors z-10 cursor-pointer"
            title="Xóa giờ"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <input
          ref={inputRef}
          id={inputId}
          type="time"
          value={value || ''}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed -z-0"
          tabIndex={disabled ? -1 : 0}
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
};
