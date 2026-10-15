import React from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  User,
  Phone,
  MapPin,
} from 'lucide-react';
import type {
  AgentDebtReport,
  DebtReportSummary,
} from '../../types/debt-report.type';

interface DebtReportTableProps {
  data: AgentDebtReport[];
  summary: DebtReportSummary;
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (newPage: number) => void;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(val || 0);
};

/**
 * Bảng dữ liệu Sổ công nợ kèm phân rã tuổi nợ & dòng tổng cộng ở chân bảng (SN-203)
 */
export const DebtReportTable: React.FC<DebtReportTableProps> = ({
  data,
  summary,
  loading,
  page,
  totalPages,
  total,
  limit,
  onPageChange,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center shadow-xs">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-3" />
        <p className="text-sm text-slate-500">Đang tải sổ công nợ và tuổi nợ...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center shadow-xs">
        <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-medium text-slate-700 mb-1">
          Không tìm thấy khoản công nợ nào
        </h3>
        <p className="text-sm text-slate-400">
          Hãy thử thay đổi điều kiện tìm kiếm hoặc bỏ chọn lọc nợ quá hạn.
        </p>
      </div>
    );
  }

  const startIndex = (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs md:text-sm">
          {/* Header Bảng */}
          <thead>
            <tr className="bg-slate-800 text-white border-b border-slate-700 select-none">
              <th className="py-3 px-3 font-semibold text-center w-12">STT</th>
              <th className="py-3 px-3 font-semibold min-w-[200px]">Đại lý / Khách hàng</th>
              <th className="py-3 px-3 font-semibold text-right min-w-[120px]">Phải thu</th>
              <th className="py-3 px-3 font-semibold text-right min-w-[120px]">Đã thu</th>
              <th className="py-3 px-3 font-semibold text-right min-w-[125px] bg-slate-900/60 text-amber-300">
                Còn nợ
              </th>
              <th className="py-3 px-3 font-semibold text-right min-w-[110px]">0–30 ngày</th>
              <th className="py-3 px-3 font-semibold text-right min-w-[110px]">31–60 ngày</th>
              <th className="py-3 px-3 font-semibold text-right min-w-[110px]">61–90 ngày</th>
              <th className="py-3 px-3 font-semibold text-right min-w-[110px] text-rose-300">
                &gt; 90 ngày
              </th>
              <th className="py-3 px-3 font-semibold text-center min-w-[130px]">Tình trạng nợ</th>
            </tr>
          </thead>

          {/* Dữ liệu từng dòng */}
          <tbody className="divide-y divide-slate-100">
            {data.map((item, index) => {
              const rowNum = (page - 1) * limit + index + 1;
              return (
                <tr
                  key={item.agencyId}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    item.isOverdue ? 'bg-rose-50/30' : ''
                  }`}
                >
                  {/* STT */}
                  <td className="py-3 px-3 text-center text-slate-400 font-mono text-xs">
                    {rowNum}
                  </td>

                  {/* Thông tin Đại lý */}
                  <td className="py-3 px-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 hover:text-blue-600 transition-colors">
                          {item.agencyName}
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded-sm bg-slate-100 text-slate-600 border border-slate-200">
                          {item.agencyCode}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-500">
                        {item.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {item.phone}
                          </span>
                        )}
                        {item.region && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {item.region}
                          </span>
                        )}
                        {item.salesRepName && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {item.salesRepName}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Phải thu */}
                  <td className="py-3 px-3 text-right font-medium text-slate-700 font-mono">
                    {formatCurrency(item.totalReceivable)} ₫
                  </td>

                  {/* Đã thu */}
                  <td className="py-3 px-3 text-right text-emerald-600 font-medium font-mono">
                    {formatCurrency(item.totalPaid)} ₫
                  </td>

                  {/* Còn nợ */}
                  <td className="py-3 px-3 text-right font-bold text-amber-700 bg-amber-50/50 font-mono">
                    {formatCurrency(item.remainingDebt)} ₫
                  </td>

                  {/* 0-30 ngày */}
                  <td className="py-3 px-3 text-right text-slate-600 font-mono">
                    {item.age0To30 > 0 ? `${formatCurrency(item.age0To30)} ₫` : '-'}
                  </td>

                  {/* 31-60 ngày */}
                  <td className="py-3 px-3 text-right text-slate-600 font-mono">
                    {item.age31To60 > 0 ? `${formatCurrency(item.age31To60)} ₫` : '-'}
                  </td>

                  {/* 61-90 ngày */}
                  <td className="py-3 px-3 text-right text-slate-600 font-mono">
                    {item.age61To90 > 0 ? `${formatCurrency(item.age61To90)} ₫` : '-'}
                  </td>

                  {/* > 90 ngày */}
                  <td className="py-3 px-3 text-right font-bold text-rose-600 font-mono">
                    {item.ageOver90 > 0 ? `${formatCurrency(item.ageOver90)} ₫` : '-'}
                  </td>

                  {/* Tình trạng nợ */}
                  <td className="py-3 px-3 text-center">
                    {item.isOverdue ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                        <AlertTriangle className="w-3 h-3 text-rose-500" />
                        Quá hạn {item.oldestDebtDays} ngày
                      </span>
                    ) : item.remainingDebt > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Trong hạn
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                        Đã tất toán
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Dòng Tổng cộng ở chân bảng (Footer) */}
          <tfoot>
            <tr className="bg-slate-100/95 font-bold text-slate-900 border-t-2 border-slate-300">
              <td className="py-3 px-3 text-center font-mono text-xs">∑</td>
              <td className="py-3 px-3 uppercase tracking-wider text-xs">
                Tổng cộng ({total} đại lý)
              </td>
              <td className="py-3 px-3 text-right font-mono text-slate-900">
                {formatCurrency(summary.totalReceivable)} ₫
              </td>
              <td className="py-3 px-3 text-right font-mono text-emerald-700">
                {formatCurrency(summary.totalPaid)} ₫
              </td>
              <td className="py-3 px-3 text-right font-mono text-amber-800 bg-amber-100/60">
                {formatCurrency(summary.remainingDebt)} ₫
              </td>
              <td className="py-3 px-3 text-right font-mono text-slate-700">
                {formatCurrency(summary.totalAge0To30)} ₫
              </td>
              <td className="py-3 px-3 text-right font-mono text-slate-700">
                {formatCurrency(summary.totalAge31To60)} ₫
              </td>
              <td className="py-3 px-3 text-right font-mono text-slate-700">
                {formatCurrency(summary.totalAge61To90)} ₫
              </td>
              <td className="py-3 px-3 text-right font-mono text-rose-700">
                {formatCurrency(summary.totalAgeOver90)} ₫
              </td>
              <td className="py-3 px-3 text-center text-xs text-rose-600 font-semibold">
                {summary.overdueAgenciesCount > 0
                  ? `${summary.overdueAgenciesCount} đại lý quá hạn`
                  : '0 quá hạn'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Phân trang (Pagination) */}
      <div className="py-3 px-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div>
          Hiển thị{' '}
          <span className="font-semibold text-slate-700">
            {total > 0 ? startIndex : 0}
          </span>{' '}
          –{' '}
          <span className="font-semibold text-slate-700">
            {endIndex}
          </span>{' '}
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
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
