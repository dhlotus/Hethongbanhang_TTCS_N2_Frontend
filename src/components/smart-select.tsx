import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X, Check, Info } from 'lucide-react';

export interface SmartSelectOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
  badgeColor?: string;
}

export interface SmartSelectProps {
  id?: string;
  label?: string;
  value: string | string[];
  options: SmartSelectOption[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  multiple?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  width?: string;
  allowClear?: boolean;
}

/**
 * SmartSelect - Ô chọn thông minh chống tràn, tự động định vị & tối ưu thiết bị
 * - Chống cắt bởi overflow (Render qua React Portal)
 * - Tự động lật lên/xuống (Auto-flip) khi sát mép dưới màn hình
 * - Tìm kiếm nội bộ tức thì, gõ tiếng Việt có dấu/không dấu
 * - Nhãn dài tự động co gọn + Có nút xem đầy đủ (Touch, Mouse, Keyboard)
 * - Chế độ chọn nhiều hiển thị gọn gàng kèm "+N", bỏ chọn trực tiếp
 * - Thích ứng điện thoại, máy tính bảng, màn hình xoay ngang
 */
export const SmartSelect: React.FC<SmartSelectProps> = ({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = 'Chọn một mục...',
  searchPlaceholder = 'Tìm kiếm lựa chọn...',
  multiple = false,
  disabled = false,
  required = false,
  error,
  helperText,
  className = '',
  width = 'w-full',
  allowClear = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFullDetail, setShowFullDetail] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    placement: 'bottom' | 'top';
    maxHeight: number;
  }>({
    top: 0,
    left: 0,
    width: 240,
    placement: 'bottom',
    maxHeight: 280,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Chuẩn hóa mảng giá trị đã chọn
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

  // Tìm các options tương ứng với giá trị đã chọn
  const selectedOptions = options.filter((opt) => selectedValues.includes(opt.value));

  // Lọc options theo từ khóa tìm kiếm
  const filteredOptions = options.filter((opt) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    const lMatch = opt.label.toLowerCase().includes(term);
    const subMatch = opt.subLabel ? opt.subLabel.toLowerCase().includes(term) : false;
    const valMatch = opt.value.toLowerCase().includes(term);
    return lMatch || subMatch || valMatch;
  });

  // Tính toán vị trí hiển thị (Auto-flip lên/xuống)
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = Math.min(320, viewportHeight - 120);

    let placement: 'bottom' | 'top' = 'bottom';
    let top = rect.bottom + 4;
    let maxHeight = Math.min(320, spaceBelow - 16);

    if (spaceBelow < 220 && spaceAbove > spaceBelow) {
      placement = 'top';
      top = Math.max(8, rect.top - dropdownHeight - 4);
      maxHeight = Math.min(320, spaceAbove - 16);
    }

    // Đảm bảo dropdown không tràn lề trái/phải màn hình
    const computedWidth = Math.max(rect.width, Math.min(360, viewportWidth - 32));
    let left = rect.left;
    if (left + computedWidth > viewportWidth - 12) {
      left = Math.max(12, viewportWidth - computedWidth - 12);
    }

    setCoords({
      top: Math.round(top),
      left: Math.round(left),
      width: Math.round(computedWidth),
      placement,
      maxHeight: Math.max(160, maxHeight),
    });
  };

