import React from 'react';
import {
  Truck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import type { GoodsInTransitStats } from '../../types/delivery-trip';
import { formatVndCurrency } from '../../utils/delivery-format';

interface TripStatsCardsProps {
  stats: GoodsInTransitStats | null;
  loading?: boolean;
}

/**
 * Thẻ thống kê KPI Tiền hàng trên đường chuẩn LOHA SALES (Giao diện chuẩn Corporate SaaS, tinh tế, không màu mè)
 */
export const TripStatsCards: React.FC<TripStatsCardsProps> = ({ stats, loading = false }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-5">
      {/* 1. Tiền hàng trên đường */}
      <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all flex items-center">
        <div className="w-11 h-11 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
          <Truck className="w-5 h-5" />
        </div>
        <div className="ml-3.5 w-0 flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-xs font-medium text-slate-500 uppercase tracking-wider">
              Tiền hàng trên đường
            </span>
            <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60 shrink-0">
              {stats?.activeTripsCount || 0} xe
            </span>
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-mono truncate">
            {loading ? (
              <div className="h-7 w-28 bg-slate-200 animate-pulse rounded" />
            ) : (
              formatVndCurrency(stats?.totalGoodsValueInTransit || 0)
            )}
          </div>
          <p className="text-2xs text-slate-400 mt-0.5 truncate">
            Đang luân chuyển trên tuyến giao
          </p>
        </div>
      </div>

      {/* 2. Chuyến quá hạn dự kiến */}
      <div
        className={`p-4.5 rounded-xl border transition-all flex items-center ${
          (stats?.overdueTripsCount || 0) > 0
            ? 'bg-rose-50/40 border-rose-200 shadow-2xs'
            : 'bg-white border-slate-200 shadow-2xs hover:shadow-xs'
        }`}
      >
        <div
          className={`w-11 h-11 rounded-lg border flex items-center justify-center shrink-0 ${
            (stats?.overdueTripsCount || 0) > 0
              ? 'bg-rose-50 text-rose-600 border-rose-200'
              : 'bg-slate-50 text-slate-500 border-slate-200'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="ml-3.5 w-0 flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-xs font-medium text-slate-500 uppercase tracking-wider">
              Quá hạn dự kiến
            </span>
            {(stats?.overdueTripsCount || 0) > 0 && (
              <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
                Cần xử lý
              </span>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={`text-xl sm:text-2xl font-bold tracking-tight font-mono ${
                (stats?.overdueTripsCount || 0) > 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {loading ? (
                <div className="h-7 w-12 bg-slate-200 animate-pulse rounded" />
              ) : (
                stats?.overdueTripsCount || 0
              )}
            </span>
            <span className="text-xs text-slate-400 font-medium">chuyến</span>
          </div>
          <p className="text-2xs text-slate-400 mt-0.5 truncate">
            {(stats?.overdueTripsCount || 0) > 0
              ? 'Đã vượt mốc thời gian cam kết'
              : 'Đúng khung giờ tiến độ'}
          </p>
        </div>
      </div>

      {/* 3. Hàng giữ trên xe (Chưa về kho) */}
      <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all flex items-center">
        <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
          <RotateCcw className="w-5 h-5" />
        </div>
        <div className="ml-3.5 w-0 flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-xs font-medium text-slate-500 uppercase tracking-wider">
              Hàng giữ trên xe
            </span>
            <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
              Chưa về kho
            </span>
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-mono truncate">
            {loading ? (
              <div className="h-7 w-28 bg-slate-200 animate-pulse rounded" />
            ) : (
              formatVndCurrency(stats?.totalRetainedUndeliveredValue || 0)
            )}
          </div>
          <p className="text-2xs text-slate-400 mt-0.5 truncate">
            Thuộc trách nhiệm chuyến, chờ đối soát
          </p>
        </div>
      </div>

      {/* 4. Điểm dừng chờ giao */}
      <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all flex items-center">
        <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="ml-3.5 w-0 flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-xs font-medium text-slate-500 uppercase tracking-wider">
              Điểm chờ giao
            </span>
            <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              Chưa bàn giao
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {loading ? (
                <div className="h-7 w-12 bg-slate-200 animate-pulse rounded" />
              ) : (
                stats?.totalRemainingStops || 0
              )}
            </span>
            <span className="text-xs text-slate-400 font-medium">điểm dừng</span>
          </div>
          <p className="text-2xs text-slate-400 mt-0.5 truncate">
            Hôm nay xong {stats?.completedTripsToday || 0} chuyến
          </p>
        </div>
      </div>
    </div>
  );
};
