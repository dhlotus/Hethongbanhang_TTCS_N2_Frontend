import React, { useState, useEffect } from 'react';
import {
  Building2,
  Pencil,
  Lock,
  Unlock,
  History,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react';
import type { CreditLimitItem } from '../../types/credit-limit';
import { CreditStatus } from '../../types/credit-limit';
import { Pagination } from '../pagination';

interface CreditLimitTableProps {
  items: CreditLimitItem[];
  loading?: boolean;
  canEdit?: boolean;
  onEdit: (item: CreditLimitItem) => void;
  onToggleStatus: (item: CreditLimitItem) => void;
  onViewHistory: (item: CreditLimitItem) => void;
  // Footer / Phân trang
  page?: number;
  totalPages?: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

const formatVnd = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' đ';
};

const getGroupLabel = (group?: string): string => {
  switch (group) {
    case 'AGENT_LEVEL_1':
      return 'Đại lý Cấp 1';
    case 'AGENT_LEVEL_2':
      return 'Đại lý Cấp 2';
    case 'RETAIL':
      return 'Bán lẻ';
    case 'WHOLESALE':
      return 'Bán buôn';
    default:
      return group || 'Đại lý Cấp 1';
  }
};

export const CreditLimitTable: React.FC<CreditLimitTableProps> = ({
  items,
  loading = false,
  canEdit = true,
  onEdit,
  onToggleStatus,
  onViewHistory,
  page = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
}) => {
  // Quản lý id của dòng đang mở Action Dropdown Menu
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Đóng dropdown khi click ra ngoài hoặc bấm phím Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown-container]')) {
        setActiveDropdownId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdownId(null);
      }
    };

    if (activeDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeDropdownId]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs">
        <div className="p-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--color-primary)] border-r-transparent mb-3" />
          <p className="text-sm text-slate-500 font-medium">Đang tải danh sách hạn mức công nợ...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs p-12 text-center">
        <ShieldAlert className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <h4 className="text-base font-semibold text-slate-700 mb-1">Không tìm thấy đại lý nào</h4>
        <p className="text-xs text-slate-500">
          Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs">
      {/* Bảng dạng table-fixed 100% đồng bộ hoàn toàn với Bảng Quản Lý Đại Lý */}
      <div className="overflow-x-auto min-h-[360px]">
        <table className="w-full text-sm divide-y divide-slate-100">
          {/* Header 6 cột: bg-slate-50/90, font-bold text-slate-500 text-[11px] uppercase */}
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3 text-left w-[15%]">Mã đại lý</th>
              <th className="px-4 py-3 text-left w-[35%]">Đại lý</th>
              <th className="px-4 py-3 text-left w-[15%]">Phân nhóm</th>
              <th className="px-4 py-3 text-right w-[15%]">Dư nợ hiện tại</th>
              <th className="px-4 py-3 text-center w-[10%]">Trạng thái</th>
              <th className="px-4 py-3 text-right w-[10%] min-w-[105px]">Thao tác</th>
            </tr>
          </thead>

          {/* Body đồng bộ hover:bg-indigo-50/25 và divide-y divide-slate-100/90 */}
          <tbody className="divide-y divide-slate-100/90">
            {items.map((item, index) => {
              const tempLimit = item.temporaryCreditLimit || 0;
              const effectiveLimit = item.creditLimit + tempLimit;
              const displayName = item.agencyName || item.customerName || '';
              const displayCode = item.agencyCode || item.customerCode || '';
              const isBlocked = item.status === CreditStatus.BLOCKED;
              const isExceeded = item.status === CreditStatus.EXCEEDED || item.currentDebt > effectiveLimit;
              const isWarning = item.status === CreditStatus.WARNING;
              const isLastRow = items.length > 2 && index >= items.length - 2;

              return (
                <tr key={item.id} className="hover:bg-indigo-50/25 transition-colors group">
                  {/* 1. Mã đại lý: Interactive monospace badge đồng bộ Bảng Đại Lý */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/60 px-2.5 py-1 rounded-md transition-all cursor-pointer shadow-2xs group-hover:border-indigo-300">
                      <Building2 className="w-3 h-3 text-indigo-500 group-hover:text-indigo-700 transition-colors" />
                      <span>{displayCode}</span>
                    </span>
                  </td>

                  {/* 2. Đại lý: Typography sạch đẹp, 1 dòng gọn gàng */}
                  <td className="px-4 py-3.5">
                    <div
                      className="text-left font-semibold text-slate-800 hover:text-indigo-600 transition-colors line-clamp-1 text-sm block max-w-full"
                      title={displayName}
                    >
                      {displayName}
                    </div>
                  </td>

                  {/* 3. Phân nhóm: Pill badge tinh tế (Cấp 1 màu tím indigo, Cấp 2 màu xanh sky) */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                        item.customerGroup === 'AGENT_LEVEL_2'
                          ? 'bg-sky-50 text-sky-700 border-sky-200/60'
                          : item.customerGroup === 'WHOLESALE'
                          ? 'bg-teal-50 text-teal-700 border-teal-200/60'
                          : item.customerGroup === 'RETAIL'
                          ? 'bg-amber-50 text-amber-700 border-amber-200/60'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200/60'
                      }`}
                    >
                      {getGroupLabel(item.customerGroup)}
                    </span>
                  </td>

                  {/* 4. Dư nợ hiện tại: Số tiền tabular-nums rõ ràng (màu đen, đỏ nếu vượt trần) */}
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <span
                      className={`font-bold tabular-nums text-sm ${
                        isExceeded ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {formatVnd(item.currentDebt || 0)}
                    </span>
                  </td>

                  {/* 5. Trạng thái: Pill badge bo tròn đồng bộ có chấm màu */}
                  <td className="px-4 py-3.5 text-center whitespace-nowrap">
                    {isBlocked ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200/60">
                        <Lock className="w-3 h-3 text-slate-500" />
                        <span>Bị khóa</span>
                      </span>
                    ) : isExceeded ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span>Vượt trần</span>
                      </span>
                    ) : isWarning ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>Cảnh báo</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Hoạt động</span>
                      </span>
                    )}
                  </td>

                  {/* 6. Thao tác: Nút Dropdown Menu đồng bộ chuẩn Bảng Đại Lý */}
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="relative inline-flex items-center justify-end" data-dropdown-container>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId(activeDropdownId === item.id ? null : item.id);
                        }}
                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs select-none whitespace-nowrap shrink-0 ${
                          activeDropdownId === item.id
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs ring-2 ring-indigo-500/10'
                            : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 hover:border-slate-300'
                        }`}
                        title="Thao tác"
                      >
                        <span className="whitespace-nowrap">Thao tác</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
                            activeDropdownId === item.id ? 'rotate-180 text-indigo-600' : ''
                          }`}
                        />
                      </button>

                      {/* Popover Dropdown danh mục hành động */}
                      {activeDropdownId === item.id && (
                        <div
                          className={`absolute right-0 ${
                            isLastRow ? 'bottom-full mb-1 origin-bottom-right' : 'top-full mt-1 origin-top-right'
                          } w-48 rounded-xl bg-white border border-slate-200/90 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 text-left`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="py-1">
                            {/* 1. Sửa hạn mức */}
                            <button
                              type="button"
                              onClick={() => {
                                if (canEdit) {
                                  onEdit(item);
                                  setActiveDropdownId(null);
                                }
                              }}
                              disabled={!canEdit}
                              title={
                                canEdit
                                  ? 'Sửa hạn mức'
                                  : 'Chỉ Kế toán công nợ hoặc Quản lý kinh doanh mới có quyền cập nhật hạn mức'
                              }
                              className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 transition-colors ${
                                canEdit
                                  ? 'text-slate-700 hover:bg-slate-50 hover:text-orange-600 cursor-pointer'
                                  : 'text-slate-300 opacity-50 cursor-not-allowed'
                              }`}
                            >
                              <Pencil className="w-4 h-4 text-orange-500 shrink-0" />
                              <span className="font-medium">Sửa hạn mức</span>
                            </button>

                            {/* 2. Xem lịch sử */}
                            <button
                              type="button"
                              onClick={() => {
                                onViewHistory(item);
                                setActiveDropdownId(null);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <History className="w-4 h-4 text-blue-500 shrink-0" />
                              <span className="font-medium">Xem lịch sử</span>
                            </button>

                            {/* 3. Khóa giao dịch */}
                            <button
                              type="button"
                              onClick={() => {
                                if (canEdit) {
                                  onToggleStatus(item);
                                  setActiveDropdownId(null);
                                }
                              }}
                              disabled={!canEdit}
                              title={
                                !canEdit
                                  ? 'Chỉ Kế toán công nợ hoặc Quản lý kinh doanh mới có quyền thay đổi trạng thái'
                                  : isBlocked
                                    ? 'Mở khóa giao dịch'
                                    : 'Khóa giao dịch'
                              }
                              className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 transition-colors ${
                                !canEdit
                                  ? 'text-slate-300 opacity-50 cursor-not-allowed'
                                  : isBlocked
                                    ? 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer'
                                    : 'text-slate-700 hover:bg-rose-50 hover:text-rose-700 cursor-pointer'
                              }`}
                            >
                              {isBlocked ? (
                                <>
                                  <Unlock className="w-4 h-4 text-emerald-500 shrink-0" />
                                  <span className="font-medium">Mở khóa giao dịch</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-4 h-4 text-rose-500 shrink-0" />
                                  <span className="font-medium">Khóa giao dịch</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Bảng: Hiển thị chọn số dòng/trang và chuyển trang đồng bộ 100% */}
      {totalItems > 0 && onPageChange && (
        <div className="border-t border-slate-100 bg-white">
          <Pagination
            variant="default"
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50]}
            showRecordRange={false}
            itemLabel="đại lý"
            showFirstLast={true}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      )}
    </div>
  );
};
