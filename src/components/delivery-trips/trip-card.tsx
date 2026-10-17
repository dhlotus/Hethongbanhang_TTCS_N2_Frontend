import React from 'react';
import {
  Truck,
  Phone,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronRight,
  Warehouse,
  ShieldAlert,
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
 * Card hiển thị chuyến đi giao hàng (SN-194 / SN-197)
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

  const deliveredPercent =
    trip.totalStops > 0 ? Math.round((trip.deliveredStops / trip.totalStops) * 100) : 0;

  const failedPercent =
    trip.totalStops > 0 ? Math.round((trip.failedStops / trip.totalStops) * 100) : 0;

  const canCheckinReturn =
    trip.status === 'IN_TRANSIT' &&
    trip.stops.every((s) => s.status === 'DELIVERED' || s.status === 'FAILED');

  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
        trip.isOverdue && trip.status === 'IN_TRANSIT'
          ? 'border-rose-300 ring-1 ring-rose-400/30'
          : 'border-slate-200'
      }`}
    >
      <div>
        {/* Header: Mã chuyến, Biển số, Trạng thái & Cảnh báo quá hạn */}
        <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                {trip.tripCode}
              </span>
              <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                🚗 {trip.vehicleNumber}
              </span>
              {trip.isOverdue && trip.status === 'IN_TRANSIT' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-300 animate-pulse">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Quá hạn {trip.overdueMinutes > 60 ? `${Math.floor(trip.overdueMinutes / 60)}h ${trip.overdueMinutes % 60}p` : `${trip.overdueMinutes} phút`}
                </span>
              )}
            </div>
            <h3 className="font-bold text-slate-900 mt-1.5 text-base line-clamp-1">
              {trip.tripName}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${timingStatus.badgeClass}`}
            >
              <Clock className="h-3 w-3 mr-1 shrink-0" />
              {timingStatus.text}
            </span>
          </div>
        </div>

        {/* Thông tin tài xế & Kho xuất */}
        <div className="grid grid-cols-2 gap-3 py-3 text-xs text-slate-600 border-b border-slate-100">
          <div>
            <span className="text-slate-400 block text-2xs uppercase">Tài xế & Liên hệ</span>
            <div className="font-medium text-slate-800 flex items-center gap-1.5 mt-0.5">
              <span>{trip.driverName}</span>
              <a
                href={`tel:${trip.driverPhone}`}
                className="text-indigo-600 hover:text-indigo-800 inline-flex items-center"
                title="Gọi tài xế"
              >
                <Phone className="h-3 w-3 ml-0.5" />
                <span className="text-2xs font-mono ml-0.5">{trip.driverPhone}</span>
              </a>
            </div>
          </div>

          <div>
            <span className="text-slate-400 block text-2xs uppercase">Kho xuất phát</span>
            <div className="font-medium text-slate-800 flex items-center gap-1 mt-0.5 line-clamp-1">
              <Warehouse className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{trip.warehouseName}</span>
            </div>
          </div>
        </div>

        {/* Mốc thời gian */}
        <div className="grid grid-cols-2 gap-3 py-2.5 text-xs border-b border-slate-100">
          <div>
            <span className="text-slate-400 block text-2xs">Giờ xuất phát:</span>
            <span className="font-mono text-slate-700 font-medium">
              {formatTripDateTime(trip.departedAt)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-2xs">Dự kiến hoàn thành (ETA):</span>
            <span
              className={`font-mono font-medium ${
                trip.isOverdue && trip.status === 'IN_TRANSIT'
                  ? 'text-rose-600 font-bold'
                  : 'text-slate-700'
              }`}
            >
              {formatTripDateTime(trip.estimatedCompletionTime)}
            </span>
          </div>
        </div>

        {/* Tiến độ giao hàng & Thanh tiến trình phân đoạn */}
        <div className="py-3 border-b border-slate-100">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-700">
              Tiến độ giao: {trip.deliveredStops}/{trip.totalStops} điểm
            </span>
            <span className="text-slate-500 font-mono text-xs">{deliveredPercent}% xong</span>
          </div>

          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
            {/* Đã giao thành công */}
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${deliveredPercent}%` }}
              title={`Đã giao: ${trip.deliveredStops} điểm`}
            />
            {/* Giao thất bại / Giữ trên xe */}
            <div
              className="bg-rose-500 h-full transition-all duration-300"
              style={{ width: `${failedPercent}%` }}
              title={`Chưa giao được (giữ trên xe): ${trip.failedStops} điểm`}
            />
          </div>

          <div className="flex items-center gap-3 mt-2 text-2xs text-slate-500">
            <span className="flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              {trip.deliveredStops} đã giao
            </span>
            {trip.failedStops > 0 && (
              <span className="flex items-center gap-1 text-rose-600 font-medium">
                <XCircle className="h-3 w-3" />
                {trip.failedStops} chưa giao được
              </span>
            )}
            <span className="flex items-center gap-1 text-slate-500">
              <Clock className="h-3 w-3" />
              {trip.remainingStops - trip.failedStops} đang chờ
            </span>
          </div>
        </div>

        {/* Hộp cảnh báo nếu có hàng giao thất bại nhưng vẫn giữ trên xe */}
        {trip.failedStops > 0 && (
          <div className="my-2.5 p-2.5 rounded-lg bg-amber-50/90 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Hàng chưa giao được thuộc trách nhiệm chuyến đi:</span>
              <p className="text-2xs text-amber-800 mt-0.5">
                Đang giữ trên xe trị giá{' '}
                <strong className="font-mono text-amber-950 font-bold">
                  {formatVndCurrency(trip.retainedGoodsValue)}
                </strong>
                . Hàng không tự động về kho mà chờ xe đối soát nhập lại.
              </p>
            </div>
          </div>
        )}

        {/* Tài chính tiền hàng */}
        <div className="bg-slate-50/90 rounded-xl p-3 my-3 border border-slate-200/60">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Tổng tiền hàng xuất xe:</span>
            <span className="font-mono font-semibold text-slate-700">
              {formatVndCurrency(trip.totalGoodsValue)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Đã giao dịch xong:</span>
            <span className="font-mono font-medium text-emerald-600">
              {formatVndCurrency(trip.deliveredGoodsValue)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-indigo-900 pt-1.5 border-t border-slate-200">
            <span className="flex items-center gap-1">
              <Truck className="h-3.5 w-3.5 text-indigo-600" />
              Tiền hàng trên đường:
            </span>
            <span className="font-mono text-sm text-indigo-600">
              {formatVndCurrency(trip.inTransitGoodsValue)}
            </span>
          </div>
        </div>
      </div>

      {/* Hành động */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={() => onOpenDetails(trip)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-200 cursor-pointer"
        >
          <span>Chi tiết & Cập nhật điểm</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        {canCheckinReturn && !trip.returnedToWarehouse && (
          <button
            type="button"
            onClick={() => onOpenReturnCheckin(trip)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-2xs cursor-pointer"
            title="Đối soát xe về kho và hoàn nhập hàng chưa giao"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Đối soát về kho</span>
          </button>
        )}
      </div>
    </div>
  );
};
