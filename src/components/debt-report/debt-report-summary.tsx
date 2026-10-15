import React from 'react';
import {
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import type { DebtReportSummary } from '../../types/debt-report.type';

interface DebtReportSummaryProps {
  summary: DebtReportSummary;
  loading?: boolean;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(Math.round(val || 0)) + ' đ';
};

/**
 * Executive Financial KPI Deck - Thẻ thống kê tài chính cao cấp (Ticket SN-203)
 * Hiển thị đầy đủ số liệu tài chính, tỷ lệ thu hồi, biểu đồ thanh tiến độ và chỉ số cảnh báo rủi ro.
 */
export const DebtReportSummaryCards: React.FC<DebtReportSummaryProps> = ({
  summary,
  loading = false,
}) => {
  const receivable = summary.totalReceivable || 0;
  const paid = summary.totalPaid || 0;
  const remaining = summary.remainingDebt || 0;
  const overdue = summary.totalOverdueAmount || 0;

  // Tính toán tỷ lệ phần trăm tài chính
  const paidRate = receivable > 0 ? Math.min(100, Math.round((paid / receivable) * 1000) / 10) : 0;
  const debtRate = receivable > 0 ? Math.min(100, Math.round((remaining / receivable) * 1000) / 10) : 0;
  const overdueRateOfDebt = remaining > 0 ? Math.min(100, Math.round((overdue / remaining) * 1000) / 10) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-1">
      {/* ── CARD 1: TỔNG PHẢI THU (Brand Accent: Indigo) ── */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all p-4.5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[0.6875rem] font-bold text-slate-500 uppercase tracking-wider">
              Tổng Phải Thu
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {loading ? '...' : formatCurrency(receivable)}
            </p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1 text-slate-600 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
            <span>Toàn bộ {summary.totalAgencies} đại lý</span>
          </span>
          <span className="text-[0.6875rem] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
            100% doanh thu
          </span>
        </div>
      </div>

      {/* ── CARD 2: TỔNG ĐÃ THU (Success Accent: Emerald) ── */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:shadow-sm hover:border-emerald-200 transition-all p-4.5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[0.6875rem] font-bold text-emerald-700 uppercase tracking-wider">
              Đã Thanh Toán
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 tabular-nums">
              {loading ? '...' : formatCurrency(paid)}
            </p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Tỷ lệ thu hồi</span>
            <span className="font-bold text-emerald-700 flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {paidRate}%
            </span>
          </div>
          {/* Progress bar thu hồi */}
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${paidRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── CARD 3: DƯ NỢ CÒN LẠI (Warning Accent: Amber) ── */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:shadow-sm hover:border-amber-200 transition-all p-4.5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[0.6875rem] font-bold text-amber-700 uppercase tracking-wider">
              Dư Nợ Còn Lại
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-amber-800 tabular-nums">
              {loading ? '...' : formatCurrency(remaining)}
            </p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Chiếm dư nợ</span>
            <span className="font-bold text-amber-700">
              {debtRate}% tổng thu
            </span>
          </div>
          {/* Progress bar dư nợ */}
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${debtRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── CARD 4: NỢ QUÁ HẠN BÁO ĐỘNG (Danger Accent: Rose) ── */}
      <div className="bg-white rounded-xl border border-rose-200/90 shadow-xs hover:shadow-sm hover:border-rose-300 transition-all p-4.5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[0.6875rem] font-bold text-rose-700 uppercase tracking-wider">
              Nợ Quá Hạn Cần Đòi
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-rose-600 tabular-nums">
              {loading ? '...' : formatCurrency(overdue)}
            </p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-rose-100/80 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-rose-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              {summary.overdueAgenciesCount} đại lý quá hạn
            </span>
            <span className="text-[0.6875rem] font-bold text-rose-600">
              {overdueRateOfDebt}% dư nợ
            </span>
          </div>
          {/* Progress bar nợ quá hạn */}
          <div className="w-full h-1.5 bg-rose-100/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-500 rounded-full transition-all duration-500"
              style={{ width: `${overdueRateOfDebt}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
