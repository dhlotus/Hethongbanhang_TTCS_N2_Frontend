import React, { useState, useRef, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

export interface AutocompleteItem {
  id: string | number;
  label: string;
  sublabel?: string;
  data?: any;
}

export interface AutocompleteProps {
  label?: string;
  value?: string;
  onChange?: (val: string) => void;
  onSelect?: (item: AutocompleteItem) => void;
  items: AutocompleteItem[];
  placeholder?: string;
  isLoading?: boolean;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  noResultText?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  openOnFocus?: boolean;
}

/**
 * Component Autocomplete chuẩn LOHA SALES (UI_GUIDELINES Section 20)
 * - Tự động gợi ý khi gõ và lọc theo từ khóa
 * - Hỗ trợ điều hướng bàn phím (Arrow Up, Down, Enter, Escape)
 * - Trạng thái: Loading, Suggestions, No Result, Error
 * - Dropdown shadow-md, radius-lg
 * - Kích thước linh hoạt (size sm cho table cell, md cho form thông thường)
 */
export const Autocomplete: React.FC<AutocompleteProps> = ({
  label,
  value: controlledValue,
  onChange,
  onSelect,
  items,
  placeholder = 'Nhập để tìm kiếm...',
  isLoading = false,
  error,
  required = false,
  disabled = false,
  noResultText = 'Không tìm thấy kết quả phù hợp',
  className = '',
  size = 'md',
  openOnFocus = true,
}) => {
  const [internalValue, setInternalValue] = useState(controlledValue || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const query = controlledValue !== undefined ? internalValue : internalValue;

  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  // Đóng dropdown khi click ra ngoài và khôi phục giá trị hợp lệ nếu có
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (controlledValue !== undefined) {
          setInternalValue(controlledValue);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [controlledValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setInternalValue(nextVal);
    onChange?.(nextVal);
    setIsOpen(true);
    setHighlightedIndex(0);
  };

  const handleSelectItem = (item: AutocompleteItem) => {
    setInternalValue(item.label);
    onChange?.(item.label);
    onSelect?.(item);
    setIsOpen(false);
  };

  // Tự động lọc danh sách items theo query (tìm trong cả label và sublabel)
  const filteredItems = items.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    return (
      item.label.toLowerCase().includes(q) ||
      (item.sublabel && item.sublabel.toLowerCase().includes(q))
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredItems[highlightedIndex]) {
        handleSelectItem(filteredItems[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      if (controlledValue !== undefined) {
        setInternalValue(controlledValue);
      }
    }
  };

  // Helper highlight text
  const renderHighlightedText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={i} className="text-[var(--color-primary)] font-bold">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const sizeClasses = {
    sm: 'h-8.5 px-3 py-1.5 text-sm rounded',
    md: 'h-10.5 sm:h-11 px-4 text-base rounded-md',
    lg: 'h-12 px-4.5 text-lg rounded-lg',
  }[size];

  return (
    <div ref={containerRef} className={`relative w-full text-left ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          onChange={handleInputChange}
          onFocus={() => {
            if (openOnFocus) setIsOpen(true);
            else if (query) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full ${sizeClasses} bg-white border text-slate-900 placeholder-slate-400 transition-all duration-200 outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-border-focus)] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
            error
              ? 'border-[var(--color-border-error)] focus:border-[var(--color-border-error)]'
              : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
          }`}
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs text-rose-600 flex items-center gap-2 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {/* Popover danh sách gợi ý */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 min-w-[280px] max-w-lg mt-1 max-h-60 overflow-y-auto bg-white rounded-lg border border-slate-200 shadow-xl py-1">
          {isLoading ? (
            <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Đang tải gợi ý...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400">{noResultText}</div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === highlightedIndex;
              return (
                <div
                  key={String(item.id)}
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`px-3.5 py-2 text-sm cursor-pointer transition-colors flex flex-col ${
                    isSelected
                      ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{renderHighlightedText(item.label, query)}</span>
                  {item.sublabel && (
                    <span className="text-xs text-slate-400 truncate mt-0.5">{item.sublabel}</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
