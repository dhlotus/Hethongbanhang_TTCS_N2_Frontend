import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

export interface SearchInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange'
> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  isLoading?: boolean;
  debounceMs?: number;
  placeholder?: string;
}

/**
 * Component SearchInput chuẩn LOHA SALES (UI_GUIDELINES Section 19)
 * - Icon Search bên trái
 * - Placeholder rõ nghĩa
 * - Nút Xóa nhanh (Clear) khi đã có ký tự
 * - Loading spinner khi đang tìm kiếm
 * - Hỗ trợ debounce tự động
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  value: controlledValue,
  defaultValue = '',
  onChange,
  onClear,
  isLoading = false,
  debounceMs = 300,
  placeholder = 'Tìm kiếm...',
  className = '',
  disabled = false,
  ...props
}) => {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<string>(
    isControlled ? controlledValue : defaultValue
  );
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isControlled) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue, isControlled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    if (!isControlled) {
      setInternalValue(nextVal);
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onChange?.(nextVal);
    }, debounceMs);
  };

  const handleClear = () => {
    if (!isControlled) {
      setInternalValue('');
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onChange?.('');
    onClear?.();
  };

  const displayValue = isControlled ? controlledValue : internalValue;

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      {/* Icon Search */}
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
        <Search className="w-4 h-4" />
      </div>

      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full h-10.5 sm:h-11 pl-10 pr-10 rounded-md text-sm bg-white border border-[var(--color-border)] hover:border-[var(--color-border-hover)] text-slate-900 placeholder-slate-400 transition-all duration-200 outline-none focus:ring-4 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-border-focus)] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
        {...props}
      />

      {/* Loading hoặc nút Clear */}
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        ) : Boolean(displayValue) && !disabled ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            title="Xóa tìm kiếm"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
};
