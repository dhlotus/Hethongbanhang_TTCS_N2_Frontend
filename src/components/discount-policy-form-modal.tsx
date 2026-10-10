import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Plus, Trash2, Save, AlertCircle, Check, Sparkles } from 'lucide-react';
import type {
  DiscountPolicy,
  CreateDiscountPolicyPayload,
} from '../services/discount-policies.service';
import { productsService } from '../services/products.service';
import { categoriesService } from '../services/categories.service';

interface DiscountPolicyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateDiscountPolicyPayload, id?: string) => Promise<void>;
  initialData: DiscountPolicy | null;
}

interface TargetItem {
  code: string;
  name: string;
}

interface ScopeRow {
  id: string;
  type: 'SKU' | 'CATEGORY';
  items: TargetItem[];
}

/**
 * Component ô nhập số lượng Q_min và Q_max:
 * - Khắc phục số 0 vô nghĩa ở đầu (value.replace(/^0+(?=\d)/, ''))
 * - Quy tắc đè số: focus vào 0 sẽ select all để gõ số mới đè ngay
 */
interface QuantityInputProps {
  value: number | null;
  onChange: (val: number | null) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  allowNull?: boolean;
  hasError?: boolean;
}

const QuantityInput: React.FC<QuantityInputProps> = ({
  value,
  onChange,
  onBlur,
  placeholder,
  className = '',
  allowNull = false,
  hasError = false,
}) => {
  const [displayValue, setDisplayValue] = useState<string>(value === null ? '' : String(value));

  useEffect(() => {
    setDisplayValue(value === null ? '' : String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    if (allowNull && raw.trim() === '') {
      setDisplayValue('');
      onChange(null);
      return;
    }

    const sanitized = raw.replace(/^0+(?=\d)/, '');
    setDisplayValue(sanitized);

    if (sanitized === '' || sanitized === '-') {
      onChange(allowNull ? null : 0);
      return;
    }

    const parsed = parseInt(sanitized, 10);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (displayValue === '0') {
      e.target.select();
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim();
    if (raw === '') {
      if (allowNull) {
        setDisplayValue('');
        onChange(null);
      } else {
        setDisplayValue('0');
        onChange(0);
      }
    } else {
      const sanitized = raw.replace(/^0+(?=\d)/, '');
      const parsed = parseInt(sanitized, 10);
      const finalVal = isNaN(parsed) ? (allowNull ? null : 0) : parsed;
      setDisplayValue(finalVal === null ? '' : String(finalVal));
      onChange(finalVal);
    }
    if (onBlur) onBlur();
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={`w-full px-2.5 py-1.5 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 ${
        hasError
          ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100 bg-rose-50/20 text-rose-900'
          : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100 text-slate-800'
      } ${className}`}
    />
  );
};

/**
 * Component ô nhập mức giảm (VNĐ hoặc %):
 * - VNĐ: Không nối chuỗi 'VNĐ' vào giá trị input; chữ 'VNĐ' là suffix addon bên ngoài/bên phải.
 * - VNĐ: Tự động format dấu chấm phân cách hàng nghìn khi gõ (ví dụ 5555 -> 5.555).
 * - VNĐ: Gợi ý quy đổi tròn tiền thông minh khi nhập 1 - 999.
 * - %: Suffix addon '%'.
 */
interface DiscountValueInputProps {
  value: number;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  onChange: (val: number) => void;
  hasError?: boolean;
}

const DiscountValueInput: React.FC<DiscountValueInputProps> = ({
  value,
  discountType,
  onChange,
  hasError = false,
}) => {
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (discountType === 'FIXED_AMOUNT') {
      setDisplayValue(value === 0 ? '0' : value.toLocaleString('vi-VN'));
    } else {
      setDisplayValue(String(value));
    }
  }, [value, discountType]);

  // Sinh gợi ý quy đổi tiền tệ thông minh khi nhập số 1 - 999
  const suggestions = useMemo(() => {
    if (discountType !== 'FIXED_AMOUNT' || !isFocused) return [];
    if (value > 0 && value < 1000) {
      return [
        { label: `${(value * 1000).toLocaleString('vi-VN')} VNĐ`, val: value * 1000 },
        { label: `${(value * 10000).toLocaleString('vi-VN')} VNĐ`, val: value * 10000 },
        { label: `${(value * 100000).toLocaleString('vi-VN')} VNĐ`, val: value * 100000 },
      ];
    }
    return [];
  }, [value, discountType, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    if (discountType === 'FIXED_AMOUNT') {
      // Chỉ lấy các ký tự số thuần túy
      const digits = raw.replace(/\D/g, '');
      const sanitized = digits.replace(/^0+(?=\d)/, '');
      if (sanitized === '') {
        setDisplayValue('0');
        onChange(0);
        return;
      }
      const num = parseInt(sanitized, 10);
      setDisplayValue(num.toLocaleString('vi-VN'));
      onChange(num);
    } else {
      // Nhập %
      const sanitized = raw.replace(/^0+(?=\d)/, '');
      setDisplayValue(sanitized);
      if (sanitized === '' || sanitized === '-') {
        onChange(0);
        return;
      }
      const parsed = parseFloat(sanitized);
      if (!isNaN(parsed)) {
        onChange(parsed);
      }
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (displayValue === '0' || displayValue === '0.0') {
      e.target.select();
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
    }, 200);

    if (discountType === 'FIXED_AMOUNT') {
      const digits = displayValue.replace(/\D/g, '');
      const num = digits === '' ? 0 : parseInt(digits, 10);
      setDisplayValue(num.toLocaleString('vi-VN'));
      onChange(num);
    } else {
      const sanitized = displayValue.trim().replace(/^0+(?=\d)/, '');
      const parsed = parseFloat(sanitized);
      const finalVal = isNaN(parsed) ? 0 : parsed;
      setDisplayValue(String(finalVal));
      onChange(finalVal);
    }
  };

  const handleSelectSuggestion = (suggestedVal: number) => {
    onChange(suggestedVal);
    setDisplayValue(suggestedVal.toLocaleString('vi-VN'));
    setIsFocused(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div
        className={`flex items-center rounded-lg border overflow-hidden transition-colors ${
          hasError
            ? 'border-rose-300 ring-2 ring-rose-100 bg-rose-50/20'
            : 'border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 bg-white'
        }`}
      >
        <input
          type="text"
          inputMode={discountType === 'FIXED_AMOUNT' ? 'numeric' : 'decimal'}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="0"
          className="flex-1 min-w-0 px-2.5 py-1.5 text-sm font-semibold text-slate-800 bg-transparent border-none focus:outline-none"
        />
        <span className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50 border-l border-slate-200 shrink-0 select-none">
          {discountType === 'PERCENTAGE' ? '%' : 'VNĐ'}
        </span>
      </div>

      {/* Dropdown Gợi ý quy đổi tròn tiền thông minh */}
      {suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 flex flex-col gap-1 min-w-[180px] animate-fadeIn">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 px-2 py-0.5 uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Gợi ý quy đổi tròn tiền
          </div>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectSuggestion(s.val);
              }}
              className="text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>{s.label}</span>
              <span className="text-[10px] font-normal text-blue-600 bg-blue-100/60 px-1.5 py-0.5 rounded">
                chọn
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Component Dòng phạm vi áp dụng (Scope Row):
 * - Khống chế chống chọn trùng lặp: loại đã chọn ở dòng khác sẽ bị disable.
 */
interface ScopeRowItemProps {
  row: ScopeRow;
  canDelete: boolean;
  disabledTypes: ('SKU' | 'CATEGORY')[];
  onDelete: () => void;
  onChangeType: (type: 'SKU' | 'CATEGORY') => void;
  onAddItem: (item: TargetItem) => void;
  onRemoveItem: (code: string) => void;
  cachedProducts: TargetItem[];
  cachedCategories: TargetItem[];
  onErrorChange: (err: string | null) => void;
}

const ScopeRowItem: React.FC<ScopeRowItemProps> = ({
  row,
  canDelete,
  disabledTypes,
  onDelete,
  onChangeType,
  onAddItem,
  onRemoveItem,
  cachedProducts,
  cachedCategories,
  onErrorChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<TargetItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<any>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setRowError(null);
    onErrorChange(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      const cache = row.type === 'SKU' ? cachedProducts : cachedCategories;
      setSuggestions(cache.slice(0, 10));
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        if (row.type === 'SKU') {
          const res = await productsService.getProducts({ search: val.trim(), limit: 20 });
          const items: TargetItem[] = (res.data || []).map((p: any) => ({
            code: p.sku,
            name: p.name,
          }));
          setSuggestions(items);
        } else {
          const q = val.trim().toLowerCase();
          const filtered = cachedCategories.filter(
            (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
          );
          setSuggestions(filtered.slice(0, 20));
        }
      } catch (err) {
        // Xử lý ngầm hoặc ignore
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSelect = (item: TargetItem) => {
    onAddItem(item);
    setSearchTerm('');
    setRowError(null);
    onErrorChange(null);
    setIsDropdownOpen(false);
  };

  const handleValidateManualCode = async (codeToVerify: string) => {
    const trimmed = codeToVerify.trim();
    if (!trimmed) return;

    if (row.type === 'SKU') {
      const existsInCache = cachedProducts.find(
        (p) => p.code.toLowerCase() === trimmed.toLowerCase()
      );
      if (existsInCache) {
        handleSelect(existsInCache);
        return;
      }
      try {
        const res = await productsService.getProducts({ search: trimmed, limit: 10 });
        const exactMatch = (res.data || []).find(
          (p: any) => p.sku.toLowerCase() === trimmed.toLowerCase()
        );
        if (exactMatch) {
          handleSelect({ code: exactMatch.sku, name: exactMatch.name });
          return;
        }
      } catch {}
      setRowError('Mã sản phẩm/nhóm hàng không tồn tại trong danh mục');
      onErrorChange('Mã sản phẩm/nhóm hàng không tồn tại trong danh mục');
    } else {
      const found = cachedCategories.find((c) => c.code.toLowerCase() === trimmed.toLowerCase());
      if (found) {
        handleSelect(found);
      } else {
        setRowError('Mã sản phẩm/nhóm hàng không tồn tại trong danh mục');
        onErrorChange('Mã sản phẩm/nhóm hàng không tồn tại trong danh mục');
      }
    }
  };

  const isCategoryDisabled = disabledTypes.includes('CATEGORY');
  const isSkuDisabled = disabledTypes.includes('SKU');

  return (
    <div className="space-y-1.5 p-3 rounded-xl border border-slate-200/80 bg-slate-50/40">
      <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
        {/* Dropdown chọn loại: Khoá loại đã được chọn ở dòng khác */}
        <div className="w-full sm:w-56 shrink-0">
          <select
            value={row.type}
            onChange={(e) => {
              onChangeType(e.target.value as any);
              setSearchTerm('');
              setRowError(null);
              onErrorChange(null);
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="CATEGORY" disabled={isCategoryDisabled}>
              {isCategoryDisabled ? '⛔ Nhóm hàng (Đã chọn ở dòng khác)' : 'Nhóm hàng (Category)'}
            </option>
            <option value="SKU" disabled={isSkuDisabled}>
              {isSkuDisabled ? '⛔ Sản phẩm lẻ (Đã chọn ở dòng khác)' : 'Sản phẩm lẻ (SKU)'}
            </option>
          </select>
        </div>

        {/* Multi-select input field */}
        <div className="flex-1 w-full relative" ref={dropdownRef}>
          <div
            className={`min-h-[42px] px-2.5 py-1.5 border rounded-lg bg-white flex flex-wrap items-center gap-1.5 transition-colors ${
              rowError
                ? 'border-rose-300 ring-2 ring-rose-100'
                : 'border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100'
            }`}
            onClick={() => {
              searchInputRef.current?.focus();
              setIsDropdownOpen(true);
            }}
          >
            {/* Tags đã chọn */}
            {row.items.map((item) => (
              <span
                key={item.code}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-800 text-xs font-medium animate-fadeIn"
              >
                <span className="font-semibold text-blue-900">[{item.code}]</span>
                <span className="truncate max-w-[180px]" title={item.name}>
                  {item.name}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveItem(item.code);
                  }}
                  className="p-0.5 hover:bg-blue-200/60 rounded text-blue-600 hover:text-blue-900 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Input tìm kiếm */}
            <div className="flex-1 min-w-[150px] flex items-center">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => {
                  setIsDropdownOpen(true);
                  if (suggestions.length === 0) {
                    const cache = row.type === 'SKU' ? cachedProducts : cachedCategories;
                    setSuggestions(cache.slice(0, 10));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (searchTerm.trim()) {
                      handleValidateManualCode(searchTerm);
                    }
                  }
                }}
                placeholder={
                  row.items.length === 0
                    ? row.type === 'SKU'
                      ? 'Gõ mã hoặc tên SKU để tìm (VD: MILK-VIN-01)...'
                      : 'Gõ mã hoặc tên nhóm hàng (VD: MILK)...'
                    : 'Thêm mục khác...'
                }
                className="w-full text-sm text-slate-800 placeholder-slate-400 bg-transparent border-none focus:outline-none px-1"
              />
              {isSearching && (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0 mr-1" />
              )}
            </div>
          </div>

          {/* Dropdown Đề xuất thông minh */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto p-1.5 space-y-0.5">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Đề xuất {row.type === 'SKU' ? 'Sản phẩm' : 'Nhóm hàng'}
              </div>
              {suggestions.length === 0 ? (
                <div className="px-3 py-3 text-xs text-slate-400 text-center">
                  {isSearching ? 'Đang tìm kiếm...' : 'Không tìm thấy kết quả phù hợp'}
                </div>
              ) : (
                suggestions.map((item) => {
                  const isSelected = row.items.some(
                    (t) => t.code.toLowerCase() === item.code.toLowerCase()
                  );
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/60 text-blue-700 font-medium'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="font-mono font-semibold text-slate-900">
                          [{item.code}]
                        </span>
                        <span className="text-slate-600 ml-1.5">- {item.name}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Nút xóa dòng phạm vi */}
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="Xóa phạm vi này"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {rowError && (
        <p className="text-xs font-semibold text-rose-500 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {rowError}
        </p>
      )}
    </div>
  );
};

export const DiscountPolicyFormModal: React.FC<DiscountPolicyFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [formData, setFormData] = useState<CreateDiscountPolicyPayload>({
    code: '',
    name: '',
    targetType: 'SKU',
    targetId: '',
    targetIds: [],
    appliedCategoryIds: [],
    appliedProductSkus: [],
    discountType: 'PERCENTAGE',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
      .toISOString()
      .split('T')[0],
    status: 'ACTIVE',
    tiers: [],
  });

  // Phạm vi áp dụng Đa tầng (Tối đa 2 dòng: 1 Nhóm hàng + 1 SKU lẻ)
  const [scopeRows, setScopeRows] = useState<ScopeRow[]>([
    { id: 'scope-1', type: 'CATEGORY', items: [] },
  ]);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  // Checkbox xác nhận bắt buộc ở vị trí áp chót (reset tự động khi có bất kỳ thay đổi nào)
  const [isConfirmed, setIsConfirmed] = useState(false);
  const isFormLoadedRef = useRef(false);

  // Cached Master Data
  const [cachedProducts, setCachedProducts] = useState<TargetItem[]>([]);
  const [cachedCategories, setCachedCategories] = useState<TargetItem[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tải Master Data cache
  useEffect(() => {
    if (!isOpen) return;

    productsService
      .getProducts({ limit: 100 })
      .then((res) => {
        const items: TargetItem[] = (res.data || []).map((p: any) => ({
          code: p.sku,
          name: p.name,
        }));
        setCachedProducts(items);
      })
      .catch(() => {});

    categoriesService
      .getCategories()
      .then((cats) => {
        const items: TargetItem[] = (cats || []).map((c: any) => ({
          code: c.code,
          name: c.name,
        }));
        setCachedCategories(items);
      })
      .catch(() => {});
  }, [isOpen]);

  // Khởi tạo dữ liệu khi mở Modal
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const initialScopeRows: ScopeRow[] = [];

        if (initialData.appliedCategoryIds && initialData.appliedCategoryIds.length > 0) {
          initialScopeRows.push({
            id: 'scope-cat',
            type: 'CATEGORY',
            items: initialData.appliedCategoryIds.map((code) => ({ code, name: code })),
          });
        }

        if (initialData.appliedProductSkus && initialData.appliedProductSkus.length > 0) {
          initialScopeRows.push({
            id: 'scope-sku',
            type: 'SKU',
            items: initialData.appliedProductSkus.map((code) => ({ code, name: code })),
          });
        }

        if (initialScopeRows.length === 0) {
          const rawIds: string[] =
            initialData.targetIds && initialData.targetIds.length > 0
              ? initialData.targetIds
              : initialData.targetId
                ? initialData.targetId
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                : [];

          const type: 'SKU' | 'CATEGORY' =
            initialData.targetType === 'CATEGORY' ? 'CATEGORY' : 'SKU';
          initialScopeRows.push({
            id: 'scope-default',
            type,
            items: rawIds.map((code) => ({ code, name: code })),
          });
        }

        setScopeRows(initialScopeRows);
        setFormData({
          code: initialData.code,
          name: initialData.name,
          targetType: initialData.targetType,
          targetId: initialData.targetId,
          targetIds: initialData.targetIds || [],
          appliedCategoryIds: initialData.appliedCategoryIds || [],
          appliedProductSkus: initialData.appliedProductSkus || [],
          discountType: initialData.discountType,
          startDate: initialData.startDate.split('T')[0],
          endDate: initialData.endDate.split('T')[0],
          status: initialData.status,
          tiers: initialData.tiers.map((t) => ({ ...t })),
        });
      } else {
        setScopeRows([{ id: 'scope-1', type: 'CATEGORY', items: [] }]);
        setFormData({
          code: `DP-${Date.now().toString().slice(-6)}`,
          name: '',
          targetType: 'CATEGORY',
          targetId: '',
          targetIds: [],
          appliedCategoryIds: [],
          appliedProductSkus: [],
          discountType: 'PERCENTAGE',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
            .toISOString()
            .split('T')[0],
          status: 'ACTIVE',
          tiers: [{ minQuantity: 1, maxQuantity: null, discountValue: 0 }],
        });
      }
      setIsConfirmed(false);
      setRowErrors({});
      setErrors({});
      isFormLoadedRef.current = false;
      const timer = setTimeout(() => {
        isFormLoadedRef.current = true;
      }, 80);
      return () => clearTimeout(timer);
    } else {
      isFormLoadedRef.current = false;
      setIsConfirmed(false);
    }
  }, [isOpen, initialData]);

  // Quy tắc Reset tự động: Bất kỳ thay đổi nào trên Form sẽ tự động bỏ tích ô xác nhận áp chót
  useEffect(() => {
    if (isFormLoadedRef.current) {
      setIsConfirmed(false);
    }
  }, [formData, scopeRows]);

  // Cập nhật tên từ cache khi nạp xong
  useEffect(() => {
    if (scopeRows.length > 0 && (cachedProducts.length > 0 || cachedCategories.length > 0)) {
      setScopeRows((prev) =>
        prev.map((row) => {
          const cache = row.type === 'SKU' ? cachedProducts : cachedCategories;
          return {
            ...row,
            items: row.items.map((item) => {
              const found = cache.find((c) => c.code.toLowerCase() === item.code.toLowerCase());
              return found ? { code: found.code, name: found.name } : item;
            }),
          };
        })
      );
    }
  }, [cachedProducts, cachedCategories]);

  // Thêm dòng phạm vi mới (tối đa 2 dòng: 1 Nhóm hàng + 1 SKU lẻ)
  const canAddScopeRow = scopeRows.length < 2;

  const handleAddScopeRow = () => {
    if (scopeRows.length >= 2) return;
    const existingType = scopeRows[0]?.type || 'CATEGORY';
    const newType = existingType === 'CATEGORY' ? 'SKU' : 'CATEGORY';
    setScopeRows((prev) => [...prev, { id: `scope-${Date.now()}`, type: newType, items: [] }]);
  };

  const handleRemoveScopeRow = (rowId: string) => {
    setScopeRows((prev) => prev.filter((r) => r.id !== rowId));
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  };

  const handleChangeRowType = (rowId: string, newType: 'SKU' | 'CATEGORY') => {
    setScopeRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, type: newType, items: [] } : r))
    );
  };

  const handleAddItemToRow = (rowId: string, item: TargetItem) => {
    setScopeRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        if (r.items.some((i) => i.code.toLowerCase() === item.code.toLowerCase())) return r;
        return { ...r, items: [...r.items, item] };
      })
    );
  };

  const handleRemoveItemFromRow = (rowId: string, code: string) => {
    setScopeRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return { ...r, items: r.items.filter((i) => i.code.toLowerCase() !== code.toLowerCase()) };
      })
    );
  };

  // Kiểm tra lỗi logic vi phạm bắt buộc chặn Lưu
  const hasLogicError = useMemo(() => {
    return formData.tiers.some((tier) => {
      if (formData.discountType === 'PERCENTAGE') {
        return tier.discountValue < 0 || tier.discountValue > 100;
      } else {
        return tier.discountValue < 0;
      }
    });
  }, [formData.tiers, formData.discountType]);

  const hasQMaxError = useMemo(() => {
    return formData.tiers.some(
      (tier) => tier.maxQuantity !== null && tier.maxQuantity <= tier.minQuantity
    );
  }, [formData.tiers]);

  const totalSelectedCount = useMemo(() => {
    return scopeRows.reduce((acc, r) => acc + r.items.length, 0);
  }, [scopeRows]);

  const hasMasterDataErrors = Object.values(rowErrors).some((err) => Boolean(err));

  // Trạng thái vô hiệu hóa nút Lưu (Bắt buộc phải tích checkbox xác nhận áp chót)
  const isSaveDisabled = useMemo(() => {
    if (isSubmitting) return true;
    if (!isConfirmed) return true; // BẮT BỘC: Nếu ô Checkbox xác nhận CHƯA ĐƯỢC TÍCH, nút Lưu bị vô hiệu hóa
    if (!formData.name.trim()) return true;
    if (totalSelectedCount === 0) return true;
    if (hasMasterDataErrors) return true;
    if (formData.tiers.length === 0) return true;
    if (hasLogicError) return true;
    if (hasQMaxError) return true;
    if (formData.startDate > formData.endDate) return true;
    return false;
  }, [
    isSubmitting,
    isConfirmed,
    formData.name,
    totalSelectedCount,
    hasMasterDataErrors,
    formData.tiers.length,
    hasLogicError,
    hasQMaxError,
    formData.startDate,
    formData.endDate,
  ]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Tên chính sách không được để trống';
    if (totalSelectedCount === 0)
      newErrors.targetId = 'Vui lòng chọn ít nhất 1 sản phẩm hoặc nhóm hàng';
    if (formData.startDate > formData.endDate)
      newErrors.date = 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu';

    if (formData.tiers.length === 0) {
      newErrors.tiers = 'Phải có ít nhất 1 nấc chiết khấu';
    } else {
      let tierError = '';
      const sortedTiers = [...formData.tiers].sort((a, b) => a.minQuantity - b.minQuantity);

      for (let i = 0; i < sortedTiers.length; i++) {
        const tier = sortedTiers[i];
        if (tier.minQuantity < 1) {
          tierError = 'Số lượng tối thiểu phải >= 1';
          break;
        }
        if (tier.maxQuantity !== null && tier.maxQuantity <= tier.minQuantity) {
          tierError = `Nấc ${i + 1}: Q_max phải lớn hơn Q_min`;
          break;
        }
        if (formData.discountType === 'PERCENTAGE') {
          if (tier.discountValue < 0 || tier.discountValue > 100) {
            tierError = `Nấc ${i + 1}: Mức chiết khấu không hợp lệ (Phải từ 0% đến 100%)`;
            break;
          }
        } else {
          if (tier.discountValue < 0) {
            tierError = `Nấc ${i + 1}: Mức giảm không được âm`;
            break;
          }
        }
        if (i > 0) {
          const prevTier = sortedTiers[i - 1];
          if (prevTier.maxQuantity === null || tier.minQuantity <= prevTier.maxQuantity) {
            tierError = 'Các khoảng số lượng không được chồng chéo nhau';
            break;
          }
        }
      }
      if (tierError) newErrors.tiers = tierError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const catCodes = scopeRows
      .filter((r) => r.type === 'CATEGORY')
      .flatMap((r) => r.items.map((i) => i.code));
    const skuCodes = scopeRows
      .filter((r) => r.type === 'SKU')
      .flatMap((r) => r.items.map((i) => i.code));

    const appliedCategoryIds = Array.from(new Set(catCodes));
    const appliedProductSkus = Array.from(new Set(skuCodes));

    let finalTargetType: 'SKU' | 'CATEGORY' | 'HYBRID' = 'SKU';
    if (appliedCategoryIds.length > 0 && appliedProductSkus.length > 0) {
      finalTargetType = 'HYBRID';
    } else if (appliedCategoryIds.length > 0) {
      finalTargetType = 'CATEGORY';
    } else {
      finalTargetType = 'SKU';
    }

    const allTargetIds = [...appliedCategoryIds, ...appliedProductSkus];

    setIsSubmitting(true);
    try {
      const payload: CreateDiscountPolicyPayload = {
        ...formData,
        targetType: finalTargetType,
        targetId: allTargetIds.join(', '),
        targetIds: allTargetIds,
        appliedCategoryIds,
        appliedProductSkus,
      };
      await onSubmit(payload, initialData?.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTier = () => {
    setFormData((prev) => {
      const lastTier = prev.tiers[prev.tiers.length - 1];
      let newMin = 1;
      if (lastTier) {
        if (lastTier.maxQuantity !== null) {
          newMin = lastTier.maxQuantity + 1;
        } else {
          newMin = lastTier.minQuantity + 10;
        }
      }
      return {
        ...prev,
        tiers: [...prev.tiers, { minQuantity: newMin, maxQuantity: null, discountValue: 0 }],
      };
    });
  };

  const handleRemoveTier = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      tiers: prev.tiers.filter((_, i) => i !== index),
    }));
  };

  const handleTierChange = (
    index: number,
    field: keyof (typeof formData.tiers)[0],
    value: number | null
  ) => {
    setFormData((prev) => {
      const newTiers = [...prev.tiers];
      newTiers[index] = { ...newTiers[index], [field]: value };
      return { ...prev, tiers: newTiers };
    });
  };

  // Đồng bộ cảnh báo dưới chân ô input (Ngắn gọn, không dùng dấu ngoặc kép)
  const getTierNotice = (val: number, type: 'PERCENTAGE' | 'FIXED_AMOUNT') => {
    if (type === 'PERCENTAGE') {
      if (val === 0) {
        return {
          color: 'text-slate-500',
          message: 'ℹ️ Mức giảm 0% (Tạm dừng chiết khấu cho nấc này)',
        };
      }
      if (val < 0 || val > 100) {
        return {
          color: 'text-rose-600 font-semibold',
          message: '🚨 Mức chiết khấu không hợp lệ (Phải từ 0% đến 100%)',
        };
      }
      if (val > 20 && val <= 100) {
        return {
          color: 'text-orange-600 font-medium',
          message: '🟠 Mức chiết khấu lớn (>20%) có nguy cơ ảnh hưởng biên lợi nhuận!',
        };
      }
      if (val > 10 && val <= 20) {
        return {
          color: 'text-amber-600 font-medium',
          message: '⚠️ Mức chiết khấu cao hơn thông thường (10% - 20%).',
        };
      }
    } else {
      // VNĐ
      if (val === 0) {
        return {
          color: 'text-slate-500',
          message: 'ℹ️ Mức giảm 0 VNĐ (Tạm dừng chiết khấu cho nấc này)',
        };
      }
      if (val < 0) {
        return {
          color: 'text-rose-600 font-semibold',
          message: '🚨 Mức giảm không được âm',
        };
      }
      if (val > 1_000_000_000) {
        return {
          color: 'text-orange-600 font-medium',
          message: '🟠 Mức giá rất lớn có nguy cơ ảnh hưởng biên lợi nhuận!',
        };
      }
      if (val >= 100_000_000 && val <= 1_000_000_000) {
        return {
          color: 'text-amber-600 font-medium',
          message: '⚠️ Mức giá lớn, vui lòng kiểm tra kỹ',
        };
      }
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {initialData ? 'Chỉnh sửa Chính sách Chiết khấu' : 'Thêm mới Chính sách Chiết khấu'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Phạm vi áp dụng đa tầng, nấc chiết khấu linh hoạt & cảnh báo thông minh
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form id="discount-policy-form" onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Thông tin chung */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-800">Thông tin chung</h3>

              {/* Dòng 1: Mã chính sách & Tên chính sách */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Mã chính sách
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600 focus:outline-none"
                    placeholder="Mã tự động"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tên chính sách <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                      errors.name
                        ? 'border-rose-300 focus:ring-rose-200'
                        : 'border-slate-200 focus:ring-blue-100'
                    }`}
                    placeholder="Ví dụ: Chiết khấu sản lượng Tháng 10"
                  />
                  {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
                </div>
              </div>

              {/* Dòng 2: PHẠM VI ÁP DỤNG ĐA TẦNG (Tối đa 1 Nhóm hàng + 1 SKU lẻ) */}
              <div className="w-full space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-700">
                    Phạm vi áp dụng <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Mỗi loại (Nhóm hàng & Sản phẩm lẻ) chỉ được chọn tối đa 1 lần
                  </span>
                </div>

                {/* Danh sách các dòng phạm vi áp dụng */}
                <div className="space-y-2">
                  {scopeRows.map((row) => {
                    const disabledTypes = scopeRows
                      .filter((r) => r.id !== row.id)
                      .map((r) => r.type);

                    return (
                      <ScopeRowItem
                        key={row.id}
                        row={row}
                        canDelete={scopeRows.length > 1}
                        disabledTypes={disabledTypes}
                        onDelete={() => handleRemoveScopeRow(row.id)}
                        onChangeType={(newType) => handleChangeRowType(row.id, newType)}
                        onAddItem={(item) => handleAddItemToRow(row.id, item)}
                        onRemoveItem={(code) => handleRemoveItemFromRow(row.id, code)}
                        cachedProducts={cachedProducts}
                        cachedCategories={cachedCategories}
                        onErrorChange={(err) => {
                          setRowErrors((prev) => ({ ...prev, [row.id]: err || '' }));
                        }}
                      />
                    );
                  })}
                </div>

                {/* Nút bấm "+ Thêm phạm vi áp dụng" (Vô hiệu hóa khi đã chọn đủ 2 phạm vi) */}
                <button
                  type="button"
                  onClick={handleAddScopeRow}
                  disabled={!canAddScopeRow}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    canAddScopeRow
                      ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {canAddScopeRow
                    ? '+ Thêm phạm vi áp dụng'
                    : 'Đã chọn tối đa 2 phạm vi (Nhóm hàng & SKU lẻ)'}
                </button>

                {errors.targetId && (
                  <p className="mt-1 text-xs text-rose-500 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.targetId}
                  </p>
                )}
              </div>

              {/* Dòng 3: LOẠI CHIẾT KHẤU & TRẠNG THÁI */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Loại chiết khấu <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, discountType: e.target.value as any }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="PERCENTAGE">% Phần trăm</option>
                    <option value="FIXED_AMOUNT">Số tiền cố định (VNĐ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="ACTIVE">Kích hoạt</option>
                    <option value="INACTIVE">Tạm ngưng</option>
                  </select>
                </div>
              </div>

              {/* Dòng 4: Thời gian hiệu lực (Từ ngày - Đến ngày) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Từ ngày <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData((p) => ({ ...p, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Đến ngày <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
              {errors.date && <p className="text-xs text-rose-500 mt-1">{errors.date}</p>}
            </div>

            {/* 2. Cấu hình nấc chiết khấu */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    Cấu hình nấc chiết khấu theo sản lượng
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hỗ trợ mức giảm 0% hoặc 0 VNĐ để tạm dừng chiết khấu tại nấc chỉ định.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTier}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm nấc
                </button>
              </div>

              {errors.tiers && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errors.tiers}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="text-slate-500 font-medium bg-slate-50">
                      <th className="py-2.5 px-3 border-b border-slate-200 w-12 text-center rounded-tl-lg">
                        STT
                      </th>
                      <th className="py-2.5 px-3 border-b border-slate-200 w-48">
                        Từ số lượng (Q_min)
                      </th>
                      <th className="py-2.5 px-3 border-b border-slate-200 w-56">
                        Đến số lượng (Q_max)
                      </th>
                      <th className="py-2.5 px-3 border-b border-slate-200">
                        Mức giảm ({formData.discountType === 'PERCENTAGE' ? '%' : 'VNĐ'})
                      </th>
                      <th className="py-2.5 px-3 border-b border-slate-200 w-16 text-center rounded-tr-lg">
                        Xóa
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.tiers.map((tier, idx) => {
                      const isQMaxInvalid =
                        tier.maxQuantity !== null && tier.maxQuantity <= tier.minQuantity;
                      const tierNotice = getTierNotice(tier.discountValue, formData.discountType);

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 border-b border-slate-100 text-center text-slate-400 font-mono text-xs align-top pt-3.5">
                            {idx + 1}
                          </td>

                          {/* Q_min */}
                          <td className="py-3 px-3 border-b border-slate-100 align-top">
                            <QuantityInput
                              value={tier.minQuantity}
                              onChange={(val) => handleTierChange(idx, 'minQuantity', val ?? 1)}
                              placeholder="Từ số lượng"
                            />
                          </td>

                          {/* Q_max kèm Real-time validation */}
                          <td className="py-3 px-3 border-b border-slate-100 align-top">
                            <QuantityInput
                              value={tier.maxQuantity}
                              onChange={(val) => handleTierChange(idx, 'maxQuantity', val)}
                              placeholder="Không giới hạn"
                              allowNull={true}
                              hasError={isQMaxInvalid}
                            />
                            {isQMaxInvalid && (
                              <p className="mt-1 text-[11px] font-semibold text-rose-500 leading-tight">
                                Q<sub>max</sub> ({tier.maxQuantity}) phải lớn hơn Q<sub>min</sub> (
                                {tier.minQuantity})
                              </p>
                            )}
                          </td>

                          {/* Mức giảm kèm Gợi ý thông minh & Cảnh báo hiển thị 1 dòng dưới chân ô input */}
                          <td className="py-3 px-3 border-b border-slate-100 align-top">
                            <DiscountValueInput
                              value={tier.discountValue}
                              discountType={formData.discountType}
                              onChange={(val) => handleTierChange(idx, 'discountValue', val)}
                              hasError={Boolean(tierNotice && tierNotice.color.includes('rose'))}
                            />
                            {tierNotice && (
                              <p className={`mt-1 text-[11px] leading-tight ${tierNotice.color}`}>
                                {tierNotice.message}
                              </p>
                            )}
                          </td>

                          {/* Nút xóa nấc */}
                          <td className="py-3 px-3 border-b border-slate-100 text-center align-top pt-2">
                            <button
                              type="button"
                              onClick={() => handleRemoveTier(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {formData.tiers.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-slate-400 text-sm border-b border-slate-100"
                        >
                          Chưa có nấc chiết khấu nào. Vui lòng thêm ít nhất 1 nấc.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </form>
        </div>

        {/* Footer: Vị trí áp chót chứa Ô Checkbox xác nhận bắt buộc + Hàng 2 nút hành động */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-3">
          {/* Vị trí Áp chót: Ô Checkbox xác nhận bắt buộc */}
          <div className="flex items-center">
            <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800 select-none bg-white border border-slate-200 hover:border-blue-400 px-3.5 py-2.5 rounded-xl shadow-2xs transition-all w-full sm:w-auto">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span>Tôi đã kiểm tra kỹ và xác nhận áp dụng chính sách chiết khấu này</span>
            </label>
          </div>

          {/* Hàng chứa 2 nút Hủy bỏ và Lưu chính sách */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              disabled={isSubmitting}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              form="discount-policy-form"
              disabled={isSaveDisabled}
              className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer ${
                isSaveDisabled
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-70'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
              }`}
            >
              {isSubmitting ? (
                <>Đang lưu...</>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Lưu chính sách
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
