import React, { useState } from 'react';
import {
  Inbox,
} from 'lucide-react';
import { Pagination } from '../pagination';
import { DebtDetailModal } from './debt-detail-modal';
import {
  AgingDebtGroupEnum,
  type AgentDebtReport,
  type DebtReportSummary,
} from '../../types/debt-report.type';
import { calculateAgingBreakdown } from '../../utils/debt-report-calculator';

interface DebtReportTableProps {
  data: AgentDebtReport[];
  summary: DebtReportSummary;
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  selectedAgingGroup?: AgingDebtGroupEnum;
  debtStatus?: 'IN_TERM' | 'OVERDUE' | 'ALL';
  sortBy?: 'oldestDebtDays' | 'remainingDebt' | 'overdueAmount' | 'agencyName' | 'code';
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: 'oldestDebtDays' | 'remainingDebt' | 'overdueAmount' | 'agencyName' | 'code') => void;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(val || 0);
};

/**
 * UI Component Bảng Sổ Công Nợ (Ticket [SN-203])
 * Đồng bộ chuẩn Design System Quản lý Đơn hàng (Orders Table):
 * - Wrapper: rounded-xl border border-slate-200/80 overflow-hidden shadow-xs w-full
 * - Header: bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider
 * - Tỷ lệ 6 cột cân đối 100%:
 *   + Cột 1 [Mã đại lý]: w-[11%] (Căn giữa)
 *   + Cột 2 [Đại lý]: w-[27%] (Căn trái, hiển thị 2 dòng thông tin gọn gàng)
 *   + Cột 3 [Đã thu / Phải thu]: w-[21%] (Căn phải, 1 dòng tabular-nums, không đè lấn)
 *   + Cột 4 [Tổng dư nợ]: w-[14%] (Căn phải, font-bold tabular-nums, sạch sẽ)
 *   + Cột 5 [Tuổi nợ & Trạng thái]: w-[16%] (Căn giữa, Pill badge gọn + Mini distribution bar)
 *   + Cột 6 [Thao tác]: w-[11%] (Căn giữa, nút Thao tác ▾ chuẩn cách mép an toàn)
 */
