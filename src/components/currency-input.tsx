import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: number | null;
  onChange?: (value: number | undefined) => void;
  onValueChange?: (value: number | undefined) => void;
  suffix?: string;
  showWordsBadge?: boolean;
  step?: number;
  allowNegative?: boolean;
}

/**
 * Định dạng số thành chuỗi phân cách hàng nghìn bằng dấu chấm (Chuẩn Việt Nam: 15.000.000)
 */
export const formatVND = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return "";
  return new Intl.NumberFormat("vi-VN").format(Math.round(value));
};

/**
 * Phân tích chuỗi có dấu phân cách hàng nghìn thành số nguyên
 */
export const parseVND = (formattedValue: string): number | undefined => {
  const digits = formattedValue.replace(/\D/g, "");
  if (!digits) return undefined;
  const num = parseInt(digits, 10);
  return isNaN(num) ? undefined : num;
};

/**
 * Đọc vắn tắt giá trị tiền tệ trong B2B (15 triệu đ, 1,5 tỷ đ) giúp người dùng kiểm chứng ngay lập tức
 */
export const formatVNDWords = (num: number | undefined | null): string => {
  if (!num || num <= 0) return "";
  if (num >= 1_000_000_000) {
    const ty = (num / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
    return `${ty} tỷ`;
  }
  if (num >= 1_000_000) {
    const trieu = (num / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
    return `${trieu} triệu`;
  }
  if (num >= 1_000) {
    const nghin = (num / 1_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 });
    return `${nghin} nghìn`;
  }
  return `${num.toLocaleString("vi-VN")} đ`;
};

/**
 * Component CurrencyInput - Input Currency Mask cho B2B
 * - Tự động định dạng dấu chấm phân cách hàng nghìn (15.000.000) thời gian thực khi gõ
 * - Bảo toàn vị trí con trỏ chuột khi chèn hoặc xóa số ở giữa chuỗi
 * - Hỗ trợ phím mũi tên Lên/Xuống để tăng giảm theo bước (step = 1.000đ)
 * - Tùy chọn huy hiệu verbal badge (e.g. "15 triệu") ngăn ngừa sai sót gõ thừa/thiếu số 0
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      value,
      onChange,
      onValueChange,
      suffix = "đ",
      showWordsBadge = false,
      step = 1000,
      disabled = false,
      className = "",
      placeholder = "0",
      onKeyDown,
      ...restProps
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    // Chuỗi hiển thị bên trong input
    const [displayValue, setDisplayValue] = useState<string>(() =>
      value !== undefined && value !== null ? formatVND(value) : ""
    );

    // Đồng bộ khi prop `value` thay đổi từ bên ngoài
    useEffect(() => {
      const formatted = value !== undefined && value !== null ? formatVND(value) : "";
      setDisplayValue(formatted);
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawText = e.target.value;
      const cursorStart = e.target.selectionStart || 0;

      // Đếm số lượng chữ số nằm trước vị trí con trỏ trước khi format lại
      const digitsBeforeCursor = rawText.slice(0, cursorStart).replace(/\D/g, "").length;

      const numeric = parseVND(rawText);
      const newDisplay = numeric !== undefined ? formatVND(numeric) : "";

      setDisplayValue(newDisplay);
      onChange?.(numeric);
      onValueChange?.(numeric);

      // Định vị lại con trỏ chuột chính xác sau khi thêm/bớt dấu chấm
      requestAnimationFrame(() => {
        if (!inputRef.current) return;
        let newCursorPos = 0;
        let count = 0;

        for (let i = 0; i < newDisplay.length; i++) {
          if (/\d/.test(newDisplay[i])) {
            count++;
          }
          if (count === digitsBeforeCursor) {
            newCursorPos = i + 1;
            break;
          }
        }

        if (digitsBeforeCursor === 0) newCursorPos = 0;
        if (count < digitsBeforeCursor) newCursorPos = newDisplay.length;

        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      });
    };

    // Hỗ trợ phím mũi tên Lên/Xuống để tăng giảm tiền tệ
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        const currentNum = parseVND(displayValue) || 0;
        const nextNum = currentNum + step;
        setDisplayValue(formatVND(nextNum));
        onChange?.(nextNum);
        onValueChange?.(nextNum);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const currentNum = parseVND(displayValue) || 0;
        const nextNum = Math.max(0, currentNum - step);
        setDisplayValue(formatVND(nextNum));
        onChange?.(nextNum);
        onValueChange?.(nextNum);
      }

      onKeyDown?.(e);
    };

    const numValue = parseVND(displayValue);
    const wordsDesc = showWordsBadge && numValue && numValue >= 1000 ? formatVNDWords(numValue) : null;

    return (
      <div className="relative w-full flex items-center">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={displayValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className={`${className} ${suffix ? "pr-8" : ""} ${
            wordsDesc ? "pr-24" : ""
          }`}
          {...restProps}
        />

        {/* Huy hiệu hiển thị bằng chữ nếu có (VD: 15 triệu) */}
        {wordsDesc && (
          <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md ring-1 ring-emerald-600/20 pointer-events-none select-none">
            {wordsDesc}
          </span>
        )}

        {/* Ký hiệu đơn vị đ cố định ở đuôi */}
        {suffix && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono font-semibold text-slate-400 pointer-events-none select-none">
            {suffix}
          </span>
        )}
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
