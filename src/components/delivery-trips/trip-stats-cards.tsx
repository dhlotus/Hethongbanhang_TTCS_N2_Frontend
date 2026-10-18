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
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-2xs flex items-center justify-between">
        <div className="min-w-0 pr-2">
          <span className="text-xs font-medium text-slate-500 block mb-1">Tiền trên đường</span>
          <span className="text-2xl font-extrabold font-mono tracking-tight text-slate-900 block truncate">
            {loading ? (
              <span className="inline-block h-7 w-28 bg-slate-200 animate-pulse rounded" />
            ) : (
              formatVndCurrency(stats?.totalGoodsValueInTransit || 0)
            )}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5 truncate">
            Đang luân chuyển ({stats?.activeTripsCount || 0} xe)
          </span>
        </div>
        <div className="h-11 w-11 rounded-xl bg-[#eff2fe] text-[#371cdb] flex items-center justify-center shrink-0 ring-1 ring-[#371cdb]/20">
          <Truck size={22} />
        </div>
      </div>

      {/* 2. Quá hạn ETA */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-2xs flex items-center justify-between">
        <div className="min-w-0 pr-2">
          <span className="text-xs font-medium text-slate-500 block mb-1">Quá hạn ETA</span>
          <span
            className={`text-2xl font-extrabold font-mono tracking-tight block truncate ${
              isOverdue ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {loading ? (
              <span className="inline-block h-7 w-20 bg-slate-200 animate-pulse rounded" />
            ) : (
              `${stats?.overdueTripsCount || 0} chuyến`
            )}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5 truncate">
            {isOverdue ? 'Vượt mốc cam kết' : 'Đúng tiến độ cam kết'}
          </span>
        </div>
        <div
          className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ring-1 ${
            isOverdue
              ? 'bg-rose-50 text-rose-600 ring-rose-500/20'
              : 'bg-emerald-50 text-emerald-600 ring-emerald-500/20'
          }`}
        >
          <Clock size={22} />
        </div>
      </div>

      {/* 3. Hàng giữ trên xe */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-2xs flex items-center justify-between">
        <div className="min-w-0 pr-2">
          <span className="text-xs font-medium text-slate-500 block mb-1">Hàng giữ trên xe</span>
          <span className="text-2xl font-extrabold font-mono tracking-tight text-slate-900 block truncate">
            {loading ? (
              <span className="inline-block h-7 w-28 bg-slate-200 animate-pulse rounded" />
            ) : (
              formatVndCurrency(stats?.totalRetainedUndeliveredValue || 0)
            )}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5 truncate">
            Chờ đối soát về kho
          </span>
        </div>
        <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 ring-1 ring-amber-500/20">
          <RotateCcw size={22} />
        </div>
      </div>

      {/* 4. Điểm chờ giao */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-2xs flex items-center justify-between">
        <div className="min-w-0 pr-2">
          <span className="text-xs font-medium text-slate-500 block mb-1">Điểm chờ giao</span>
          <span className="text-2xl font-extrabold font-mono tracking-tight text-slate-900 block truncate">
            {loading ? (
              <span className="inline-block h-7 w-20 bg-slate-200 animate-pulse rounded" />
            ) : (
              `${stats?.totalRemainingStops || 0} điểm`
            )}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5 truncate">
            Hôm nay xong {stats?.completedTripsToday || 0} chuyến
          </span>
        </div>
        <div className="h-11 w-11 rounded-xl bg-[#eff2fe] text-[#371cdb] flex items-center justify-center shrink-0 ring-1 ring-[#371cdb]/20">
          <CheckCircle2 size={22} />
        </div>
      </div>
    </section>
  );
};
