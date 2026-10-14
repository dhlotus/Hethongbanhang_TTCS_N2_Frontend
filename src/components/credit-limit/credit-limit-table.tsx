import React from 'react';
import {
  Edit3,
  Lock,
  Unlock,
  History,
  AlertTriangle,
  CheckCircle2,
  Phone,
  User,
  ShieldAlert,
} from 'lucide-react';
import type { CreditLimitItem } from '../../types/credit-limit';
import { CreditStatus } from '../../types/credit-limit';

interface CreditLimitTableProps {
  items: CreditLimitItem[];
  loading?: boolean;
  canEdit?: boolean;
  onEdit: (item: CreditLimitItem) => void;
  onToggleStatus: (item: CreditLimitItem) => void;
  onViewHistory: (item: CreditLimitItem) => void;
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
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--color-primary)] border-r-transparent mb-3" />
          <p className="text-sm text-slate-500">Đang tải danh sách hạn mức công nợ...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm p-12 text-center">
        <ShieldAlert className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <h4 className="text-base font-semibold text-slate-700 mb-1">Không tìm thấy đại lý nào</h4>
        <p className="text-xs text-slate-500">
          Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-4">Đại Lý / Khách Hàng</th>
              <th className="py-3.5 px-4">Sale Phụ Trách</th>
              <th className="py-3.5 px-4 text-right">Hạn Mức Cấp</th>
              <th className="py-3.5 px-4 text-right">Dư Nợ Hiện Hành</th>
              <th className="py-3.5 px-4 w-52">Tỷ Lệ & Khả Dụng</th>
              <th className="py-3.5 px-4 text-center">Số Ngày Nợ</th>
              <th className="py-3.5 px-4 text-center">Trạng Thái</th>
              <th className="py-3.5 px-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const tempLimit = item.temporaryCreditLimit || 0;
              const effectiveLimit = item.creditLimit + tempLimit;
              const displayName = item.agencyName || item.customerName || '';
              const displayCode = item.agencyCode || item.customerCode || '';
              const isBlocked = item.status === CreditStatus.BLOCKED;
              const isExceeded = item.status === CreditStatus.EXCEEDED;
              const isWarning = item.status === CreditStatus.WARNING;

              return (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                  {/* Cột 1: Thông tin đại lý */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 group-hover:text-[var(--color-primary)] transition-colors text-sm">
                      {displayName}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-slate-500">
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-semibold text-slate-700">
                        {displayCode}
                      </span>
                      <span className="text-[11px] text-slate-400">|</span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {item.phone || '-'}
                      </span>
                    </div>
                  </td>

                  {/* Cột 2: Sale phụ trách */}
                  <td className="py-3.5 px-4 text-slate-700">
                    <div className="flex items-center gap-1.5 font-medium">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>{item.salesRepName || 'Chưa phân công'}</span>
                    </div>
                    {item.region && (
                      <span className="text-[11px] text-slate-400 pl-5">{item.region}</span>
                    )}
                  </td>

                  {/* Cột 3: Hạn mức cấp */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="font-bold text-slate-900 text-sm">
                      {formatCurrency(item.creditLimit)}
                    </div>
                    {tempLimit > 0 && (
                      <div className="mt-0.5">
                        <span className="text-[10px] font-medium bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200">
                          + {formatCurrency(tempLimit)} tạm thời
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Cột 4: Dư nợ hiện tại */}
                  <td className="py-3.5 px-4 text-right">
                    <div
                      className={`font-bold text-sm ${
                        item.currentDebt > effectiveLimit
                          ? 'text-rose-600'
                          : item.currentDebt > 0
                            ? 'text-slate-800'
                            : 'text-slate-400'
                      }`}
                    >
                      {formatCurrency(item.currentDebt)}
                    </div>
                  </td>

                  {/* Cột 5: Thanh tỷ lệ sử dụng & Khả dụng */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-slate-700">
                        {item.debtUsagePercentage}%
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Còn: {formatCurrency(item.availableCredit)}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
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
                  </td>

                  {/* Cột 6: Số ngày nợ */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="font-semibold text-slate-800 text-center">{item.maxDebtDays} ngày</div>
                  </td>

                  {/* Cột 7: Trạng thái */}
                  <td className="py-3.5 px-4 text-center">
                    {isBlocked ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <Lock className="h-3 w-3" />
                        Bị Khóa
                      </span>
                    ) : isExceeded ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
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

                  {/* Cột 8: Nút thao tác */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Nút Khai báo / Chỉnh sửa hạn mức (SN-34 RBAC: Ẩn/Disable nếu không có quyền) */}
                      <button
                        type="button"
                        onClick={() => canEdit && onEdit(item)}
                        disabled={!canEdit}
                        title={
                          canEdit
                            ? 'Khai báo & Điều chỉnh hạn mức'
                            : 'Chỉ Kế toán công nợ hoặc Quản lý kinh doanh mới có quyền cập nhật hạn mức'
                        }
                        className={`p-1.5 rounded-lg transition-colors ${
                          canEdit
                            ? 'text-slate-600 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] cursor-pointer'
                            : 'text-slate-300 opacity-40 cursor-not-allowed hover:bg-transparent'
                        }`}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>

                      {/* Nút Xem lịch sử điều chỉnh */}
                      <button
                        type="button"
                        onClick={() => onViewHistory(item)}
                        title="Xem lịch sử điều chỉnh & kiểm toán"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                      >
                        <History className="h-4 w-4" />
                      </button>

                      {/* Nút Khóa / Mở khóa hạn mức */}
                      <button
                        type="button"
                        onClick={() => canEdit && onToggleStatus(item)}
                        disabled={!canEdit}
                        title={
                          !canEdit
                            ? 'Chỉ Kế toán công nợ hoặc Quản lý kinh doanh mới có quyền thay đổi trạng thái'
                            : isBlocked
                              ? 'Mở khóa hạn mức tín dụng'
                              : 'Tạm khóa hạn mức tín dụng'
                        }
                        className={`p-1.5 rounded-lg transition-colors ${
                          !canEdit
                            ? 'text-slate-300 opacity-40 cursor-not-allowed'
                            : isBlocked
                              ? 'text-emerald-600 hover:bg-emerald-50 cursor-pointer'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                        }`}
                      >
                        {isBlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
