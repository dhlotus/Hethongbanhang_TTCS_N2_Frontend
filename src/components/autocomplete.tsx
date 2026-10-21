import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Loader2, AlertCircle, ChevronDown } from 'lucide-react';

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
  id?: string;
}

/**
 * Component Autocomplete chuẩn LOHA SALES (UI_GUIDELINES Section 20)
 * - Tự động gợi ý khi gõ và lọc theo từ khóa
 * - Hỗ trợ điều hướng bàn phím (Arrow Up, Down, Enter, Escape)
 * - Luôn sổ đầy đủ danh sách khi focus/click để dễ dàng đổi sang sản phẩm khác
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
  id,
}) => {
  const [internalValue, setInternalValue] = useState(controlledValue || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const query = internalValue;

  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
      setIsTyping(false);
    }
  }, [controlledValue]);

  // Đóng dropdown khi click ra ngoài và khôi phục giá trị hợp lệ nếu có
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsTyping(false);
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
    setIsTyping(true);
    onChange?.(nextVal);
    setIsOpen(true);
    setHighlightedIndex(0);
  };

  const handleSelectItem = (item: AutocompleteItem) => {
    setInternalValue(item.label);
    setIsTyping(false);
    onChange?.(item.label);
    onSelect?.(item);
    setIsOpen(false);
  };

  // Tự động lọc danh sách items theo query:
  // - Nếu người dùng chưa gõ từ khóa tìm kiếm mới (!isTyping), hiển thị toàn bộ danh sách items
  //   để người dùng có thể thoải mái chọn sang sản phẩm khác mà không bị khóa ở sản phẩm hiện tại.
  // - Khi người dùng chủ động gõ tìm kiếm (isTyping === true), lọc theo từ khóa nhập vào.
  const filteredItems = useMemo(() => {
    if (!isTyping || !query.trim()) {
      return items;
    }
    const q = query.toLowerCase().trim();
    return items.filter((item) => {
      return (
        item.label.toLowerCase().includes(q) ||
        (item.sublabel && item.sublabel.toLowerCase().includes(q))
      );
    });
  }, [items, isTyping, query]);

  // Khi mở dropdown mà chưa gõ từ khóa mới, tự động cuộn/highlight sản phẩm đang chọn
  useEffect(() => {
    if (isOpen && !isTyping) {
      const idx = items.findIndex((it) => it.label === internalValue || String(it.id) === internalValue);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, isTyping, items, internalValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsTyping(false);
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
      setIsTyping(false);
      if (controlledValue !== undefined) {
        setInternalValue(controlledValue);
      }
    }
  };

  // Helper highlight text
  const renderHighlightedText = (text: string, highlight: string) => {
    if (!isTyping || !highlight.trim()) return text;
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
    sm: 'h-8.5 pl-2.5 pr-8 py-1 text-xs rounded-lg',
    md: 'h-10.5 sm:h-11 pl-4 pr-10 text-base rounded-md',
    lg: 'h-12 pl-4.5 pr-12 text-lg rounded-lg',
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
          id={id}
          ref={inputRef}
          type="text"
          name={id ? `no-autofill-${id}` : "no-autofill-search"}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          data-lpignore="true"
          data-form-type="other"
          value={query}
          disabled={disabled}
          onChange={handleInputChange}
          onClick={() => {
            setIsTyping(false);
            setIsOpen(true);
          }}
          onFocus={(e) => {
            setIsTyping(false);
            if (openOnFocus) setIsOpen(true);
            else if (query) setIsOpen(true);
            e.target.select();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full ${sizeClasses} bg-white border text-slate-900 placeholder-slate-400 transition-all duration-200 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
            error
              ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-200'
              : 'border-slate-300 hover:border-slate-400'
          }`}
        />
        
        {/* Biểu tượng mũi tên trỏ xuống cố định bên phải ô nhập (không xoay lên xuống, bỏ dấu x) */}
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </div>

      {error && (
        <p className={size === 'sm' ? "mt-1 text-[10px] text-rose-600 flex items-center gap-1 font-medium leading-tight" : "mt-2 text-xs text-rose-600 flex items-center gap-2 font-medium"}>
          <AlertCircle className={size === 'sm' ? "w-3 h-3 shrink-0" : "w-3.5 h-3.5 shrink-0"} />
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
