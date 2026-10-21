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
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

/**
 * Thẻ thống kê KPI Tiền hàng trên đường - Thiết kế nhỏ gọn, dễ nhìn chuẩn Quản lý kho (LOHA SALES)
 */
export const TripStatsCards: React.FC<TripStatsCardsProps> = ({
  stats,
  loading = false,
  onRefresh,
  isRefreshing = false,
}) => {
  const [localSpinning, setLocalSpinning] = React.useState(false);
  const isOverdue = (stats?.overdueTripsCount || 0) > 0;

  const handleRefreshClick = () => {
    if (onRefresh && !loading && !isRefreshing && !localSpinning) {
      setLocalSpinning(true);
      onRefresh();
      setTimeout(() => setLocalSpinning(false), 800);
    }
  };

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
      {/* 1. Tiền hàng trên đường */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:border-slate-300 transition-all flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-medium text-slate-500 block truncate">Tiền trên đường</span>
          <span className="text-base sm:text-lg font-bold font-mono tracking-tight text-slate-900 block truncate mt-0.5">
            {loading ? (
              <span className="inline-block h-5 w-24 bg-slate-200 animate-pulse rounded" />
            ) : (
              formatVndCurrency(stats?.totalGoodsValueInTransit || 0)
            )}
          </span>
          <span className="text-[10px] text-slate-400 block truncate">
            Đang luân chuyển ({stats?.activeTripsCount || 0} xe)
          </span>
        </div>
        <div className="h-8 w-8 rounded-lg bg-[#eff2fe] text-[#371cdb] flex items-center justify-center shrink-0 ring-1 ring-[#371cdb]/20">
          <Truck size={16} />
        </div>
      </div>

      {/* 2. Quá hạn ETA */}
      <div
        className={`rounded-xl border bg-white p-3 shadow-2xs hover:border-slate-300 transition-all flex items-center justify-between gap-2 ${
          isOverdue ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200/90'
        }`}
      >
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-medium text-slate-500 block truncate">Quá hạn dự kiến</span>
          <span
            className={`text-base sm:text-lg font-bold font-mono tracking-tight block truncate mt-0.5 ${
              isOverdue ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {loading ? (
              <span className="inline-block h-5 w-16 bg-slate-200 animate-pulse rounded" />
            ) : (
              `${stats?.overdueTripsCount || 0} chuyến`
            )}
          </span>
          <span className="text-[10px] text-slate-400 block truncate">
            {isOverdue ? 'Vượt mốc cam kết' : 'Đúng cam kết'}
          </span>
        </div>
        <div
          className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ring-1 ${
            isOverdue
              ? 'bg-rose-50 text-rose-600 ring-rose-500/20'
              : 'bg-emerald-50 text-emerald-600 ring-emerald-500/20'
          }`}
        >
          <Clock size={16} />
        </div>
      </div>

      {/* 3. Hàng giữ trên xe */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:border-slate-300 transition-all flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-medium text-slate-500 block truncate">Hàng giữ trên xe</span>
          <span className="text-base sm:text-lg font-bold font-mono tracking-tight text-amber-600 block truncate mt-0.5">
            {loading ? (
              <span className="inline-block h-5 w-24 bg-slate-200 animate-pulse rounded" />
            ) : (
              formatVndCurrency(stats?.totalRetainedUndeliveredValue || 0)
            )}
          </span>
          <span className="text-[10px] text-slate-400 block truncate">
            Chờ đối soát về kho
          </span>
        </div>
        <button
          type="button"
          onClick={handleRefreshClick}
          disabled={loading || isRefreshing || localSpinning}
          title="Bấm để xoay làm mới và cập nhật dữ liệu đơn hàng"
          className="h-8 w-8 rounded-lg bg-amber-50 hover:bg-amber-100/90 active:scale-90 text-amber-600 flex items-center justify-center shrink-0 ring-1 ring-amber-500/20 transition-all cursor-pointer disabled:opacity-70 group shadow-2xs"
        >
          <RotateCcw
            size={16}
            className={`transition-all duration-700 ${
              loading || isRefreshing || localSpinning
                ? 'animate-spin text-amber-700'
                : 'group-hover:rotate-180 text-amber-600'
            }`}
          />
        </button>
      </div>

      {/* 4. Điểm chờ giao */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:border-slate-300 transition-all flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-medium text-slate-500 block truncate">Điểm chờ giao</span>
          <span className="text-base sm:text-lg font-bold font-mono tracking-tight text-slate-900 block truncate mt-0.5">
            {loading ? (
              <span className="inline-block h-5 w-16 bg-slate-200 animate-pulse rounded" />
            ) : (
              `${stats?.totalRemainingStops || 0} điểm`
            )}
          </span>
          <span className="text-[10px] text-slate-400 block truncate">
            Hôm nay xong {stats?.completedTripsToday || 0} chuyến
          </span>
        </div>
        <div className="h-8 w-8 rounded-lg bg-[#eff2fe] text-[#371cdb] flex items-center justify-center shrink-0 ring-1 ring-[#371cdb]/20">
          <CheckCircle2 size={16} />
        </div>
      </div>
    </section>
  );
};
