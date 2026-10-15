import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Eye,
  Copy,
  Check,
} from 'lucide-react';
import { Tooltip } from '../tooltip';
import { DebtDetailModal } from './debt-detail-modal';
import {
  AgingDebtGroupEnum,
  type AgentDebtReport,
  type DebtReportSummary,
} from '../../types/debt-report.type';

interface DebtReportTableProps {
  data: AgentDebtReport[];
  summary: DebtReportSummary;
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  selectedAgingGroup?: AgingDebtGroupEnum;
  sortBy?: 'oldestDebtDays' | 'remainingDebt' | 'overdueAmount' | 'agencyName' | 'code';
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: 'oldestDebtDays' | 'remainingDebt' | 'overdueAmount' | 'agencyName' | 'code') => void;
  onPageChange: (newPage: number) => void;
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
  sortBy,
  sortOrder,
  onSort,
  onPageChange,
}) => {
  const [selectedAgency, setSelectedAgency] = useState<AgentDebtReport | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  // Đóng Action Menu khi click ra ngoài hoặc ấn phím Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(e.target as Node)
      ) {
        setOpenActionMenuId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenActionMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleCopyCode = (code: string) => {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1500);
    }
  };

  /**
   * Render Cột 5: [Tuổi nợ & Trạng thái]
   * - Gộp badge tuổi nợ xấu nhất + số ngày quá hạn
   * - Bo tròn dạng Pill (rounded-full), căn giữa ô
   * - Tooltip chi tiết phân bổ 4 dải tuổi nợ + Dòng tổng cộng khớp [Tổng dư nợ]
   */
  const renderAgingAndStatusCell = (item: AgentDebtReport) => {
    if (item.remainingDebt === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200 shadow-2xs">
          Đã tất toán
        </span>
      );
    }

    // Logic xác định dải tuổi nợ cũ nhất / xấu nhất
    let pillBadge = {
      label: 'Trong hạn (0–30d)',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 font-medium',
    };

    if (item.ageOver90 > 0) {
      pillBadge = {
        label: `Quá hạn >90d (${item.oldestDebtDays}d)`,
        className: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
      };
    } else if (item.age61To90 > 0) {
      pillBadge = {
        label: `Quá hạn 61–90d (${item.oldestDebtDays}d)`,
        className: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold',
      };
    } else if (item.age31To60 > 0) {
      pillBadge = {
        label: `Quá hạn 31–60d (${item.oldestDebtDays}d)`,
        className: 'bg-blue-50 text-blue-700 border-blue-200 font-semibold',
      };
    } else if (item.age0To30 > 0) {
      pillBadge = {
        label: 'Trong hạn (0–30d)',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
      };
    }

    // Tooltip chi tiết
    const tooltipContent = (
      <div className="p-2 space-y-1.5 text-xs min-w-[14.5rem] text-left">
        <div className="font-semibold text-slate-100 border-b border-slate-700 pb-1 flex justify-between items-center text-[0.6875rem]">
          <span>Chi tiết phân bổ tuổi nợ</span>
          <span className="font-mono text-slate-400">{item.agencyCode}</span>
        </div>

        <div className="space-y-1 text-slate-300">
          <div className="flex justify-between items-center">
            <span className="text-emerald-400">0–30 ngày (Trong hạn):</span>
            <span className="font-mono">{formatCurrency(item.age0To30)} đ</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-blue-400">31–60 ngày:</span>
            <span className="font-mono">{formatCurrency(item.age31To60)} đ</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-amber-400">61–90 ngày:</span>
            <span className="font-mono">{formatCurrency(item.age61To90)} đ</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-rose-400 font-medium">&gt; 90 ngày:</span>
            <span className="font-mono font-medium">{formatCurrency(item.ageOver90)} đ</span>
          </div>
        </div>

        {/* Dòng Tổng cộng: Khớp 100% với cột [Tổng Dư Nợ] */}
        <div className="pt-1.5 border-t border-slate-700 flex justify-between items-center text-slate-100 font-bold">
          <span>Tổng cộng:</span>
          <span className="font-mono text-amber-300">
            {formatCurrency(item.remainingDebt)} đ
          </span>
        </div>

        {item.isOverdue && (
          <div className="pt-1 border-t border-slate-700/60 text-[0.625rem] text-rose-300 flex justify-between items-center">
            <span>Quá hạn ({item.oldestDebtDays} ngày):</span>
            <span className="font-mono font-bold">{formatCurrency(item.overdueAmount)} đ</span>
          </div>
        )}
      </div>
    );

    const totalBuckets =
      (item.age0To30 || 0) +
      (item.age31To60 || 0) +
      (item.age61To90 || 0) +
      (item.ageOver90 || 0);
    const p0 = totalBuckets > 0 ? (item.age0To30 / totalBuckets) * 100 : 0;
    const p30 = totalBuckets > 0 ? (item.age31To60 / totalBuckets) * 100 : 0;
    const p60 = totalBuckets > 0 ? (item.age61To90 / totalBuckets) * 100 : 0;
    const p90 = totalBuckets > 0 ? (item.ageOver90 / totalBuckets) * 100 : 0;

    return (
      <div className="flex flex-col items-center justify-center gap-1 w-full max-w-[135px] mx-auto">
        <Tooltip content={tooltipContent} position="top">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] cursor-help transition-all shadow-2xs hover:shadow-xs hover:scale-102 select-none whitespace-nowrap ${pillBadge.className}`}
          >
            {pillBadge.label}
          </span>
        </Tooltip>

        {/* Mini Distribution Bar: Trực quan hóa tỷ lệ phân bổ các dải tuổi nợ */}
        {totalBuckets > 0 && (
          <Tooltip content={tooltipContent} position="bottom">
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex cursor-help border border-slate-200/60 shadow-2xs">
              {p0 > 0 && (
                <div
                  style={{ width: `${p0}%` }}
                  className="bg-emerald-500 h-full transition-all"
                  title={`0-30 ngày: ${formatCurrency(item.age0To30)} đ (${p0.toFixed(0)}%)`}
                />
              )}
              {p30 > 0 && (
                <div
                  style={{ width: `${p30}%` }}
                  className="bg-blue-500 h-full transition-all"
                  title={`31-60 ngày: ${formatCurrency(item.age31To60)} đ (${p30.toFixed(0)}%)`}
                />
              )}
              {p60 > 0 && (
                <div
                  style={{ width: `${p60}%` }}
                  className="bg-amber-500 h-full transition-all"
                  title={`61-90 ngày: ${formatCurrency(item.age61To90)} đ (${p60.toFixed(0)}%)`}
                />
              )}
              {p90 > 0 && (
                <div
                  style={{ width: `${p90}%` }}
                  className="bg-rose-500 h-full transition-all"
                  title={`>90 ngày: ${formatCurrency(item.ageOver90)} đ (${p90.toFixed(0)}%)`}
                />
              )}
            </div>
          </Tooltip>
        )}
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

  const startIndex = (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total);

  return (
    <>
      {/* Wrapper theo đúng style Quản lý đơn hàng */}
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs w-full">
        <div className="overflow-x-auto w-full">
          {/* Table ép w-full & table-fixed, đúng 6 Cột chuẩn 100% */}
          <table className="w-full table-fixed text-sm border-collapse divide-y divide-slate-100">
            {/* Header đúng 6 Cột: 11% + 27% + 21% + 14% + 16% + 11% = 100% */}
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                <th
                  onClick={() => onSort?.('code')}
                  className="px-3 py-3 text-center w-[11%] cursor-pointer hover:bg-slate-100/80 transition-colors group/th"
                  title="Nhấn để sắp xếp theo Mã đại lý"
                >
                  <span className="inline-flex items-center justify-center">
                    Mã đại lý
                    {renderSortIndicator('code')}
                  </span>
                </th>
                <th
                  onClick={() => onSort?.('agencyName')}
                  className="px-3 py-3 text-left w-[27%] cursor-pointer hover:bg-slate-100/80 transition-colors group/th"
                  title="Nhấn để sắp xếp theo Tên đại lý"
                >
                  <span className="inline-flex items-center">
                    Đại lý
                    {renderSortIndicator('agencyName')}
                  </span>
                </th>
                <th className="px-3 py-3 text-right w-[21%]">
                  Đã thu / Phải thu
                </th>
                <th
                  onClick={() => onSort?.('remainingDebt')}
                  className="px-3 py-3 text-right w-[14%] cursor-pointer hover:bg-slate-100/80 transition-colors group/th"
                  title="Nhấn để sắp xếp theo Tổng dư nợ"
                >
                  <span className="inline-flex items-center justify-end w-full">
                    Tổng dư nợ
                    {renderSortIndicator('remainingDebt')}
                  </span>
                </th>
                <th
                  onClick={() => onSort?.('oldestDebtDays')}
                  className="px-2 py-3 text-center w-[16%] cursor-pointer hover:bg-slate-100/80 transition-colors group/th"
                  title="Nhấn để sắp xếp theo Tuổi nợ lâu nhất"
                >
                  <span className="inline-flex items-center justify-center">
                    Tuổi nợ & Trạng thái
                    {renderSortIndicator('oldestDebtDays')}
                  </span>
                </th>
                <th className="px-3 py-3 text-center w-[11%]">
                  Thao tác
                </th>
              </tr>
            </thead>

            {/* Dữ liệu từng dòng đại lý: Chiều cao chuẩn h-14, dữ liệu phẳng trên 1 hàng */}
            <tbody className="divide-y divide-slate-100/90">
              {data.map((item) => {
                const isMenuOpen = openActionMenuId === item.agencyId;

                return (
                  <tr
                    key={item.agencyId}
                    className={`hover:bg-indigo-50/25 transition-colors group h-14 ${
                      item.isOverdue ? 'bg-rose-50/15' : ''
                    }`}
                  >
                    {/* CỘT 1 (11%): [MÃ ĐẠI LÝ] - Căn giữa, Interactive monospace badge */}
                    <td className="px-3 py-2 text-center align-middle whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedAgency(item)}
                        className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/60 px-2.5 py-1 rounded-md transition-all cursor-pointer shadow-2xs group-hover:border-indigo-300"
                        title={`Xem sổ chi tiết của ${item.agencyCode}`}
                      >
                        <Building2 className="w-3 h-3 text-indigo-500 group-hover:text-indigo-700 transition-colors" />
                        <span>{item.agencyCode}</span>
                      </button>
                    </td>

                    {/* CỘT 2 (27%): [ĐẠI LÝ] - Căn trái, Typography chuẩn 2 dòng sạch đẹp */}
                    <td className="px-3 py-2 text-left align-middle">
                      <div className="flex flex-col min-w-0">
                        <button
                          type="button"
                          onClick={() => setSelectedAgency(item)}
                          className="text-left font-semibold text-slate-800 hover:text-indigo-600 transition-colors truncate text-sm cursor-pointer block max-w-full"
                          title={item.agencyName}
                        >
                          {item.agencyName}
                        </button>
                        <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                          <span>{item.phone || 'Chưa có SĐT'}</span>
                          <span>•</span>
                          <span className="text-slate-500">{item.region}</span>
                        </div>
                      </div>
                    </td>

                    {/* CỘT 3 (21%): [ĐÃ THU / PHẢI THU] - 1 DÒNG DUY NHẤT, tabular-nums, không đè lấn */}
                    <td className="px-3 py-2 text-right align-middle whitespace-nowrap">
                      <span className="text-xs font-medium tabular-nums">
                        <span className="text-emerald-600 font-semibold" title="Đã thu">
                          {formatCurrency(item.totalPaid)}
                        </span>
                        <span className="text-slate-300 mx-1">/</span>
                        <span className="text-slate-600" title="Tổng phải thu">
                          {formatCurrency(item.totalReceivable)}
                        </span>
                      </span>
                    </td>

                    {/* CỘT 4 (14%): [TỔNG DƯ NỢ] - Duy nhất 1 con số in đậm, căn phải, có khoảng cách rõ ràng */}
                    <td className="px-3 py-2 text-right align-middle whitespace-nowrap">
                      <span
                        className={`font-bold tabular-nums text-sm ${
                          item.isOverdue
                            ? 'text-rose-600'
                            : item.remainingDebt > 0
                              ? 'text-slate-900'
                              : 'text-slate-400'
                        }`}
                      >
                        {formatCurrency(item.remainingDebt)} đ
                      </span>
                    </td>

                    {/* CỘT 5 (16%): [TUỔI NỢ & TRẠNG THÁI] - Căn giữa, Pill badge gọn */}
                    <td className="px-2 py-2 text-center align-middle whitespace-nowrap">
                      {renderAgingAndStatusCell(item)}
                    </td>

                    {/* CỘT 6 (11%): [THAO TÁC] - Căn giữa, cách mép phải an toàn */}
                    <td className="px-3 py-2 text-center align-middle whitespace-nowrap">
                      <div className="relative inline-flex items-center justify-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionMenuId(isMenuOpen ? null : item.agencyId);
                          }}
                          className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0 ${
                            isMenuOpen
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs ring-2 ring-indigo-500/10'
                              : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 hover:border-slate-300'
                          }`}
                          title="Thao tác"
                        >
                          <span className="whitespace-nowrap">Thao tác</span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
                              isMenuOpen ? 'rotate-180 text-indigo-600' : ''
                            }`}
                          />
                        </button>

                        {/* Dropdown Menu Thao tác */}
                        {isMenuOpen && (
                          <div
                            ref={actionMenuRef}
                            className="absolute right-0 top-full mt-1 z-30 w-44 bg-white rounded-lg border border-slate-200 shadow-lg py-1 text-left text-xs animate-in fade-in zoom-in-95 duration-100"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAgency(item);
                                setOpenActionMenuId(null);
                              }}
                              className="w-full px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 font-medium transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4 text-indigo-600" />
                              <span>Xem sổ chi tiết</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleCopyCode(item.agencyCode);
                                setOpenActionMenuId(null);
                              }}
                              className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium transition-colors cursor-pointer"
                            >
                              {copiedCode === item.agencyCode ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-slate-400" />
                              )}
                              <span>Sao chép mã</span>
                            </button>
                          </div>
                        )}
                      </div>
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
                  className="px-3 py-2 text-left text-slate-600 font-semibold text-xs"
                >
                  Tổng cộng ({summary.totalAgencies} đại lý):
                </td>
                <td className="px-3 py-2 text-right font-medium text-slate-700 text-xs whitespace-nowrap">
                  <span className="text-emerald-700 font-semibold">{formatCurrency(summary.totalPaid)}</span>
                  <span className="text-slate-300 mx-1">/</span>
                  <span className="text-slate-600">{formatCurrency(summary.totalReceivable)}</span>
                </td>
                <td className="px-3 py-2 text-right font-bold text-amber-800 text-sm whitespace-nowrap">
                  {formatCurrency(summary.remainingDebt)} đ
                </td>
                <td className="px-2 py-2 text-center font-semibold text-rose-600 text-xs whitespace-nowrap">
                  {summary.overdueAgenciesCount > 0
                    ? `${summary.overdueAgenciesCount} đại lý quá hạn`
                    : '0 quá hạn'}
                </td>
                <td className="px-3 py-2 text-center text-slate-400 text-xs">
                  —
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Phân trang (Pagination) */}
        <div className="py-3 px-4 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Hiển thị{' '}
            <span className="font-semibold text-slate-700">
              {total > 0 ? startIndex : 0}
            </span>{' '}
            –{' '}
            <span className="font-semibold text-slate-700">{endIndex}</span>{' '}
            trong tổng số{' '}
            <span className="font-semibold text-slate-700">{total}</span> đại lý
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-md border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 py-1 font-medium text-slate-700">
                Trang {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-md border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Trang tiếp"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Chi tiết Sổ Công Nợ Đại Lý (Ticket SN-203) */}
      <DebtDetailModal
        agency={selectedAgency}
        onClose={() => setSelectedAgency(null)}
      />
    </>
  );
};
