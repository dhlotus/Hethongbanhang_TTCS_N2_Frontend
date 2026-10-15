import React from 'react';
import {
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
} from 'lucide-react';
import type { DebtReportSummary } from '../../types/debt-report.type';

interface DebtReportSummaryProps {
  summary: DebtReportSummary;
  loading?: boolean;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

/**
 * Component hiển thị các thẻ chỉ số tổng quan công nợ & tuổi nợ (SN-203)
 */
export const DebtReportSummaryCards: React.FC<DebtReportSummaryProps> = ({
  summary,
  loading = false,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Tổng phải thu */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Tổng Phải Thu
          </p>
          <p className="text-xl font-bold text-slate-800 mt-1">
            {loading ? '...' : formatCurrency(summary.totalReceivable)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Phát sinh toàn bộ {summary.totalAgencies} đại lý
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <DollarSign className="w-6 h-6" />
        </div>
      </div>

      {/* 2. Đã thu */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Tổng Đã Thu
          </p>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {loading ? '...' : formatCurrency(summary.totalPaid)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Đã thanh toán thực tế
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle className="w-6 h-6" />
        </div>
      </div>

      {/* 3. Dư nợ còn lại */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Tổng Dư Nợ Còn Lại
          </p>
          <p className="text-xl font-bold text-amber-600 mt-1">
            {loading ? '...' : formatCurrency(summary.remainingDebt)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Cần thu hồi từ đại lý
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <Clock className="w-6 h-6" />
        </div>
      </div>

      {/* 4. Nợ quá hạn */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Nợ Quá Hạn Báo Động
          </p>
          <p className="text-xl font-bold text-rose-600 mt-1">
            {loading ? '...' : formatCurrency(summary.totalOverdueAmount)}
          </p>
          <p className="text-xs text-rose-500 font-medium mt-0.5">
            {summary.overdueAgenciesCount} đại lý cần ưu tiên đòi nợ
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
