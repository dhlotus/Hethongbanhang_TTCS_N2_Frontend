import React from 'react';
import {
  Truck,
  AlertTriangle,
  Clock,
  PackageCheck,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import type { GoodsInTransitStats } from '../../types/delivery-trip';
import { formatVndCurrency } from '../../utils/delivery-format';

interface TripStatsCardsProps {
  stats: GoodsInTransitStats | null;
  loading?: boolean;
}

/**
 * Thẻ thống kê KPI Tiền hàng trên đường & Cảnh báo trễ hạn (SN-194 / SN-197)
 */
export const TripStatsCards: React.FC<TripStatsCardsProps> = ({ stats, loading = false }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Tổng tiền hàng đang nằm trên đường */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-950 p-5 text-white shadow-lg border border-indigo-700/50">
        <div className="absolute right-3 top-3 opacity-15">
          <Truck className="h-24 w-24 text-white" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
              Tiền hàng trên đường
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              Đang vận chuyển
            </span>
          </div>

          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white my-1 font-mono">
            {loading ? (
              <div className="h-8 w-36 bg-indigo-700/60 animate-pulse rounded" />
            ) : (
              formatVndCurrency(stats?.totalGoodsValueInTransit || 0)
            )}
          </div>

          <p className="text-xs text-indigo-200/90 mt-2 flex items-center gap-1.5">
            <PackageCheck className="h-3.5 w-3.5 text-indigo-300 shrink-0" />
            <span>
              {loading
                ? 'Đang tính toán...'
                : `Thuộc ${stats?.activeTripsCount || 0} chuyến xe đang chạy trên tuyến`}
            </span>
          </p>
        </div>
      </div>

      {/* 2. Cảnh báo chuyến đi quá thời gian dự kiến */}
      <div
        className={`relative overflow-hidden rounded-2xl p-5 shadow-sm border transition-all ${
          (stats?.overdueTripsCount || 0) > 0
            ? 'bg-rose-50/90 border-rose-200 text-rose-950 ring-2 ring-rose-500/20'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Chuyến quá hạn dự kiến
          </span>
          {(stats?.overdueTripsCount || 0) > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-rose-100 text-rose-700 border border-rose-300 animate-pulse">
              <AlertTriangle className="h-3 w-3" />
              Cảnh báo khẩn
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              Đúng tiến độ
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2 my-1">
          <div
            className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-mono ${
              (stats?.overdueTripsCount || 0) > 0 ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {loading ? (
              <div className="h-8 w-16 bg-slate-200 animate-pulse rounded" />
            ) : (
              stats?.overdueTripsCount || 0
            )}
          </div>
          <span className="text-sm font-medium text-slate-500">chuyến xe</span>
        </div>

        <p className="text-xs text-slate-600 mt-2 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span>
            {(stats?.overdueTripsCount || 0) > 0
              ? 'Vượt mốc ETA, cần liên hệ tài xế kiểm tra'
              : '100% chuyến xe đang trong khung giờ an toàn'}
          </span>
        </p>
      </div>

      {/* 3. Hàng chưa giao được vẫn giữ trên xe */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Hàng giữ trên xe
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <ShieldAlert className="h-3 w-3" />
            Chưa về kho
          </span>
        </div>

        <div className="text-xl sm:text-2xl font-bold tracking-tight text-amber-700 my-1 font-mono">
          {loading ? (
            <div className="h-8 w-28 bg-slate-200 animate-pulse rounded" />
          ) : (
            formatVndCurrency(stats?.totalRetainedUndeliveredValue || 0)
          )}
        </div>

        <p className="text-xs text-slate-600 mt-2 flex items-center gap-1.5">
          <RotateCcw className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span>Thuộc trách nhiệm chuyến đi, chờ đối soát về kho</span>
        </p>
      </div>

      {/* 4. Tổng số điểm giao còn lại */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Điểm dừng chờ giao
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
            Chưa bàn giao
          </span>
        </div>

        <div className="flex items-baseline gap-2 my-1">
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
            {loading ? (
              <div className="h-8 w-16 bg-slate-200 animate-pulse rounded" />
            ) : (
              stats?.totalRemainingStops || 0
            )}
          </div>
          <span className="text-sm font-medium text-slate-500">đại lý</span>
        </div>

        <p className="text-xs text-slate-600 mt-2 flex items-center gap-1.5">
          <PackageCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span>Hôm nay đã hoàn thành {stats?.completedTripsToday || 0} chuyến</span>
        </p>
      </div>
    </div>
  );
};
