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
  formatTripDateTime,
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
      className={`rounded-xl border bg-white p-4 sm:p-4.5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
        trip.isOverdue && trip.status === 'IN_TRANSIT'
          ? 'border-rose-200 hover:border-rose-300'
          : 'border-slate-200/90 hover:border-indigo-200'
      }`}
    >
      <div>
        {/* Header: Mã chuyến, Biển số xe, Cảnh báo quá hạn */}
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/80">
                {trip.tripCode}
              </span>
              <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {trip.vehicleNumber}
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm mt-1.5 line-clamp-1">
              {trip.tripName}
            </h3>
          </div>

          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-2xs font-semibold border shrink-0 whitespace-nowrap ${timingStatus.badgeClass}`}
          >
            <Clock className="w-3 h-3 mr-1 shrink-0" />
            {timingStatus.text}
          </span>
        </div>

        {/* Thông tin tài xế & Kho */}
        <div className="grid grid-cols-2 gap-2.5 py-2.5 text-xs border-b border-slate-100">
          <div>
            <span className="text-slate-400 block text-2xs">Tài xế & Liên hệ</span>
            <div className="font-medium text-slate-800 flex items-center gap-1 mt-0.5">
              <span className="truncate">{trip.driverName}</span>
              {trip.driverPhone && (
                <a
                  href={`tel:${trip.driverPhone}`}
                  className="text-indigo-600 hover:text-indigo-800 hover:underline font-mono text-2xs ml-0.5 shrink-0"
                  title="Gọi tài xế"
                >
                  <Phone className="w-2.5 h-2.5 inline mr-0.5" />
                  {trip.driverPhone}
                </a>
              )}
            </div>
          </div>

          <div>
            <span className="text-slate-400 block text-2xs">Kho xuất phát</span>
            <div className="font-medium text-slate-800 flex items-center gap-1 mt-0.5 truncate">
              <Warehouse className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{trip.warehouseName}</span>
            </div>
          </div>
        </div>

        {/* Giờ xuất & Dự kiến ETA */}
        <div className="grid grid-cols-2 gap-2.5 py-2 text-xs border-b border-slate-100">
          <div>
            <span className="text-slate-400 block text-2xs">Giờ xuất phát:</span>
            <span className="font-mono text-slate-700 text-2xs">
              {formatTripDateTime(trip.departedAt)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-2xs">Dự kiến hoàn thành (ETA):</span>
            <span
              className={`font-mono text-2xs font-medium ${
                trip.isOverdue && trip.status === 'IN_TRANSIT'
                  ? 'text-rose-600'
                  : 'text-slate-700'
              }`}
            >
              {formatTripDateTime(trip.estimatedCompletionTime)}
            </span>
          </div>
        </div>

        {/* Tiến độ giao điểm dừng */}
        <div className="py-2.5 border-b border-slate-100">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-slate-700">
              Tiến độ: <strong className="text-slate-900">{deliveredStops}/{totalStops} điểm</strong>
            </span>
            <span className="text-slate-500 font-mono text-xs">{deliveredPercent}%</span>
          </div>

          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: `${deliveredPercent}%` }}
              title={`Đã giao: ${deliveredStops} điểm`}
            />
            <div
              className="bg-rose-500 h-full transition-all"
              style={{ width: `${failedPercent}%` }}
              title={`Chưa giao được: ${failedStops} điểm`}
            />
          </div>

          <div className="flex items-center justify-between mt-1.5 text-2xs text-slate-500">
            <span>🟢 {deliveredStops} đã giao</span>
            {failedStops > 0 && (
              <span className="text-rose-600 font-medium">
                🔴 {failedStops} giữ trên xe
              </span>
            )}
            <span>⚪ {remainingStops} đang chờ</span>
          </div>
        </div>

        {/* Cảnh báo hàng chưa giao giữ trên xe */}
        {failedStops > 0 && (
          <div className="my-2.5 px-3 py-2 rounded-lg bg-amber-50/80 border border-amber-200/80 text-2xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-amber-800 min-w-0">
              <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate font-medium">Hàng giữ trên xe:</span>
            </div>
            <span className="font-mono font-bold text-amber-900 shrink-0">
              {formatVndCurrency(trip.retainedGoodsValue)}
            </span>
          </div>
        )}

        {/* Khối tài chính tiền hàng */}
        <div className="bg-slate-50/80 rounded-lg p-3 my-2.5 border border-slate-200/70 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span>Tổng xuất:</span>
            <span className="font-mono font-medium text-slate-700">
              {formatVndCurrency(trip.totalGoodsValue)}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-500">
            <span>Đã giao xong:</span>
            <span className="font-mono font-medium text-emerald-700">
              {formatVndCurrency(trip.deliveredGoodsValue)}
            </span>
          </div>
          <div className="flex items-center justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-200">
            <span className="flex items-center gap-1 text-slate-700 text-xs font-medium">
              <Truck className="w-3.5 h-3.5 text-slate-500" />
              Tiền trên đường:
            </span>
            <span className="font-mono font-bold text-indigo-700">
              {formatVndCurrency(trip.inTransitGoodsValue)}
            </span>
          </div>
        </div>
      </div>

      {/* Hành động */}
      <div className="flex items-center gap-2 pt-1.5">
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
