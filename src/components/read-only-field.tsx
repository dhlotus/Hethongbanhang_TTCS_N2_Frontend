import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export interface ReadOnlyFieldProps {
  label: string;
  value: React.ReactNode;
  copyable?: boolean;
  copyText?: string;
  helperText?: string;
  className?: string;
}

/**
 * Component ReadOnlyField chuẩn LOHA SALES (UI_GUIDELINES Section 59)
 * - Hiển thị giá trị chỉ đọc rõ ràng, phân biệt với trường Input và trường Disabled
 * - Tùy chọn nút sao chép (copyable) tiện lợi
 */
export const ReadOnlyField: React.FC<ReadOnlyFieldProps> = ({
  label,
  value,
  copyable = false,
  copyText,
  helperText,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy =
      copyText || (typeof value === 'string' || typeof value === 'number' ? String(value) : '');
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`w-full text-left ${className}`}>
      <span className="block text-sm font-medium text-slate-700 mb-1.5">{label}</span>

      <div className="flex items-center justify-between w-full h-10.5 sm:h-11 px-3.5 rounded-md bg-slate-50 border border-slate-200/90 text-slate-800 text-sm">
        <span className="font-semibold truncate">{value ?? '—'}</span>

        {copyable && Boolean(value) && (
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 -mr-1 text-slate-400 hover:text-[var(--color-primary)] rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
            title={copied ? 'Đã sao chép!' : 'Sao chép giá trị'}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {helperText && <p className="mt-1 text-xs text-slate-400">{helperText}</p>}
    </div>
  );
};
