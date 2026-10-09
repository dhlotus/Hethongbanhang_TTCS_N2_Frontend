import React, { useRef, useId } from 'react';
import { Calendar, X, AlertCircle } from 'lucide-react';

export interface DateInputProps {
  value?: string; // Định dạng YYYY-MM-DD
  onChange?: (value: string) => void;
  min?: string; // Định dạng YYYY-MM-DD
  max?: string; // Định dạng YYYY-MM-DD
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string | null;
  hasError?: boolean;
  className?: string;
  helperText?: string;
  showClear?: boolean;
  compact?: boolean; // Dạng thu gọn cho thanh toolbar/bộ lọc
  id?: string;
  title?: string;
}

/**
 * Định dạng chuỗi ISO YYYY-MM-DD sang định dạng ngày chuẩn Việt Nam dd/mm/yyyy
 * Không bị ảnh hưởng bởi timezone UTC lệch ngày
 */
export const formatVietnameseDate = (isoDate: string | undefined | null): string => {
  if (!isoDate) return '';
  const match = String(isoDate)
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  return isoDate;
};

/**
 * Component DateInput - Trải nghiệm chọn ngày chuẩn Việt Nam (dd/mm/yyyy)
 * - Hiển thị nhất quán định dạng ngày Việt Nam (dd/mm/yyyy) bất kể cài đặt vùng của hệ điều hành
 * - Hỗ trợ min/max chặn chọn ngày không hợp lệ ở tầng trình duyệt
 * - Hiển thị viền cảnh báo đỏ và thông báo lỗi realtime
 * - Tương thích tốt trên cả Desktop và Thiết bị di động
 */
export const DateInput: React.FC<DateInputProps> = ({
  value = '',
  onChange,
  min,
  max,
  disabled = false,
  placeholder = 'dd/mm/yyyy',
  label,
  required = false,
  error,
  hasError = false,
  className = '',
  helperText,
  showClear = true,
  compact = false,
  id,
  title,
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const inputRef = useRef<HTMLInputElement>(null);

  const isInvalid = Boolean(error || hasError);
  const formattedDisplay = formatVietnameseDate(value);

  // Kích hoạt popup lịch chuẩn trình duyệt khi click vào ô
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

  // Phiên bản compact (cho thanh filter bar inline)
  if (compact) {
    return (
      <div
        className={`relative inline-flex items-center group cursor-pointer transition-all ${
          disabled ? 'opacity-60 cursor-not-allowed' : ''
        } ${className}`}
        onClick={handleOpenPicker}
        title={title || (value ? `Ngày đã chọn: ${formattedDisplay}` : placeholder)}
      >
        <span
          className={`text-xs select-none truncate ${
            value ? 'font-semibold text-slate-800' : 'font-normal text-slate-400'
          }`}
        >
          {value ? formattedDisplay : placeholder}
        </span>

        {/* Input date ẩn phủ lên toàn bộ để nhận tương tác */}
        <input
          ref={inputRef}
          id={inputId}
          type="date"
          value={value || ''}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed -z-0"
          tabIndex={disabled ? -1 : 0}
        />
      </div>
    );
  }

  // Phiên bản tiêu chuẩn (cho form modal)
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 cursor-pointer"
          onClick={handleOpenPicker}
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div
        onClick={handleOpenPicker}
        className={`relative flex items-center w-full px-3 py-2 text-xs rounded-xl border transition-all cursor-pointer select-none bg-white ${
          disabled
            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
            : isInvalid
              ? 'border-rose-400 bg-rose-50/30 text-rose-800 ring-2 ring-rose-100 hover:border-rose-500'
              : 'border-slate-200 hover:border-blue-400 text-slate-800 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100'
        }`}
      >
        <Calendar
          className={`w-4 h-4 mr-2.5 shrink-0 ${
            isInvalid ? 'text-rose-500' : value ? 'text-blue-600' : 'text-slate-400'
          }`}
        />

        {/* Nhãn hiển thị ngày theo định dạng Việt Nam */}
        <span
          className={`flex-1 truncate font-medium ${
            value
              ? isInvalid
                ? 'font-semibold text-rose-900'
                : 'font-semibold text-slate-900'
              : 'text-slate-400'
          }`}
        >
          {value ? formattedDisplay : placeholder}
        </span>

        {/* Nút xóa nhanh ngày */}
        {showClear && Boolean(value) && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 -mr-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100 transition-colors z-10 cursor-pointer"
            title="Xóa ngày này"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Input date ẩn phủ lên toàn bộ để nhận tương tác */}
        <input
          ref={inputRef}
          id={inputId}
          type="date"
          value={value || ''}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-0"
          tabIndex={disabled ? -1 : 0}
        />
      </div>

      {/* Thông báo lỗi nếu có */}
      {error && (
        <p className="flex items-center gap-1 text-[11px] font-medium text-rose-600 mt-1 animate-in fade-in">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {/* Ghi chú gợi ý nếu không có lỗi */}
      {!error && helperText && <p className="text-[10px] text-slate-400 mt-0.5">{helperText}</p>}
    </div>
  );
};
