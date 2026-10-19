import React from 'react';
import {
  Phone,
  Clock,
  RotateCcw,
  Warehouse,
  FileText,
} from 'lucide-react';
import type { DeliveryTrip } from '../../types/delivery-trip';
import {
  formatTripDateTime,
  formatVndCurrency,
  getTripTimingStatus,
} from '../../utils/delivery-format';

interface TripTableViewProps {
  trips: DeliveryTrip[];
  onOpenDetails: (trip: DeliveryTrip) => void;
  onOpenReturnCheckin: (trip: DeliveryTrip) => void;
}

/**
 * Bảng danh sách chuyến xe giao hàng siêu gọn (Dense Table View)
 * Tối ưu diện tích hiển thị, dễ nhìn, xem được nhiều chuyến trên 1 màn hình
 */
export const TripTableView: React.FC<TripTableViewProps> = ({
  trips,
  onOpenDetails,
  onOpenReturnCheckin,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-2.5 px-3">Mã chuyến / Xe</th>
              <th className="py-2.5 px-3">Tuyến đường & Kho xuất</th>
              <th className="py-2.5 px-3">Tài xế & Liên hệ</th>
              <th className="py-2.5 px-3">Khởi hành / ETA</th>
              <th className="py-2.5 px-3">Tiến độ giao</th>
              <th className="py-2.5 px-3 text-right">Tiền trên đường</th>
              <th className="py-2.5 px-3 text-center">Trạng thái ETA</th>
              <th className="py-2.5 px-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trips.map((trip) => {
              const timingStatus = getTripTimingStatus(
                trip.status,
                trip.estimatedCompletionTime,
                trip.departureDate || trip.departedAt,
              );
              const deliveredPercent =
                trip.totalStops > 0
                  ? Math.round((trip.deliveredStops / trip.totalStops) * 100)
                  : 0;
              const failedPercent =
                trip.totalStops > 0
                  ? Math.round((trip.failedStops / trip.totalStops) * 100)
                  : 0;

              const canCheckinReturn =
                trip.status === 'IN_TRANSIT' &&
                trip.stops.every(
                  (s) => s.status === 'DELIVERED' || s.status === 'FAILED',
                );

              return (
                <tr
                  key={trip.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    trip.isOverdue && trip.status === 'IN_TRANSIT'
                      ? 'bg-rose-50/20'
                      : ''
                  }`}
                >
                  {/* Cột 1: Mã chuyến & Biển số */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-xs">
                        {trip.tripCode}
                      </span>
                      <span className="font-mono font-medium text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                        {trip.vehicleNumber}
                      </span>
                    </div>
                  </td>

                  {/* Cột 2: Tuyến đường & Kho xuất */}
                  <td className="py-2.5 px-3 max-w-[240px]">
                    <div className="font-semibold text-slate-800 truncate" title={trip.tripName}>
                      {trip.tripName}
                    </div>
                    {trip.stops && trip.stops.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mt-0.5">
                        {trip.stops.slice(0, 2).map((s) => (
                          <span
                            key={s.id}
                            className="font-mono text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-200/60"
                            title={`${s.orderCode} - ${s.customerName}`}
                          >
                            {s.orderCode}
                          </span>
                        ))}
                        {trip.stops.length > 2 && (
                          <span className="text-[10px] text-slate-400">
                            +{trip.stops.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 truncate" title={trip.warehouseName}>
                      <Warehouse className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{trip.warehouseName}</span>
                    </div>
                  </td>

                  {/* Cột 3: Tài xế & Liên hệ */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="font-medium text-slate-800">{trip.driverName}</div>
                    <a
                      href={`tel:${trip.driverPhone}`}
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-[#371cdb] hover:underline mt-0.5"
                    >
                      <Phone className="w-2.5 h-2.5 text-slate-400" />
                      {trip.driverPhone}
                    </a>
                  </td>

                  {/* Cột 4: Thời gian Khởi hành -> ETA */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="text-[11px] text-slate-500">
                      Xuất: <span className="font-mono text-slate-700">{formatTripDateTime(trip.departedAt)}</span>
                    </div>
                    <div className="text-[11px] mt-0.5">
                      ETA:{' '}
                      <span
                        className={`font-mono font-medium ${
                          trip.isOverdue && trip.status === 'IN_TRANSIT'
                            ? 'text-rose-600'
                            : 'text-slate-700'
                        }`}
                      >
                        {formatTripDateTime(trip.estimatedCompletionTime)}
                      </span>
                    </div>
                  </td>

                  {/* Cột 5: Tiến độ giao điểm dừng */}
                  <td className="py-2.5 px-3 min-w-[150px]">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-medium text-slate-700">
                        {trip.deliveredStops}/{trip.totalStops} điểm ({deliveredPercent}%)
                      </span>
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="text-emerald-700 font-medium">🟢{trip.deliveredStops}</span>
                        {trip.failedStops > 0 && (
                          <span className="text-rose-600 font-bold">🔴{trip.failedStops}</span>
                        )}
                        <span className="text-slate-400">⚪{trip.remainingStops - trip.failedStops}</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${deliveredPercent}%` }}
                      />
                      <div
                        className="bg-rose-500 h-full transition-all"
                        style={{ width: `${failedPercent}%` }}
                      />
                    </div>
                  </td>

                  {/* Cột 6: Tiền trên đường */}
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="font-mono font-bold text-slate-900 text-xs">
                      {formatVndCurrency(trip.inTransitGoodsValue)}
                    </div>
                    {trip.retainedGoodsValue > 0 && (
                      <div className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 mt-0.5">
                        <RotateCcw className="w-2.5 h-2.5" />
                        Giữ xe: {formatVndCurrency(trip.retainedGoodsValue)}
                      </div>
                    )}
                  </td>

                  {/* Cột 7: Trạng thái ETA */}
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${timingStatus.badgeClass}`}
                    >
                      <Clock className="w-2.5 h-2.5 shrink-0" />
                      {timingStatus.text}
                    </span>
                  </td>

                  {/* Cột 8: Nút Thao tác */}
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenDetails(trip)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                        title="Xem chi tiết các điểm giao"
                      >
                        <FileText className="w-3 h-3 text-slate-500" />
                        <span>Chi tiết</span>
                      </button>

                      {canCheckinReturn && !trip.returnedToWarehouse && (
                        <button
                          type="button"
                          onClick={() => onOpenReturnCheckin(trip)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                          title="Đối soát xe về kho và hoàn nhập hàng chưa giao"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Đối soát</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
