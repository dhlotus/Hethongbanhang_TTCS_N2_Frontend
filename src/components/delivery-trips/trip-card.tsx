import React from 'react';
import {
  Phone,
  Clock,
  RotateCcw,
  ChevronRight,
  Warehouse,
  FileText,
  CheckCircle2,
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
 * Thẻ chuyến xe giao hàng nhỏ gọn, dễ nhìn chuẩn Quản lý kho (SN-194 / SN-197)
 */
export const TripCard: React.FC<TripCardProps> = ({
  trip,
  onOpenDetails,
  onOpenReturnCheckin,
}) => {
  const timingStatus = getTripTimingStatus(
    trip.status,
    trip.estimatedCompletionTime,
    trip.departureDate || trip.departedAt,
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
      className={`rounded-xl border bg-white p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-2.5 ${
        trip.isOverdue && trip.status === 'IN_TRANSIT'
          ? 'border-rose-200 hover:border-rose-300'
          : 'border-slate-200/90 hover:border-slate-300'
      }`}
    >
      <div className="space-y-2">
        {/* Header: Mã chuyến, Biển số, Trạng thái ETA */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {trip.tripCode}
            </span>
            <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
              {trip.vehicleNumber}
            </span>
          </div>

          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border shrink-0 whitespace-nowrap ${timingStatus.badgeClass}`}
          >
            <Clock className="w-2.5 h-2.5 mr-1 shrink-0" />
            {timingStatus.text}
          </span>
        </div>

        {/* Tên tuyến */}
        <h3 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1" title={trip.tripName}>
          {trip.tripName}
        </h3>

        {/* Danh sách mã đơn hàng trong chuyến */}
        {trip.stops && trip.stops.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {trip.stops.slice(0, 3).map((s) => (
              <span
                key={s.id}
                className="font-mono text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/70"
                title={`${s.orderCode} - ${s.customerName}`}
              >
                {s.orderCode}
              </span>
            ))}
            {trip.stops.length > 3 && (
              <span className="text-[10px] text-slate-400">
                +{trip.stops.length - 3} đơn
              </span>
            )}
          </div>
        )}

        {/* Thông tin tài xế & Kho xuất */}
        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
          <div className="min-w-0">
            <span className="text-slate-400 block text-[10px]">Tài xế & Liên hệ</span>
            <div className="font-medium text-slate-800 flex items-center gap-1 truncate">
              <span className="truncate">{trip.driverName}</span>
              <a
                href={`tel:${trip.driverPhone}`}
                className="text-[#371cdb] hover:underline font-mono text-[11px] shrink-0"
                title="Gọi tài xế"
              >
                <Phone className="w-2.5 h-2.5 inline mr-0.5" />
                {trip.driverPhone}
              </a>
            </div>
          </div>

          <div className="min-w-0">
            <span className="text-slate-400 block text-[10px]">Kho xuất phát</span>
            <div className="font-medium text-slate-800 flex items-center gap-1 truncate">
              <Warehouse className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate" title={trip.warehouseName}>{trip.warehouseName}</span>
            </div>
          </div>
        </div>

        {/* Thời gian xuất & ETA */}
        <div className="flex items-center justify-between text-[11px] bg-slate-50/90 px-2 py-1 rounded-lg border border-slate-150">
          <div className="text-slate-500">
            Xuất: <span className="font-mono text-slate-700">{formatTripDateTime(trip.departedAt)}</span>
          </div>
          <div className="text-slate-500">
            ETA:{' '}
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

        {/* Tiến độ giao điểm dừng */}
        <div className="pt-0.5">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="font-medium text-slate-700">
              Tiến độ: <strong>{trip.deliveredStops}/{trip.totalStops} điểm</strong> ({deliveredPercent}%)
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="text-emerald-700 font-medium">🟢 {trip.deliveredStops}</span>
              {trip.failedStops > 0 && (
                <span className={trip.returnedToWarehouse ? 'text-amber-700 font-medium' : 'text-rose-600 font-bold'}>
                  {trip.returnedToWarehouse ? `📦 ${trip.failedStops} đã về kho` : `🔴 ${trip.failedStops} giữ xe`}
                </span>
              )}
              {trip.remainingStops > 0 && (
                <span className="text-slate-400">⚪ {trip.remainingStops}</span>
              )}
            </div>
          </div>

          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: `${deliveredPercent}%` }}
              title={`Đã giao: ${trip.deliveredStops} điểm`}
            />
            <div
              className="bg-rose-500 h-full transition-all"
              style={{ width: `${failedPercent}%` }}
              title={`Chưa giao xong: ${trip.failedStops} điểm`}
            />
          </div>
        </div>

        {/* Khối tiền hàng & Hàng giữ trên xe */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block">Tiền trên đường:</span>
            <span className="font-mono font-bold text-[#371cdb] text-xs sm:text-sm">
              {formatVndCurrency(trip.inTransitGoodsValue)}
            </span>
          </div>

          {trip.retainedGoodsValue > 0 ? (
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                <RotateCcw className="w-2.5 h-2.5 text-rose-600" />
                Giữ xe: {formatVndCurrency(trip.retainedGoodsValue)}
              </span>
            </div>
          ) : trip.failedStops > 0 && trip.returnedToWarehouse ? (
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                <RotateCcw className="w-2.5 h-2.5 text-amber-600" />
                {trip.deliveredStops > 0 ? `Đã nhập lại kho (${trip.failedStops} điểm)` : 'Đã nhập lại kho'}
              </span>
            </div>
          ) : (trip.status === 'COMPLETED' || (trip.totalStops > 0 && trip.deliveredStops === trip.totalStops)) && trip.failedStops === 0 ? (
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                Giao thành công
              </span>
            </div>
          ) : (
            <div className="text-right text-[11px] text-slate-400">
              Tổng xuất: {formatVndCurrency(trip.totalGoodsValue)}
            </div>
          )}
        </div>
      </div>

      {/* Hành động */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onOpenDetails(trip)}
          className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
        >
          <FileText className="w-3 h-3 text-slate-500" />
          <span>Chi tiết điểm dừng</span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
        </button>

        {canCheckinReturn && !trip.returnedToWarehouse && (
          <button
            type="button"
            onClick={() => onOpenReturnCheckin(trip)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-colors cursor-pointer shrink-0"
            title="Đối soát xe về kho và hoàn nhập hàng chưa giao"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Đối soát</span>
          </button>
        )}
      </div>
    </div>
  );
};
