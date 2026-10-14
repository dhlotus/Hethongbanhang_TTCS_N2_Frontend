import React, { useState, useEffect } from 'react';
import {
  Pencil,
  Lock,
  Unlock,
  History,
  AlertTriangle,
  CheckCircle2,
  Phone,
  User,
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

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val || 0);
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
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--color-primary)] border-r-transparent mb-3" />
          <p className="text-sm text-slate-500 font-medium">Đang tải danh sách hạn mức công nợ...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs p-12 text-center">
        <ShieldAlert className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <h4 className="text-base font-semibold text-slate-700 mb-1">Không tìm thấy đại lý nào</h4>
        <p className="text-xs text-slate-500">
          Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs">
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-left border-collapse text-xs">
          {/* Header 6 cột tối ưu */}
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-4 min-w-[220px]">Đại Lý / Khách Hàng</th>
              <th className="py-3.5 px-4 min-w-[150px]">Sale Phụ Trách</th>
              <th className="py-3.5 px-4 min-w-[190px] text-right">Hạn Mức &amp; Dư Nợ</th>
              <th className="py-3.5 px-4 min-w-[190px]">Tỷ Lệ &amp; Khả Dụng</th>
              <th className="py-3.5 px-4 min-w-[130px] text-center">Trạng Thái</th>
              <th className="py-3.5 px-4 min-w-[100px] text-right">Thao Tác</th>
            </tr>
          </thead>

          {/* Body không có đường kẻ ngang dưới mỗi ô dữ liệu (flat/clean style) */}
          <tbody>
            {items.map((item, index) => {
              const tempLimit = item.temporaryCreditLimit || 0;
              const effectiveLimit = item.creditLimit + tempLimit;
              const displayName = item.agencyName || item.customerName || '';
              const displayCode = item.agencyCode || item.customerCode || '';
              const isBlocked = item.status === CreditStatus.BLOCKED;
              const isExceeded = item.status === CreditStatus.EXCEEDED;
              const isWarning = item.status === CreditStatus.WARNING;
              const isLastRow = items.length > 2 && index >= items.length - 1;

              return (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                  {/* Cột 1: Đại lý / Khách hàng (Tên + Mã + SĐT) */}
                  <td className="py-3.5 px-4 align-middle">
                    <div className="font-bold text-slate-900 group-hover:text-[var(--color-primary)] transition-colors text-sm">
                      {displayName}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-slate-500">
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-semibold text-slate-700">
                        {displayCode}
                      </span>
                      {item.phone && (
                        <>
                          <span className="text-[11px] text-slate-300">•</span>
                          <span className="flex items-center gap-1 text-[11px]">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {item.phone}
                          </span>
                        </>
                      )}
                    </div>
                  </td>

                  {/* Cột 2: Sale phụ trách (Chỉ giữ Icon + Tên Sale, bỏ thông tin kho/miền phía dưới) */}
                  <td className="py-3.5 px-4 align-middle text-slate-700">
                    <div className="flex items-center gap-1.5 font-medium text-xs text-slate-800">
                      <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{item.salesRepName || 'Chưa phân công'}</span>
                    </div>
                  </td>

                  {/* Cột 3: Hạn mức & Dư nợ (Gộp gọn hạn mức cấp & dư nợ hiện hành) */}
                  <td className="py-3.5 px-4 align-middle text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-[11px] text-slate-500">Hạn mức:</span>
                      <span className="font-bold text-slate-900 text-xs">
                        {formatCurrency(item.creditLimit)}
                      </span>
                      {tempLimit > 0 && (
                        <span
                          className="text-[10px] font-medium text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200"
                          title={`Hạn mức tạm thời: +${formatCurrency(tempLimit)}`}
                        >
                          +{formatCurrency(tempLimit)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 mt-1">
                      <span className="text-[11px] text-slate-500">Dư nợ:</span>
                      <span
                        className={`font-bold text-xs ${
                          item.currentDebt > effectiveLimit
                            ? 'text-rose-600 font-extrabold'
                            : item.currentDebt > 0
                              ? 'text-slate-800'
                              : 'text-slate-400'
                        }`}
                      >
                        {formatCurrency(item.currentDebt)}
                      </span>
                    </div>
                  </td>

                  {/* Cột 4: Tỷ lệ & Khả dụng (Progress bar % + Số tiền còn lại) */}
                  <td className="py-3.5 px-4 align-middle">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-800">
                        {item.debtUsagePercentage}%
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Còn: <strong className="text-slate-700 font-semibold">{formatCurrency(item.availableCredit)}</strong>
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          isBlocked
                            ? 'bg-slate-400'
                            : isExceeded
                              ? 'bg-rose-500'
                              : isWarning
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                        }`}
                        style={{
                          width: `${Math.min(100, item.debtUsagePercentage)}%`,
                        }}
                      />
                    </div>
                    {item.maxDebtDays > 0 && (
                      <div className="text-[10px] text-slate-400 mt-1">
                        Thời hạn: {item.maxDebtDays} ngày
                      </div>
                    )}
                  </td>

                  {/* Cột 5: Trạng thái (Badge An toàn / Cảnh báo / Vượt trần / Bị khóa) */}
                  <td className="py-3.5 px-4 align-middle text-center">
                    {isBlocked ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        <Lock className="h-3 w-3" />
                        Bị Khóa
                      </span>
                    ) : isExceeded ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertTriangle className="h-3 w-3" />
                        Vượt Trần
                      </span>
                    ) : isWarning ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangle className="h-3 w-3" />
                        Cảnh Báo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        An Toàn
                      </span>
                    )}
                  </td>

                  {/* Cột 6: Thao tác (Nút "Thao tác" xổ Popover Menu) */}
                  <td className="py-3.5 px-4 align-middle text-right">
                    <div className="relative inline-block text-left" data-dropdown-container>
                      {/* 1. NÚT KÍCH HOẠT (TRIGGER BUTTON) - Đồng nhất màu và hover cho cả chữ và icon mũi tên */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId(activeDropdownId === item.id ? null : item.id);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold transition-all cursor-pointer select-none ${
                          activeDropdownId === item.id
                            ? 'bg-[#E4E7EB] border-slate-300 text-indigo-800 shadow-2xs'
                            : 'bg-[#F0F2F5] hover:bg-[#E4E7EB] border-slate-200/90 text-indigo-700 hover:text-indigo-800 hover:border-slate-300 shadow-2xs'
                        }`}
                        aria-expanded={activeDropdownId === item.id}
                      >
                        <span className="text-current transition-colors">Thao tác</span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-current transition-transform duration-200 shrink-0 ${
                            activeDropdownId === item.id ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {/* 2. MENU POPOVER XỔ XUỐNG (DROPDOWN ITEMS) */}
                      {activeDropdownId === item.id && (
                        <div
                          className={`absolute right-0 ${
                            isLastRow ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                          } w-52 bg-white rounded-[12px] border border-slate-200 shadow-xl shadow-slate-900/10 p-1.5 z-30 text-left`}
                          style={{ borderRadius: '12px' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Sửa hạn mức (Icon chiếc bút màu cam - đồng màu chữ và hover) */}
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
                            className={`w-full px-3 py-2 rounded-lg text-xs flex items-center gap-2.5 transition-colors ${
                              canEdit
                                ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50/80 cursor-pointer'
                                : 'text-slate-300 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <Pencil className="h-4 w-4 text-current shrink-0" />
                            <span className="font-semibold text-current">Sửa hạn mức</span>
                          </button>

                          {/* Xem lịch sử (Icon đồng hồ - đồng màu chữ và hover) */}
                          <button
                            type="button"
                            onClick={() => {
                              onViewHistory(item);
                              setActiveDropdownId(null);
                            }}
                            className="w-full px-3 py-2 rounded-lg text-xs flex items-center gap-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50/80 transition-colors cursor-pointer"
                          >
                            <History className="h-4 w-4 text-current shrink-0" />
                            <span className="font-semibold text-current">Xem lịch sử</span>
                          </button>

                          {/* Khóa giao dịch (Icon ổ khóa - đồng màu chữ và hover) */}
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
                            className={`w-full px-3 py-2 rounded-lg text-xs flex items-center gap-2.5 transition-colors ${
                              !canEdit
                                ? 'text-slate-300 opacity-50 cursor-not-allowed'
                                : isBlocked
                                  ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/80 cursor-pointer'
                                  : 'text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 cursor-pointer'
                            }`}
                          >
                            {isBlocked ? (
                              <>
                                <Unlock className="h-4 w-4 text-current shrink-0" />
                                <span className="font-semibold text-current">Mở khóa giao dịch</span>
                              </>
                            ) : (
                              <>
                                <Lock className="h-4 w-4 text-current shrink-0" />
                                <span className="font-semibold text-current">Khóa giao dịch</span>
                              </>
                            )}
                          </button>
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

      {/* Footer Bảng: Hiển thị Tổng số bản ghi kèm Phân trang đồng bộ */}
      {totalItems > 0 && onPageChange && (
        <div className="border-t border-slate-200 bg-white">
          <Pagination
            variant="default"
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50]}
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
