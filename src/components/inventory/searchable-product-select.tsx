import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Package } from 'lucide-react';
import { matchesSearchTerm } from '../../utils/vietnamese';
import type { Product } from '../../types/products';
import type { StockBalance } from '../../types/inventory.types';

export interface SearchableProductSelectProps {
  products: Product[];
  selectedProductId: string;
  onSelectProduct: (product: Product) => void;
  sourceStocks?: StockBalance[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Component Combobox Tìm kiếm & Chọn sản phẩm (SN-181)
 * Tuân thủ CODE_CONVENTION.md:
 * - PascalCase component, kebab-case file
 * - Nhận props, không gọi API trực tiếp
 * - Strict type, zero any
 * - Hỗ trợ tìm kiếm theo SKU, tên sản phẩm có dấu và không dấu
 */
export const SearchableProductSelect: React.FC<SearchableProductSelectProps> = ({
  products,
  selectedProductId,
  onSelectProduct,
  sourceStocks = [],
  disabled = false,
  placeholder = 'Chọn sản phẩm cần chuyển...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sản phẩm đang được chọn
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId],
  );

  // Lọc sản phẩm theo từ khóa tìm kiếm (hỗ trợ SKU, Tên có dấu & không dấu)
  const filteredProducts = useMemo(() => {
    const q = searchKeyword.trim();
    if (!q) return products;
    return products.filter(
      (p) => matchesSearchTerm(p.name, q) || matchesSearchTerm(p.sku, q),
    );
  }, [products, searchKeyword]);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false);
    setSearchKeyword('');
  } else if (isOpen && !prevIsOpen) {
    setPrevIsOpen(true);
  }

  // Tự động focus vào input tìm kiếm khi mở popover
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Đóng khi click ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Lấy tồn khả dụng tại kho xuất cho từng sản phẩm
  const getProductAvailableStock = (sku: string): number | undefined => {
    const found = sourceStocks.find(
      (s) => s.sku.trim().toUpperCase() === sku.trim().toUpperCase(),
    );
    if (!found) return undefined;
    return found.availableQuantity ?? found.stockQuantity ?? 0;
  };

  const handleSelect = (product: Product) => {
    onSelectProduct(product);
    setIsOpen(false);
    setSearchKeyword('');
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between text-left text-xs bg-white border rounded-md px-2.5 py-1.5 transition-colors cursor-pointer outline-none ${
          isOpen
            ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/10'
            : 'border-slate-200 hover:border-slate-300'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`}
      >
        <div className="flex items-center gap-2 truncate pr-1">
          {selectedProduct ? (
            <div className="truncate">
              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] mr-1.5">
                {selectedProduct.sku}
              </span>
              <span className="font-semibold text-slate-800">
                {selectedProduct.name}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
            isOpen ? 'rotate-180 text-[var(--color-primary)]' : ''
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[280px] bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Input Bar */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Gõ mã SKU hoặc tên sản phẩm..."
                className="w-full text-xs pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 outline-none text-slate-800 placeholder:text-slate-400"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Product Items List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-slate-400">
                <Package className="w-6 h-6 mx-auto mb-1 stroke-[1.5] text-slate-300" />
                <p className="text-xs">Không tìm thấy sản phẩm nào</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Thử tìm bằng mã SKU hoặc từ khóa khác
                </p>
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isSelected = p.id === selectedProductId;
                const availableStock = getProductAvailableStock(p.sku);
                const isOutOfStock =
                  availableStock !== undefined && availableStock <= 0;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelect(p)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50/60' : ''
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                          {p.sku}
                        </span>
                        <span
                          className={`font-semibold truncate ${
                            isSelected
                              ? 'text-[var(--color-primary)]'
                              : 'text-slate-800'
                          }`}
                        >
                          {p.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>ĐVT: {p.baseUnit}</span>
                        {availableStock !== undefined && (
                          <span
                            className={
                              isOutOfStock
                                ? 'text-rose-600 font-semibold'
                                : 'text-emerald-600 font-semibold'
                            }
                          >
                            Tồn khả dụng: {availableStock} {p.baseUnit}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