export const DebtReportTable: React.FC<DebtReportTableProps> = ({
  data,
  summary,
  loading,
  page,
  totalPages,
  total,
  limit,
  debtStatus = 'ALL',
  sortBy,
  sortOrder,
  onSort,
  onPageChange,
  onPageSizeChange,
}) => {
  const [selectedAgency, setSelectedAgency] = useState<AgentDebtReport | null>(null);

  /**
   * Render Cột 5: [Tuổi nợ & Trạng thái]
   * - Gộp badge tuổi nợ xấu nhất + số ngày quá hạn
   * - Bo tròn dạng Pill (rounded-full), căn giữa ô
   */
  const renderAgingAndStatusCell = (item: AgentDebtReport) => {
    if (item.remainingDebt === 0) {
      return (
        <div className="flex items-center justify-center text-center">
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-sans antialiased tracking-tight font-medium bg-slate-50 text-slate-500 border border-slate-200 shadow-2xs">
            Đã tất toán
          </span>
        </div>
      );
    }

    const breakdown = calculateAgingBreakdown(item);
    const { age31To60: b31, age61To90: b61, ageOver90: b90 } = breakdown;
    const overdueTotal = (b31 || 0) + (b61 || 0) + (b90 || 0);
    const hasOverdue = overdueTotal > 0 || item.isOverdue;
    const debtDays = item.oldestDebtDays ?? 0;

    let pillBadge: { label: string; className: string };

    if (hasOverdue) {
      if (b90 > 0) {
        pillBadge = {
          label: `Quá hạn >90d (${debtDays}d)`,
          className: 'bg-rose-50 text-rose-700 border-rose-200/80 font-medium',
        };
      } else if (b61 > 0) {
        pillBadge = {
          label: `Quá hạn 61-90d (${debtDays}d)`,
          className: 'bg-amber-50 text-amber-800 border-amber-200/80 font-medium',
        };
      } else if (b31 > 0) {
        pillBadge = {
          label: `Quá hạn 31-60d (${debtDays}d)`,
          className: 'bg-amber-50 text-amber-800 border-amber-200/80 font-medium',
        };
      } else {
        pillBadge = {
          label: `Quá hạn (${debtDays}d)`,
          className: 'bg-amber-50 text-amber-800 border-amber-200/80 font-medium',
        };
      }
    } else {
      pillBadge = {
        label: debtDays > 0 ? `Trong hạn (${debtDays}d)` : 'Trong hạn',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 font-medium',
      };
    }

    return (
      <div className="flex items-center justify-center w-full text-center">
        <span
          className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full border text-[11px] font-sans antialiased tracking-tight select-none whitespace-nowrap shadow-2xs ${pillBadge.className}`}
        >
          {pillBadge.label}
        </span>
      </div>
    );
  };

  const renderSortIndicator = (
    column: 'oldestDebtDays' | 'remainingDebt' | 'overdueAmount' | 'agencyName' | 'code',
  ) => {
    if (sortBy !== column) {
      return (
        <span className="text-slate-300 ml-1 text-[10px] select-none opacity-0 group-hover/th:opacity-100 transition-opacity">
          ↕
        </span>
      );
    }
    return (
      <span className="text-indigo-600 font-bold ml-1 text-[10px] select-none">
        {sortOrder === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center shadow-xs w-full">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
        <p className="text-sm text-slate-500 font-medium">Đang tải sổ công nợ và tuổi nợ...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center shadow-xs w-full">
        <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-700 mb-1">
          Không tìm thấy khoản công nợ nào
        </h3>
        <p className="text-sm text-slate-400">
          Hãy thử thay đổi điều kiện tìm kiếm hoặc chọn dải tuổi nợ khác.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Wrapper theo đúng style Quản lý đơn hàng */}
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs w-full">
        <div className="overflow-x-auto w-full">
          {/* Table chuẩn % em rem linh hoạt theo đúng style Quản lý đơn hàng, không scroll ngang, khớp mép với nút Xuất Excel */}
          <table className="w-full text-sm divide-y divide-slate-100">
            {/* Header đúng 6 Cột: 11% + 27% + 20% + 15% + 15% + 12% = 100% */}
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                <th
                  onClick={() => onSort?.('code')}
                  className="px-2 sm:px-2.5 py-3 text-left w-[11%] cursor-pointer hover:bg-slate-100/80 transition-colors group/th"
                  title="Nhấn để sắp xếp theo Mã đại lý"
                >
                  <span className="inline-flex items-center">
                    Mã đại lý
                    {renderSortIndicator('code')}
                  </span>
                </th>
                <th
                  onClick={() => onSort?.('agencyName')}
                  className="px-2 sm:px-2.5 py-3 text-left w-[27%] cursor-pointer hover:bg-slate-100/80 transition-colors group/th"
                  title="Nhấn để sắp xếp theo Tên đại lý"
                >
                  <span className="inline-flex items-center">
                    Đại lý
                    {renderSortIndicator('agencyName')}
                  </span>
                </th>
                <th className="px-2 sm:px-2.5 py-3 text-right w-[20%]">
                  Đã thu / Phải thu
                </th>
                <th
                  onClick={() => onSort?.('remainingDebt')}
                  className="px-2 sm:px-2.5 py-3 text-right w-[15%] cursor-pointer hover:bg-slate-100/80 transition-colors group/th"
                  title="Nhấn để sắp xếp theo Tổng dư nợ"
                >
                  <span className="inline-flex items-center justify-end w-full">
                    Tổng dư nợ
                    {renderSortIndicator('remainingDebt')}
                  </span>
                </th>
                <th className="px-2 py-3 text-center w-[15%]">
                  Tuổi nợ & Trạng thái
                </th>
                <th className="px-2 sm:px-2.5 py-3 text-right w-[12%]">
                  Thao tác
                </th>
              </tr>
            </thead>

            {/* Dữ liệu từng dòng đại lý: Hover đẹp, padding chuẩn giống Quản lý đơn hàng */}
            <tbody className="divide-y divide-slate-100/90">
              {data.map((item) => {

                return (
                  <tr
                    key={item.agencyId}
                    className="hover:bg-indigo-50/25 transition-colors group bg-white"
                  >
                    {/* CỘT 1 (11%): [MÃ ĐẠI LÝ] - Căn trái, Interactive monospace badge */}
                    <td className="px-2 sm:px-2.5 py-3 whitespace-nowrap text-left">
                      <button
                        type="button"
                        onClick={() => setSelectedAgency(item)}
                        className="inline-flex items-center font-mono text-xs font-semibold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/60 px-2 py-0.5 rounded-md transition-all cursor-pointer shadow-2xs group-hover:border-indigo-300"
                        title={`Xem sổ chi tiết của ${item.agencyCode}`}
                      >
                        <span>{item.agencyCode}</span>
                      </button>
                    </td>

                    {/* CỘT 2 (27%): [ĐẠI LÝ] - Căn trái, Typography chuẩn 2 dòng, tự nhiên */}
                    <td className="px-2 sm:px-2.5 py-3 text-left min-w-0">
                      <button
                        type="button"
                        onClick={() => setSelectedAgency(item)}
                        className="text-left font-semibold text-slate-800 hover:text-indigo-600 transition-colors line-clamp-1 sm:line-clamp-2 text-sm leading-snug cursor-pointer block max-w-full"
                        title={item.agencyName}
                      >
                        {item.agencyName}
                      </button>
                      <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                        <span>{item.phone || 'Chưa có SĐT'}</span>
                        <span>•</span>
                        <span className="text-slate-500">{item.region}</span>
                      </div>
                    </td>

                    {/* CỘT 3 (20%): [ĐÃ THU / PHẢI THU] */}
                    <td className="px-2 sm:px-2.5 py-3 text-right whitespace-nowrap">
                      <span className="tabular-nums text-xs sm:text-[13px] font-bold text-slate-900 tracking-tight">
                        <span title="Đã thu">{formatCurrency(item.totalPaid)}</span>
                        <span className="text-slate-400 font-normal mx-0.5">/</span>
                        <span title="Tổng phải thu">{formatCurrency(item.totalReceivable)}</span>
                      </span>
                    </td>

                    {/* CỘT 4 (15%): [TỔNG DƯ NỢ] */}
                    <td className="px-2 sm:px-2.5 py-3 text-right whitespace-nowrap">
                      <span
                        className={`tabular-nums text-xs sm:text-sm ${
                          item.remainingDebt > 0
                            ? 'font-bold text-slate-900'
                            : 'font-normal text-slate-400'
                        }`}
                      >
                        {formatCurrency(item.remainingDebt)} đ
                      </span>
                    </td>

                    {/* CỘT 5 (15%): [TUỔI NỢ & TRẠNG THÁI] - Căn giữa, Pill badge */}
                    <td className="px-2 py-3 text-center whitespace-nowrap">
                      {renderAgingAndStatusCell(item)}
                    </td>

                    {/* CỘT 6 (12%): [THAO TÁC] - Nút Thao tác dạng dropdown pill chuẩn */}
                    <td className="px-2 sm:px-2.5 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedAgency(item)}
                        className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-semibold transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                        title="Thao tác chi tiết sổ công nợ"
                      >
                        <span>Thao tác</span>
                        <span className="text-[10px] text-slate-400">▾</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Dòng Tổng cộng ở chân bảng (Footer) chuẩn 6 cột */}
            <tfoot className="bg-slate-50/90 border-t border-slate-200 font-bold text-xs text-slate-800">
              <tr className="h-12">
                <td
                  colSpan={2}
                  className="px-2 sm:px-2.5 py-3 text-left text-slate-600 font-semibold text-xs"
                >
                  Tổng cộng ({summary.totalAgencies} đại lý):
                </td>
                <td className="px-2 sm:px-2.5 py-3 text-right text-sm whitespace-nowrap">
                  <span className="tabular-nums text-xs sm:text-[13px] font-bold text-slate-900">
                    <span title="Tổng đã thu">{formatCurrency(summary.totalPaid)}</span>
                    <span className="text-slate-400 font-normal mx-0.5">/</span>
                    <span title="Tổng phải thu">{formatCurrency(summary.totalReceivable)}</span>
                  </span>
                </td>
                <td className="px-2 sm:px-2.5 py-3 text-right font-bold text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                  {formatCurrency(summary.remainingDebt)} đ
                </td>
                <td className="px-2 py-3 text-center font-semibold text-xs whitespace-nowrap">
                  {debtStatus === 'IN_TERM' ? (
                    <span className="text-emerald-700 font-bold">
                      {summary.inTermAgenciesCount ?? summary.totalAgencies} đại lý trong hạn
                    </span>
                  ) : debtStatus === 'OVERDUE' ? (
                    <span className="text-rose-600 font-bold">
                      {summary.overdueAgenciesCount || summary.totalAgencies} đại lý quá hạn
                    </span>
                  ) : (summary.overdueAgenciesCount || 0) > 0 && (summary.inTermAgenciesCount || 0) > 0 ? (
                    <span className="inline-flex items-center gap-1.5 justify-center">
                      <span className="text-rose-600 font-bold">{summary.overdueAgenciesCount} quá hạn</span>
                      <span className="text-slate-300 font-normal">/</span>
                      <span className="text-emerald-700 font-bold">{summary.inTermAgenciesCount} trong hạn</span>
                    </span>
                  ) : (summary.overdueAgenciesCount || 0) > 0 ? (
                    <span className="text-rose-600 font-bold">
                      {summary.overdueAgenciesCount} đại lý quá hạn
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold">
                      {summary.totalAgencies} đại lý trong hạn
                    </span>
                  )}
                </td>
                <td className="px-2 sm:px-2.5 py-3 text-right text-slate-400 text-xs">
                  —
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Thanh phân trang gắn liền chân bảng chuẩn Quản lý đại lý (SN-203) */}
        {total > 0 && (
          <Pagination
            variant="default"
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={limit}
            pageSizeOptions={[10, 20, 50]}
            itemLabel="đại lý"
            showRecordRange={false}
            showFirstLast={false}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        )}
      </div>

      {/* Modal Chi tiết Sổ Công Nợ Đại Lý (Ticket SN-203) */}
      <DebtDetailModal
        agency={selectedAgency}
        onClose={() => setSelectedAgency(null)}
      />
    </>
  );
};
