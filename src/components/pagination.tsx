import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

/**
 * Component Pagination chuẩn LOHA SALES (UI_GUIDELINES Section 28)
 * - Nút trang kích thước chuẩn 36px, bo góc radius-md (8px)
 * - Trang hiện tại nổi bật bằng màu Primary Brand Color
 * - Hỗ trợ thu gọn số trang bằng dấu ba chấm "..."
 * - Hiển thị tổng số bản ghi và dropdown chọn số dòng / trang
 */
export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  className = '',
}) => {
  if (totalPages <= 1 && totalItems === undefined) {
    return null;
  }

  // Thuật toán hiển thị dải trang thông minh
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 1; // số trang liền kề

    const left = currentPage - delta;
    const right = currentPage + delta + 1;
    let l: number | null = null;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i < right)) {
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

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none ${className}`}
    >
      {/* Thông tin tổng số bản ghi & tùy chọn số dòng/trang */}
      <div className="flex items-center gap-3 text-slate-500 font-medium">
        {totalItems !== undefined && (
          <span>
            Tổng cộng: <strong className="text-slate-800">{totalItems}</strong> bản ghi
          </span>
        )}
        {onPageSizeChange && pageSize && (
          <div className="flex items-center gap-1.5 ml-2">
            <span>Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 px-2 rounded-md border border-slate-200 bg-white text-slate-700 outline-none focus:border-[var(--color-primary)] font-semibold cursor-pointer"
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
      <div className="flex items-center gap-1">
        {/* Nút Trước */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="w-9 h-9 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Trang trước"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Danh sách các số trang */}
        {pages.map((p, index) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="w-8 h-9 flex items-center justify-center text-slate-400 font-bold"
              >
                ...
              </span>
            );
          }

          const pageNum = Number(p);
          const isActive = pageNum === currentPage;

          return (
            <button
              key={`page-${pageNum}`}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className={`w-9 h-9 flex items-center justify-center rounded-md font-semibold transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Nút Sau */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="w-9 h-9 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Trang sau"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
