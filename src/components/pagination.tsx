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
  size?: 'xs' | 'sm' | 'md';
}

/**
 * Component Pagination chuẩn LOHA SALES (UI_GUIDELINES Section 28 & Section 91)
 * - Nút trang kích thước chuẩn h-8, bo góc rounded-lg đồng bộ với toàn hệ thống
 * - Hỗ trợ size 'xs' siêu nhỏ gọn (giảm từ 5 điểm về 3 điểm)
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
  size = 'md',
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

  const isXs = size === 'xs';
  const isSmall = size === 'sm' || isXs;

  const containerClasses =
    variant === 'floating'
      ? isXs
        ? 'flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[11px] select-none px-2.5 sm:px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-lg border border-slate-200/90 shadow-md shadow-slate-900/10'
        : isSmall
        ? 'flex flex-col sm:flex-row items-center justify-between gap-2 text-xs select-none px-3 sm:px-4 py-2 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/90 shadow-lg shadow-slate-900/10'
        : 'flex flex-col sm:flex-row items-center justify-between gap-3 text-sm select-none px-4 sm:px-6 py-3 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-900/10'
      : isXs
        ? 'flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] select-none px-3 py-1.5 bg-white border-t border-slate-100'
        : isSmall
        ? 'flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs select-none px-4 py-2 bg-white border-t border-slate-100'
        : 'flex flex-col sm:flex-row items-center justify-between gap-3 text-sm select-none px-4 py-3 bg-white border-t border-slate-100';

  // Chỉ hiển thị nút nhảy Đầu / Cuối khi số trang lớn (> 5) và có bật cờ showFirstLast
  const shouldRenderFirstLast = showFirstLast && validTotalPages > 5;

  return (
    <div className={`${containerClasses} ${className}`}>
      {/* Thông tin số dòng/trang & số bản ghi */}
      <div className={`flex flex-wrap items-center gap-2 text-slate-500 font-medium ${isXs ? 'text-[11px]' : isSmall ? 'text-xs' : 'text-sm'}`}>
        {showRecordRange && totalItems !== undefined && (
          <span className="flex items-center gap-1">
            Hiển thị <strong className="text-slate-800 font-bold">{fromIndex} - {toIndex}</strong> trong số{' '}
            <strong className="text-slate-800 font-bold">{totalItems}</strong> {itemLabel}
          </span>
        )}

        {onPageSizeChange && pageSize && (
          <div className="flex items-center gap-1.5">
            <span className={`text-slate-500 font-medium ${isXs ? 'text-[11px]' : isSmall ? 'text-xs' : 'text-sm'}`}>Số dòng:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Chọn số dòng trên một trang"
              className={
                isXs
                  ? 'h-6 px-1.5 rounded border border-slate-200 bg-slate-50/70 hover:bg-white text-slate-700 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 font-medium cursor-pointer shadow-2xs hover:border-slate-300 transition-all text-[11px]'
                  : isSmall
                  ? 'h-7 px-2 rounded-md border border-slate-200 bg-slate-50/70 hover:bg-white text-slate-700 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 font-medium cursor-pointer shadow-2xs hover:border-slate-300 transition-all text-xs'
                  : 'h-8.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white text-slate-700 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-medium cursor-pointer shadow-2xs hover:border-slate-300 transition-all text-sm'
              }
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
      <div className="flex items-center gap-1 flex-wrap sm:flex-nowrap justify-center">
        {/* Nút Trang đầu */}
        {shouldRenderFirstLast && (
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={safePage <= 1}
            className={`${
              isXs ? 'w-6 h-6 rounded text-[11px]' : isSmall ? 'w-7 h-7 rounded-md text-xs' : 'w-8.5 h-8.5 rounded-lg text-sm'
            } flex items-center justify-center border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-indigo-600 hover:border-slate-300 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-500 disabled:cursor-not-allowed transition-all cursor-pointer font-medium active:scale-95 shadow-2xs`}
            title="Trang đầu tiên"
          >
            <ChevronsLeft className={isXs ? 'w-3 h-3' : isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          </button>
        )}

        {/* Nút Trước (<) */}
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className={`${
            isXs ? 'w-6 h-6 rounded' : isSmall ? 'w-7 h-7 rounded-md' : 'w-8.5 h-8.5 rounded-lg'
          } flex items-center justify-center border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 hover:border-slate-300 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-600 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95 shadow-2xs`}
          title="Trang trước"
        >
          <ChevronLeft className={isXs ? 'w-3 h-3' : isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </button>

        {/* Danh sách các số trang */}
        <div className="flex items-center gap-1">
          {pages.map((p, index) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className={`${isXs ? 'w-4 h-6 text-[11px]' : isSmall ? 'w-5 h-7 text-xs' : 'w-6 h-8.5 text-sm'} flex items-center justify-center text-slate-400 font-bold`}
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
                className={`${
                  isXs
                    ? 'min-w-[24px] h-6 px-1 rounded text-[11px]'
                    : isSmall
                    ? 'min-w-[28px] h-7 px-1.5 rounded-md text-xs'
                    : 'min-w-[34px] h-8.5 px-2 rounded-lg text-sm'
                } flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-95 ${
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
          className={`${
            isXs ? 'w-6 h-6 rounded' : isSmall ? 'w-7 h-7 rounded-md' : 'w-8.5 h-8.5 rounded-lg'
          } flex items-center justify-center border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 hover:border-slate-300 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-600 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95 shadow-2xs`}
          title="Trang sau"
        >
          <ChevronRight className={isXs ? 'w-3 h-3' : isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </button>

        {/* Nút Trang cuối */}
        {shouldRenderFirstLast && (
          <button
            type="button"
            onClick={() => onPageChange(validTotalPages)}
            disabled={safePage >= validTotalPages}
            className={`${
              isXs ? 'w-6 h-6 rounded text-[11px]' : isSmall ? 'w-7 h-7 rounded-md text-xs' : 'w-8.5 h-8.5 rounded-lg text-sm'
            } flex items-center justify-center border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-indigo-600 hover:border-slate-300 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-500 disabled:cursor-not-allowed transition-all cursor-pointer font-medium active:scale-95 shadow-2xs`}
            title={`Trang cuối (${validTotalPages})`}
          >
            <ChevronsRight className={isXs ? 'w-3 h-3' : isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          </button>
        )}
      </div>
    </div>
  );
};
