import React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Inbox, AlertCircle, Loader2, Search, FilterX } from "lucide-react";

export type SortDirection = "asc" | "desc" | null;

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyType?: "initial" | "search" | "filter";
  emptyTitle?: string;
  emptyText?: string;
  emptyAction?: React.ReactNode;
  error?: string | null;
  onRetry?: () => void;
  sortKey?: string;
  sortDirection?: SortDirection;
  onSort?: (key: string) => void;
  className?: string;
  rowClassName?: (row: T, index: number) => string;
}

/**
 * Component Table chuẩn LOHA SALES (UI_GUIDELINES Section 23)
 * - Căn lề thống nhất: Chữ căn trái, Số căn phải, Trạng thái/Hành động căn giữa
 * - Hover dòng dịu nhẹ, phân cách border-slate-200/80
 * - Trạng thái: Loading, Empty, Error, Sortable
 */
export function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  isEmpty = false,
  emptyType = "initial",
  emptyTitle,
  emptyText,
  emptyAction,
  error = null,
  onRetry,
  sortKey,
  sortDirection,
  onSort,
  className = "",
  rowClassName,
}: TableProps<T>) {
  const isDataEmpty = isEmpty || (!isLoading && (!data || data.length === 0));

  const getAlignClass = (align?: "left" | "center" | "right") => {
    if (align === "right") return "text-right";
    if (align === "center") return "text-center";
    return "text-left";
  };

  const resolvedEmptyText =
    emptyText ||
    (emptyType === "search"
      ? "Không tìm thấy dữ liệu nào phù hợp với từ khóa tìm kiếm"
      : emptyType === "filter"
      ? "Không có bản ghi nào phù hợp với bộ lọc hiện tại"
      : "Chưa có dữ liệu hiển thị");

  const resolvedEmptyIcon =
    emptyType === "search" ? (
      <Search className="w-8 h-8 text-slate-300 stroke-[1.6]" />
    ) : emptyType === "filter" ? (
      <FilterX className="w-8 h-8 text-slate-300 stroke-[1.6]" />
    ) : (
      <Inbox className="w-8 h-8 text-slate-300 stroke-[1.6]" />
    );

  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-xs ${className}`}
    >
      <div className="overflow-x-auto w-full">
        <table className="w-full text-xs border-separate border-spacing-0">
          <thead>
            <tr className="text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              {columns.map((col) => {
                const isCurrentSort = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className={`bg-slate-50 border-b border-slate-200/80 py-3.5 px-4 font-semibold select-none ${getAlignClass(
                      col.align,
                    )} ${col.sortable ? "cursor-pointer hover:bg-slate-100/80" : ""}`}
                    onClick={() => col.sortable && onSort?.(col.key)}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === "right"
                          ? "justify-end"
                          : col.align === "center"
                          ? "justify-center"
                          : "justify-start"
                      }`}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-slate-400">
                          {isCurrentSort ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-12 text-center text-slate-500"
                >
                  <div className="flex flex-col items-center justify-center gap-2.5">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
                    <span className="text-xs font-medium">Đang tải dữ liệu...</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-12 text-center text-rose-600"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-7 h-7 text-rose-500" />
                    <span className="text-xs font-semibold">{error}</span>
                    {onRetry && (
                      <button
                        type="button"
                        onClick={onRetry}
                        className="mt-2 px-3 py-1.5 text-xs rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-medium hover:bg-rose-100 cursor-pointer"
                      >
                        Thử lại
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : isDataEmpty ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-12 px-4 text-center text-slate-400"
                >
                  <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                    {resolvedEmptyIcon}
                    {emptyTitle && (
                      <span className="text-sm font-semibold text-slate-700">
                        {emptyTitle}
                      </span>
                    )}
                    <span className="text-xs font-medium text-slate-500 leading-relaxed">
                      {resolvedEmptyText}
                    </span>
                    {emptyAction && <div className="mt-2">{emptyAction}</div>}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={keyExtractor(row, index)}
                  className={`hover:bg-slate-50/70 transition-colors ${
                    rowClassName ? rowClassName(row, index) : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-3.5 px-4 text-slate-700 border-b border-slate-100 last:border-b-0 ${getAlignClass(
                        col.align,
                      )}`}
                    >
                      {col.render
                        ? col.render(row, index)
                        : (row as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
