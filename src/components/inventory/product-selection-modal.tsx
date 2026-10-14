import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Package,
  Check,
  Filter,
  Boxes,
} from 'lucide-react';
import { ModalLayout } from '../modal-layout';
import type { Product } from '../../types/products';
import type { StockBalance } from '../../types/inventory.types';

export interface ProductSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  sourceStocks: StockBalance[];
  alreadySelectedProductIds: string[];
  onConfirmSelect: (selectedProducts: Product[]) => void;
}

/**
 * Hàm chuẩn hóa loại bỏ dấu Tiếng Việt phục vụ tìm kiếm không dấu
 */
const removeAccents = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

/**
 * Kiểm tra chuỗi chứa từ khóa tìm kiếm (hỗ trợ không dấu)
 */
const matchesSearchTerm = (text: string, term: string): boolean => {
  if (!term.trim()) return true;
  return removeAccents(text).includes(removeAccents(term));
};

/**
 * Modal tìm kiếm và chọn nhiều sản phẩm cùng lúc để điều chuyển kho (SN-181)
 * Thiết kế giao diện to rộng rãi, có bộ lọc và chọn hàng loạt (checkbox)
 */
export const ProductSelectionModal: React.FC<ProductSelectionModalProps> = ({
  isOpen,
  onClose,
  products,
  sourceStocks,
  alreadySelectedProductIds,
  onConfirmSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [checkedProductIds, setCheckedProductIds] = useState<Set<string>>(new Set());

  // Lấy danh sách các danh mục độc nhất
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Map tồn kho khả dụng theo SKU để tra cứu nhanh O(1)
  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    sourceStocks.forEach((s) => {
      map.set(s.sku.toUpperCase(), s.availableQuantity ?? s.stockQuantity ?? 0);
    });
    return map;
  }, [sourceStocks]);

  // Lọc sản phẩm theo từ khóa, danh mục và tồn kho
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Lọc theo danh mục
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }

      // 2. Lọc theo tồn kho khả dụng
      const availStock = stockMap.get(p.sku.toUpperCase()) ?? 0;
      if (onlyInStock && availStock <= 0) {
        return false;
      }

      // 3. Lọc theo từ khóa tìm kiếm (tên, SKU, danh mục, quy cách)
      if (!searchTerm.trim()) return true;
      const term = searchTerm.trim();
      return (
        matchesSearchTerm(p.name, term) ||
        matchesSearchTerm(p.sku, term) ||
        matchesSearchTerm(p.category || '', term) ||
        matchesSearchTerm(p.packagingSpec || '', term)
      );
    });
  }, [products, selectedCategory, onlyInStock, searchTerm, stockMap]);

  const [prevIsOpen, setPrevIsOpen] = React.useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setCheckedProductIds(new Set());
      setSearchTerm('');
      setSelectedCategory('ALL');
      setOnlyInStock(false);
    }
  }

  // Toggle chọn một sản phẩm
  const handleToggleProduct = (productId: string) => {
    setCheckedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // Toggle chọn tất cả sản phẩm đang lọc
  const handleToggleSelectAll = () => {
    const selectableProducts = filteredProducts.filter(
      (p) => !alreadySelectedProductIds.includes(p.id),
    );

    const allChecked = selectableProducts.length > 0 && selectableProducts.every((p) =>
      checkedProductIds.has(p.id),
    );

    setCheckedProductIds((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        selectableProducts.forEach((p) => next.delete(p.id));
      } else {
        selectableProducts.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  // Xác nhận thêm các sản phẩm đã chọn
  const handleConfirm = () => {
    const selectedList = products.filter((p) => checkedProductIds.has(p.id));
    if (selectedList.length > 0) {
      onConfirmSelect(selectedList);
      onClose();
    }
  };

  const selectableCount = filteredProducts.filter(
    (p) => !alreadySelectedProductIds.includes(p.id),
  ).length;

  const isAllSelected =
    selectableCount > 0 &&
    filteredProducts
      .filter((p) => !alreadySelectedProductIds.includes(p.id))
      .every((p) => checkedProductIds.has(p.id));

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title="Chọn Hàng Hóa Điều Chuyển Kho"
      subtitle="Tìm kiếm theo mã SKU hoặc tên, chọn nhiều sản phẩm cùng lúc để đưa vào phiếu"
      icon={<Boxes className="w-5 h-5 text-[var(--color-primary)]" />}
      maxWidth="max-w-5xl"
      bodyClassName="p-4 sm:p-6 space-y-4 text-xs text-slate-700"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-600">
            Đã chọn:{' '}
            <strong className="text-[var(--color-primary)] text-sm font-bold">
              {checkedProductIds.size}
            </strong>{' '}
            mặt hàng
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={checkedProductIds.size === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-3.5 h-3.5" />
              Xác nhận thêm ({checkedProductIds.size}) sản phẩm
            </button>
          </div>
        </div>
      }
    >
      {/* 1. KHU VỰC TÌM KIẾM & BỘ LỌC TO RỘNG */}
      <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200 space-y-3">
        {/* Ô tìm kiếm lớn */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Gõ mã SKU, tên sản phẩm hoặc quy cách để tìm kiếm..."
            autoFocus
            className="w-full text-xs sm:text-sm pl-10 pr-9 py-2.5 bg-white border border-slate-300 rounded-xl focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 outline-none text-slate-800 placeholder:text-slate-400 shadow-2xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Thanh bộ lọc bổ trợ */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Danh mục:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-[var(--color-primary)]"
            >
              <option value="ALL">Tất cả danh mục ({products.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={onlyInStock}
              onChange={(e) => setOnlyInStock(e.target.checked)}
              className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20 cursor-pointer"
            />
            <span>Chỉ hiện sản phẩm còn tồn kho khả dụng</span>
          </label>
        </div>
      </div>

      {/* 2. BẢNG HIỂN THỊ DANH SÁCH SẢN PHẨM KHỔ TO */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="max-h-[380px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    disabled={selectableCount === 0}
                    className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20 cursor-pointer disabled:opacity-40"
                    title="Chọn tất cả"
                  />
                </th>
                <th className="py-2.5 px-3 w-10 text-center">STT</th>
                <th className="py-2.5 px-3 w-36">Mã SKU</th>
                <th className="py-2.5 px-3">Tên sản phẩm & Quy cách</th>
                <th className="py-2.5 px-3 w-28">ĐVT chuẩn</th>
                <th className="py-2.5 px-3 w-36 text-right">Tồn kho khả dụng</th>
                <th className="py-2.5 px-3 w-32 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="font-medium text-slate-600">Không tìm thấy sản phẩm nào phù hợp</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Vui lòng thử tìm kiếm với từ khóa khác hoặc tắt bộ lọc
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, index) => {
                  const isAlreadyIn = alreadySelectedProductIds.includes(p.id);
                  const isChecked = checkedProductIds.has(p.id);
                  const availStock = stockMap.get(p.sku.toUpperCase()) ?? 0;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => {
                        if (!isAlreadyIn) handleToggleProduct(p.id);
                      }}
                      className={`transition-colors select-none ${
                        isAlreadyIn
                          ? 'bg-slate-50/80 opacity-60 cursor-not-allowed'
                          : isChecked
                          ? 'bg-purple-50/60 hover:bg-purple-50/90 cursor-pointer'
                          : 'hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked || isAlreadyIn}
                          disabled={isAlreadyIn}
                          onChange={() => handleToggleProduct(p.id)}
                          className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20 cursor-pointer disabled:opacity-50"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {p.sku}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        {p.category && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {p.category} {p.packagingSpec ? `· ${p.packagingSpec}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {p.baseUnit}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {availStock > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded font-bold text-emerald-700 bg-emerald-50 border border-emerald-100">
                            {availStock} <span className="font-normal text-[11px]">{p.baseUnit}</span>
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-slate-400 bg-slate-100 font-medium">
                            0 {p.baseUnit}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isAlreadyIn ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-500 bg-slate-200/80">
                            Đã trong phiếu
                          </span>
                        ) : isChecked ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-[var(--color-primary)]">
                            Đang chọn
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ModalLayout>
  );
};