  // Cập nhật vị trí khi mở dropdown và khi cuộn/resize/xoay màn hình
  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener('resize', handleScrollOrResize, { passive: true });
      window.addEventListener('scroll', handleScrollOrResize, true);
      return () => {
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, true);
      };
    }
  }, [isOpen]);

  // Autofocus vào ô tìm kiếm khi mở
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
      setShowFullDetail(false);
    }
  }, [isOpen]);

  // Đóng khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Phím tắt bàn phím (Esc để đóng, Enter để chọn)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleSelectOption = (optValue: string) => {
    if (multiple) {
      const exists = selectedValues.includes(optValue);
      const next = exists
        ? selectedValues.filter((v) => v !== optValue)
        : [...selectedValues, optValue];
      onChange(next);
    } else {
      onChange(optValue);
      setIsOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(multiple ? [] : '');
  };

  // Render nhãn kích thước gọn kèm +N nếu chọn nhiều
  const renderTriggerContent = () => {
    if (selectedOptions.length === 0) {
      return <span className="text-slate-400 truncate">{placeholder}</span>;
    }

    if (!multiple) {
      const item = selectedOptions[0];
      return (
        <span className="truncate font-medium text-slate-800 text-left block" title={item.label}>
          {item.label}
        </span>
      );
    }

    // Multiple selection view: hiển thị 1-2 tag đầu + "+N"
    const firstItem = selectedOptions[0];
    const remainingCount = selectedOptions.length - 1;

    return (
      <div className="flex items-center gap-1.5 overflow-hidden">
        <span className="truncate text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium max-w-[140px] border border-slate-200">
          {firstItem.label}
        </span>
        {remainingCount > 0 && (
          <span className="shrink-0 text-[11px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold border border-blue-200">
            +{remainingCount}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={`relative ${width} text-left ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <div className="relative flex items-center">
        <button
          id={id}
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`w-full min-h-[40px] px-3.5 py-1.5 flex items-center justify-between rounded-lg bg-white border text-sm text-slate-800 transition-all duration-200 outline-none text-left focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
            error ? 'border-rose-300 focus:border-rose-500' : 'border-slate-300 hover:border-slate-400'
          }`}
        >
          <div className="flex-1 min-w-0 pr-2">{renderTriggerContent()}</div>

          <div className="flex items-center gap-1 shrink-0 text-slate-400">
            {/* Nút xem chi tiết nội dung dài (accessible modal / popover trigger) */}
            {selectedOptions.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullDetail(!showFullDetail);
                }}
                title="Bấm để xem tên đầy đủ của lựa chọn"
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Nút xóa lựa chọn */}
            {allowClear && selectedOptions.length > 0 && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-rose-600"
                title="Xóa lựa chọn"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`}
            />
          </div>
        </button>

        {/* Modal/Popover xem đầy đủ tên khi giá trị rất dài (Phù hợp Mobile & Desktop) */}
        {showFullDetail && selectedOptions.length > 0 && (
          <div
            className="absolute z-30 left-0 right-0 top-full mt-1.5 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl border border-slate-700 animate-in fade-in zoom-in-95 duration-150"
            role="tooltip"
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="font-semibold text-slate-300">Thông tin chi tiết đã chọn:</span>
              <button
                type="button"
                onClick={() => setShowFullDetail(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {selectedOptions.map((opt) => (
                <div key={opt.value} className="text-slate-100 border-b border-slate-800 pb-1 last:border-0">
                  <div className="font-medium text-white">{opt.label}</div>
                  {opt.subLabel && <div className="text-[11px] text-slate-400">{opt.subLabel}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {error ? (
        <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-slate-500">{helperText}</p>
      ) : null}

      {/* Dropdown Menu - Render ra Portal ngoài body chống bị overflow cắt */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
            role="listbox"
          >
            {/* Header Search Box */}
            <div className="p-2 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 p-0.5 rounded text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Danh sách Options có cuộn an toàn */}
            <div
              style={{ maxHeight: `${coords.maxHeight}px` }}
              className="overflow-y-auto divide-y divide-slate-50 py-1"
            >
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-slate-400">
                  Không tìm thấy lựa chọn nào khớp với "{searchTerm}"
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = selectedValues.includes(opt.value);

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelectOption(opt.value)}
                      className={`w-full px-3.5 py-2.5 text-left text-xs transition-colors flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-blue-50 text-blue-900 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate block" title={opt.label}>
                            {opt.label}
                          </span>
                          {opt.badge && (
                            <span
                              className={`shrink-0 text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                opt.badgeColor || 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {opt.subLabel && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5" title={opt.subLabel}>
                            {opt.subLabel}
                          </div>
                        )}
                      </div>

                      {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            {/* Chân Dropdown thông tin số lượng kết quả */}
            <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
              <span>
                {filteredOptions.length} / {options.length} lựa chọn
              </span>
              {selectedValues.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange(multiple ? [] : '')}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Xóa chọn
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
