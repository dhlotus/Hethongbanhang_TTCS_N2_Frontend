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
 * Thẻ thống kê KPI Tiền hàng trên đường chuẩn LOHA SALES (Thiết kế nhỏ gọn, rõ ràng, không bị tràn chữ)
 */
export const TripStatsCards: React.FC<TripStatsCardsProps> = ({ stats, loading = false }) => {
  const isOverdue = (stats?.overdueTripsCount || 0) > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Tiền hàng trên đường */}
      <div className="bg-white p-3 rounded-lg border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Truck className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-slate-600 truncate">Tiền trên đường</span>
          </div>
          <span className="text-3xs font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
            {stats?.activeTripsCount || 0} xe
          </span>
        </div>

        <div className="text-lg font-bold font-mono tracking-tight text-slate-900 truncate">
          {loading ? (
            <div className="h-6 w-24 bg-slate-200 animate-pulse rounded" />
          ) : (
            formatVndCurrency(stats?.totalGoodsValueInTransit || 0)
          )}
        </div>

        <div className="text-2xs text-slate-400 mt-1 truncate">
          Đang luân chuyển giao hàng
        </div>
      </div>

      {/* 2. Chuyến quá hạn ETA */}
      <div className="bg-white p-3 rounded-lg border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                isOverdue
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-slate-600 truncate">Quá hạn ETA</span>
          </div>
          {isOverdue ? (
            <span className="text-3xs font-medium px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200/70 shrink-0">
              Cần xử lý
            </span>
          ) : (
            <span className="text-3xs font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              Đúng giờ
            </span>
          )}
        </div>

        <div className="text-lg font-bold font-mono tracking-tight text-slate-900 truncate">
          {loading ? (
            <div className="h-6 w-16 bg-slate-200 animate-pulse rounded" />
          ) : (
            `${stats?.overdueTripsCount || 0} chuyến`
          )}
        </div>

        <div className="text-2xs text-slate-400 mt-1 truncate">
          {isOverdue ? 'Vượt mốc cam kết' : 'Đúng tiến độ cam kết'}
        </div>
      </div>

      {/* 3. Hàng giữ trên xe (Chưa về kho) */}
      <div className="bg-white p-3 rounded-lg border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <RotateCcw className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-slate-600 truncate">Hàng giữ trên xe</span>
          </div>
          <span className="text-3xs font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
            Chưa về kho
          </span>
        </div>

        <div className="text-lg font-bold font-mono tracking-tight text-slate-900 truncate">
          {loading ? (
            <div className="h-6 w-24 bg-slate-200 animate-pulse rounded" />
          ) : (
            formatVndCurrency(stats?.totalRetainedUndeliveredValue || 0)
          )}
        </div>

        <div className="text-2xs text-amber-700 font-medium mt-1 truncate">
          Chờ đối soát về kho
        </div>
      </div>

      {/* 4. Điểm dừng chờ giao */}
      <div className="bg-white p-3 rounded-lg border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-slate-600 truncate">Điểm chờ giao</span>
          </div>
          <span className="text-3xs font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            Chưa bàn giao
          </span>
        </div>

        <div className="text-lg font-bold font-mono tracking-tight text-slate-900 truncate">
          {loading ? (
            <div className="h-6 w-16 bg-slate-200 animate-pulse rounded" />
          ) : (
            `${stats?.totalRemainingStops || 0} điểm dừng`
          )}
        </div>

        <div className="text-2xs text-slate-400 mt-1 truncate">
          Hôm nay xong {stats?.completedTripsToday || 0} chuyến
        </div>
      </div>
    </div>
  );
};
