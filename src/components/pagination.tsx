import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  itemLabel?: string;
  showRecordRange?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
  showFirstLast?: boolean;
  variant?: 'default' | 'floating';
}

/**
 * Component Pagination chuẩn LOHA SALES (UI_GUIDELINES Section 28 & Section 91)
 * - Nút trang kích thước chuẩn h-8, bo góc rounded-lg đồng bộ với toàn hệ thống
 * - Trang hiện tại nổi bật bằng màu Primary Brand Color (Indigo-600)
 * - Tự động ẩn nút Đầu / Cuối khi số trang ít (<= 5) để tránh quá nhiều nút thừa
 * - Cho phép ẩn dải hiển thị số bản ghi bằng prop showRecordRange={false}
 * - Dropdown chọn số dòng / trang bo góc rounded-lg đồng nhất
 */
export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  itemLabel = 'bản ghi',
  showRecordRange = true,
  onPageChange,
  onPageSizeChange,
  className = '',
  showFirstLast = true,
  variant = 'default',
}) => {
  if (totalPages <= 0 && (!totalItems || totalItems === 0)) {
    return null;
  }

  const validTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, currentPage), validTotalPages);

  // Thuật toán hiển thị dải trang thông minh
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 1; // số trang liền kề 2 bên

    const left = safePage - delta;
    const right = safePage + delta + 1;
    let l: number | null = null;

    for (let i = 1; i <= validTotalPages; i++) {
      if (i === 1 || i === validTotalPages || (i >= left && i < right)) {
        pages.push(i);
      }
    }

    const pagesWithEllipsis: (number | string)[] = [];
    for (const p of pages) {
      if (typeof p === 'number') {
        if (l !== null) {
          if (p - l === 2) {
            pagesWithEllipsis.push(l + 1);
          } else if (p - l !== 1) {
            pagesWithEllipsis.push('...');
          }
        }
        pagesWithEllipsis.push(p);
        l = p;
      }
    }

    return pagesWithEllipsis;
  };

  const pages = getPageNumbers();

  const fromIndex =
    totalItems && totalItems > 0 ? Math.min((safePage - 1) * (pageSize || 10) + 1, totalItems) : 0;
  const toIndex = totalItems && totalItems > 0 ? Math.min(safePage * (pageSize || 10), totalItems) : 0;

  const containerClasses =
    variant === 'floating'
      ? 'flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none px-4 sm:px-6 py-3 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-900/10'
      : 'flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none px-4 py-3 bg-white border-t border-slate-100';

  // Chỉ hiển thị nút nhảy Đầu / Cuối khi số trang lớn (> 5) và có bật cờ showFirstLast
  const shouldRenderFirstLast = showFirstLast && validTotalPages > 5;

  return (
    <div className={`${containerClasses} ${className}`}>
      {/* Thông tin số dòng/trang & số bản ghi */}
      <div className="flex flex-wrap items-center gap-3 text-slate-500 font-medium">
        {showRecordRange && totalItems !== undefined && (
          <span className="flex items-center gap-1">
            Hiển thị <strong className="text-slate-800 font-bold">{fromIndex} - {toIndex}</strong> trong số{' '}
            <strong className="text-slate-800 font-bold">{totalItems}</strong> {itemLabel}
          </span>
        )}

        {onPageSizeChange && pageSize && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-xs font-medium">Số dòng:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Chọn số dòng trên một trang"
              className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white text-slate-700 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-medium cursor-pointer shadow-2xs hover:border-slate-300 transition-all text-xs"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Cụm nút chuyển trang */}
      <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap justify-center">
        {/* Nút Trang đầu */}
        {shouldRenderFirstLast && (
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={safePage <= 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-indigo-600 hover:border-slate-300 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-500 disabled:cursor-not-allowed transition-all cursor-pointer font-medium active:scale-95 shadow-2xs text-xs"
            title="Trang đầu tiên"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Nút Trước (<) */}
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 hover:border-slate-300 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-600 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95 shadow-2xs"
          title="Trang trước"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Danh sách các số trang */}
        <div className="flex items-center gap-1">
          {pages.map((p, index) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="w-6 h-8 flex items-center justify-center text-slate-400 font-bold"
                >
                  ...
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === safePage;

            return (
              <button
                key={`page-${pageNum}`}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[32px] h-8 px-2 flex items-center justify-center rounded-lg transition-all duration-150 cursor-pointer text-xs active:scale-95 ${
                  isActive
                    ? 'bg-indigo-600 border border-indigo-600 text-white font-bold shadow-xs shadow-indigo-600/20'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-indigo-600 hover:border-slate-300 font-semibold shadow-2xs'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Nút Sau (>) */}
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= validTotalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 hover:border-slate-300 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-600 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95 shadow-2xs"
          title="Trang sau"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Nút Trang cuối */}
        {shouldRenderFirstLast && (
          <button
            type="button"
            onClick={() => onPageChange(validTotalPages)}
            disabled={safePage >= validTotalPages}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-indigo-600 hover:border-slate-300 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-500 disabled:cursor-not-allowed transition-all cursor-pointer font-medium active:scale-95 shadow-2xs text-xs"
            title={`Trang cuối (${validTotalPages})`}
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
