import React from 'react';
import {
  Truck,
  Clock,
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
 * Thẻ thống kê KPI Tiền hàng trên đường chuẩn thiết kế Quản lý kho (LOHA SALES)
 */
export const TripStatsCards: React.FC<TripStatsCardsProps> = ({ stats, loading = false }) => {
  const isOverdue = (stats?.overdueTripsCount || 0) > 0;

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Tiền hàng trên đường */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-3.5">
        <div className="min-w-0 pr-1">
          <p className="text-xs font-medium text-slate-500">Tiền trên đường</p>
          <p className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 mt-0.5 truncate">
            {loading ? (
              <span className="inline-block h-7 w-28 bg-slate-200 animate-pulse rounded" />
            ) : (
              formatVndCurrency(stats?.totalGoodsValueInTransit || 0)
            )}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            Đang luân chuyển ({stats?.activeTripsCount || 0} xe)
          </p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <Truck className="w-5 h-5" />
        </div>
      </div>

      {/* 2. Quá hạn ETA */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-3.5">
        <div className="min-w-0 pr-1">
          <p className="text-xs font-medium text-slate-500">Quá hạn ETA</p>
          <p
            className={`text-xl sm:text-2xl font-bold font-mono tracking-tight mt-0.5 truncate ${
              isOverdue ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {loading ? (
              <span className="inline-block h-7 w-20 bg-slate-200 animate-pulse rounded" />
            ) : (
              `${stats?.overdueTripsCount || 0} chuyến`
            )}
          </p>
          <p className={`text-[11px] mt-0.5 truncate ${isOverdue ? 'text-rose-500 font-medium' : 'text-slate-400'}`}>
            {isOverdue ? 'Vượt mốc cam kết' : 'Đúng tiến độ cam kết'}
          </p>
        </div>
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            isOverdue ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
          }`}
        >
          <Clock className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Hàng giữ trên xe */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-3.5">
        <div className="min-w-0 pr-1">
          <p className="text-xs font-medium text-slate-500">Hàng giữ trên xe</p>
          <p className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-amber-700 mt-0.5 truncate">
            {loading ? (
              <span className="inline-block h-7 w-28 bg-slate-200 animate-pulse rounded" />
            ) : (
              formatVndCurrency(stats?.totalRetainedUndeliveredValue || 0)
            )}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            Chờ đối soát về kho
          </p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <RotateCcw className="w-5 h-5" />
        </div>
      </div>

      {/* 4. Điểm chờ giao */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-3.5">
        <div className="min-w-0 pr-1">
          <p className="text-xs font-medium text-slate-500">Điểm chờ giao</p>
          <p className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 mt-0.5 truncate">
            {loading ? (
              <span className="inline-block h-7 w-20 bg-slate-200 animate-pulse rounded" />
            ) : (
              `${stats?.totalRemainingStops || 0} điểm`
            )}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            Hôm nay xong {stats?.completedTripsToday || 0} chuyến
          </p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>
    </section>
  );
};
