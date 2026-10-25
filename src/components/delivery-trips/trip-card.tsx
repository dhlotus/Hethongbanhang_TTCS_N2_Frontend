import React from 'react';
import {
  Truck,
  Phone,
  Clock,
  RotateCcw,
  ChevronRight,
  Warehouse,
} from 'lucide-react';
import type { DeliveryTrip } from '../../types/delivery-trip';
import {
  formatVndCurrency,
  getTripTimingStatus,
} from '../../utils/delivery-format';

interface TripCardProps {
  trip: DeliveryTrip;
  onOpenDetails: (trip: DeliveryTrip) => void;
  onOpenReturnCheckin: (trip: DeliveryTrip) => void;
}

/**
 * Card chuyến xe giao hàng theo phong cách Clean Corporate SaaS (SN-194 / SN-197)
 */
export const TripCard: React.FC<TripCardProps> = ({
  trip,
  onOpenDetails,
  onOpenReturnCheckin,
}) => {
  const timingStatus = getTripTimingStatus(
    trip.status,
    trip.estimatedCompletionTime,
  );

  const totalStops = trip.totalStops ?? trip.stopsCount ?? (trip.stops?.length || 0);
  const deliveredStops =
    trip.deliveredStops ?? trip.stops?.filter((s) => s.status === 'DELIVERED').length ?? 0;
  const failedStops =
    trip.failedStops ?? trip.stops?.filter((s) => s.status === 'FAILED').length ?? 0;
  const remainingStops = Math.max(0, totalStops - deliveredStops - failedStops);

  const deliveredPercent =
    totalStops > 0 ? Math.round((deliveredStops / totalStops) * 100) : 0;

  const failedPercent =
    totalStops > 0 ? Math.round((failedStops / totalStops) * 100) : 0;

  const canCheckinReturn =
    trip.status === 'IN_TRANSIT' &&
    trip.stops.length > 0 &&
    trip.stops.every((s) => s.status === 'DELIVERED' || s.status === 'FAILED');

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 ${
        trip.isOverdue && trip.status === 'IN_TRANSIT'
          ? 'border-rose-200 hover:border-rose-300'
          : 'border-slate-200/90 hover:border-indigo-200'
      }`}
    >
      <div className="space-y-3">
        {/* 1. Header: Mã chuyến, Biển số xe, Badge thời gian & Tên chuyến */}
        <div>
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center h-[26px] px-2.5 text-xs font-bold font-mono text-indigo-700 bg-indigo-50 rounded-lg border border-indigo-200/80">
                {trip.tripCode || (trip as any).code}
              </span>
              <span className="inline-flex items-center h-[26px] px-2 text-xs font-semibold font-mono text-slate-700 bg-slate-100 rounded-lg border border-slate-200">
                {trip.vehicleNumber || (trip as any).licensePlate}
              </span>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-lg text-xs font-semibold border shrink-0 whitespace-nowrap ${timingStatus.badgeClass}`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{timingStatus.text}</span>
            </span>
          </div>

          <h3 className="font-bold text-slate-900 text-sm mt-2 line-clamp-1" title={trip.tripName || (trip as any).name}>
            {trip.tripName || (trip as any).name}
          </h3>
        </div>

        {/* 2. Tài xế & Kho xuất */}
        <div className="grid grid-cols-2 gap-2 text-xs py-2 px-2.5 bg-slate-50/70 rounded-lg border border-slate-100">
          <div>
            <span className="text-slate-400 block text-[11px]">Tài xế:</span>
            <div className="font-medium text-slate-800 flex items-center gap-1 mt-0.5 truncate">
              <span className="truncate">{trip.driverName || 'Chưa gán'}</span>
              {trip.driverPhone && (
                <a
                  href={`tel:${trip.driverPhone}`}
                  className="text-indigo-600 hover:underline shrink-0"
                  title="Gọi tài xế"
                >
                  <Phone className="w-3 h-3 inline" />
                </a>
              )}
            </div>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Kho xuất:</span>
            <div className="font-medium text-slate-800 flex items-center gap-1 mt-0.5 truncate">
              <Warehouse className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{trip.warehouseName || 'Kho Tổng'}</span>
            </div>
          </div>
        </div>

        {/* 3. Tiến độ giao hàng */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-600">
              Tiến độ: <strong className="text-slate-900">{deliveredStops}/{totalStops} điểm</strong>
              {remainingStops > 0 && <span className="text-slate-400 text-[11px] ml-1">(chờ {remainingStops})</span>}
            </span>
            <span className="text-xs font-semibold text-slate-700">{deliveredPercent}%</span>
          </div>

          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: `${deliveredPercent}%` }}
              title={`Đã giao: ${deliveredStops} điểm`}
            />
            {failedStops > 0 && (
              <div
                className="bg-rose-500 h-full transition-all"
                style={{ width: `${failedPercent}%` }}
                title={`Giữ trên xe: ${failedStops} điểm`}
              />
            )}
          </div>

          {failedStops > 0 && (
            <p className="text-[11px] text-rose-600 font-medium mt-1">
              🔴 Có {failedStops} điểm giữ trên xe (cần đối soát)
            </p>
          )}
        </div>

        {/* 4. Tiền trên đường (Thông tin tài chính quan trọng nhất) */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <span className="flex items-center gap-1 text-slate-600 font-medium">
            <Truck className="w-3.5 h-3.5 text-slate-400" />
            Tiền trên đường:
          </span>
          <span className="font-bold text-sm text-indigo-700">
            {formatVndCurrency(trip.inTransitGoodsValue || 0)}
          </span>
        </div>
      </div>

      {/* 5. Nút Thao tác */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onOpenDetails(trip)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 h-[34px] text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:scale-[0.99] border border-indigo-200/70 transition-all cursor-pointer"
        >
          <span>Chi tiết điểm dừng</span>
          <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
        </button>

        {canCheckinReturn && !trip.returnedToWarehouse && (
          <button
            type="button"
            onClick={() => onOpenReturnCheckin(trip)}
            className="inline-flex items-center gap-1.5 px-3 h-[34px] text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all cursor-pointer shrink-0"
            title="Đối soát xe về kho và hoàn nhập hàng chưa giao"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đối soát</span>
          </button>
        )}
      </div>
    </div>
  );
};
