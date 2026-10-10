import React from 'react';
import { CreditCard, AlertTriangle, CheckCircle2, Lock, TrendingUp, Wallet } from 'lucide-react';
import type { CreditLimitStats } from '../../types/credit-limit';

interface CreditLimitStatsCardsProps {
  stats: CreditLimitStats | null;
  loading?: boolean;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

export const CreditLimitStatsCards: React.FC<CreditLimitStatsCardsProps> = ({
  stats,
  loading = false,
}) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl bg-slate-100 animate-pulse border border-slate-200"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Thẻ 1: Tổng Hạn mức Được cấp */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tổng Hạn Mức Tín Dụng
          </span>
          <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <CreditCard className="h-4 w-4" />
          </div>
        </div>
        <div className="text-xl font-bold text-slate-900 tracking-tight">
          {formatCurrency(stats.totalCreditLimit)}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <span className="font-medium text-slate-700">{stats.totalCustomers}</span> đại lý trong hệ
          thống
        </div>
      </div>

      {/* Thẻ 2: Tổng Nợ Thực tế & Tỷ lệ sử dụng */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tổng Dư Nợ Hiện Hành
          </span>
          <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="text-xl font-bold text-slate-900 tracking-tight">
          {formatCurrency(stats.totalCurrentDebt)}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span
            className={`font-semibold px-1.5 py-0.5 rounded ${
              stats.averageUsageRate > 80
                ? 'bg-red-50 text-red-600'
                : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {stats.averageUsageRate}%
          </span>
          <span className="text-slate-500">tỷ lệ sử dụng toàn mạng lưới</span>
        </div>
      </div>

      {/* Thẻ 3: Hạn mức khả dụng còn lại */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Hạn Mức Khả Dụng Còn Lại
          </span>
          <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Wallet className="h-4 w-4" />
          </div>
        </div>
        <div className="text-xl font-bold text-emerald-600 tracking-tight">
          {formatCurrency(stats.totalAvailableCredit)}
        </div>
        <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span>
            <strong className="text-slate-700">{stats.normalCount}</strong> đại lý hoạt động an toàn
          </span>
        </div>
      </div>

      {/* Thẻ 4: Cảnh báo Rủi ro & Khóa */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Kiểm Soát Rủi Ro
          </span>
          <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-xl font-bold text-rose-600 tracking-tight">
            {stats.exceededCount + stats.warningCount + stats.blockedCount}
          </div>
          <span className="text-xs text-slate-500">đại lý cần chú ý</span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
          <span
            className="flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded"
            title="Chạm ngưỡng 80-100%"
          >
            <AlertTriangle className="h-3 w-3" /> {stats.warningCount} cảnh báo
          </span>
          <span
            className="flex items-center gap-1 text-red-700 bg-red-50 px-1.5 py-0.5 rounded"
            title="Đang bị khóa"
          >
            <Lock className="h-3 w-3" /> {stats.blockedCount} bị khóa
          </span>
        </div>
      </div>
    </div>
  );
};
