import React, { useState } from 'react';
import {
  X,
  Truck,
  Phone,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MapPin,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import type { DeliveryStop, DeliveryTrip, StopDeliveryStatus } from '../../types/delivery-trip';
import { formatTripDateTime, formatVndCurrency } from '../../utils/delivery-format';

interface TripDetailModalProps {
  trip: DeliveryTrip | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStopStatus: (
    tripId: string,
    stopId: string,
    status: StopDeliveryStatus,
    failureReason?: string,
  ) => Promise<void>;
  onOpenReturnCheckin: (trip: DeliveryTrip) => void;
}

/**
 * Modal xem chi tiết chuyến đi & cập nhật kết quả từng điểm giao (SN-194 / SN-197)
 */
export const TripDetailModal: React.FC<TripDetailModalProps> = ({
  trip,
  isOpen,
  onClose,
  onUpdateStopStatus,
  onOpenReturnCheckin,
}) => {
  const [selectedStopForFailure, setSelectedStopForFailure] = useState<DeliveryStop | null>(null);
  const [failureReasonInput, setFailureReasonInput] = useState('');
  const [updatingStopId, setUpdatingStopId] = useState<string | null>(null);

  if (!isOpen || !trip) return null;

  const allStopsResolved = trip.stops.every(
    (s) => s.status === 'DELIVERED' || s.status === 'FAILED',
  );
  const canCheckinReturn = allStopsResolved && trip.status === 'IN_TRANSIT';

  const handleConfirmFailure = async () => {
    if (!selectedStopForFailure) return;
    if (!failureReasonInput.trim()) {
      alert('Bắt buộc nhập lý do khi ghi nhận điểm giao không thành công');
      return;
    }

    try {
      setUpdatingStopId(selectedStopForFailure.id);
      await onUpdateStopStatus(
        trip.id,
        selectedStopForFailure.id,
        'FAILED',
        failureReasonInput.trim(),
      );
      setSelectedStopForFailure(null);
      setFailureReasonInput('');
    } finally {
      setUpdatingStopId(null);
    }
  };

  const handleMarkDelivered = async (stop: DeliveryStop) => {
    try {
      setUpdatingStopId(stop.id);
      await onUpdateStopStatus(trip.id, stop.id, 'DELIVERED');
    } finally {
      setUpdatingStopId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between p-4 sm:p-4.5 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {trip.tripCode}
                </span>
                <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                  {trip.vehicleNumber}
                </span>
                {trip.isOverdue && trip.status === 'IN_TRANSIT' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium bg-rose-50 text-rose-700 border border-rose-200/70">
                    <AlertTriangle className="w-2.5 h-2.5 text-rose-500" />
                    Trễ {trip.overdueMinutes > 60 ? `${Math.floor(trip.overdueMinutes / 60)}h ${trip.overdueMinutes % 60}p` : `${trip.overdueMinutes}p`}
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                {trip.tripName}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cảnh báo quá hạn nếu có */}
        {trip.isOverdue && trip.status === 'IN_TRANSIT' && (
          <div className="bg-rose-50/70 border-b border-rose-200/70 px-4 py-2 text-2xs text-rose-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              <span className="truncate">
                Chuyến trễ <strong>{trip.overdueMinutes > 60 ? `${Math.floor(trip.overdueMinutes / 60)}h ${trip.overdueMinutes % 60}p` : `${trip.overdueMinutes}p`}</strong> so với ETA.
              </span>
            </div>
            <a
              href={`tel:${trip.driverPhone}`}
              className="text-rose-700 hover:text-rose-900 font-semibold underline shrink-0"
            >
              Gọi tài xế ({trip.driverPhone})
            </a>
          </div>
        )}

        {/* Nội dung cuộn */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Grid thông tin nhanh */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400 block text-2xs uppercase">Tài xế & Số xe</span>
              <p className="font-semibold text-slate-800 mt-0.5">{trip.driverName}</p>
              <a
                href={`tel:${trip.driverPhone}`}
                className="text-indigo-600 font-mono text-2xs flex items-center gap-1 mt-0.5"
              >
                <Phone className="h-3 w-3" />
                {trip.driverPhone}
              </a>
            </div>

            <div>
              <span className="text-slate-400 block text-2xs uppercase">Kho xuất</span>
              <p className="font-semibold text-slate-800 mt-0.5 truncate">{trip.warehouseName}</p>
              <span className="text-slate-500 text-2xs">Đơn vị: {trip.carrierName}</span>
            </div>

            <div>
              <span className="text-slate-400 block text-2xs uppercase">Thời gian</span>
              <p className="text-slate-700 mt-0.5">
                Xuất phát: <span className="font-mono">{formatTripDateTime(trip.departedAt)}</span>
              </p>
              <p
                className={`text-2xs font-mono font-semibold ${
                  trip.isOverdue && trip.status === 'IN_TRANSIT' ? 'text-rose-600' : 'text-slate-600'
                }`}
              >
                ETA: {formatTripDateTime(trip.estimatedCompletionTime)}
              </p>
            </div>

            <div>
              <span className="text-slate-400 block text-2xs uppercase">Tiền hàng trên đường</span>
              <p className="text-sm font-bold text-indigo-700 font-mono mt-0.5">
                {formatVndCurrency(trip.inTransitGoodsValue)}
              </p>
              <span className="text-2xs text-slate-500">
                Tổng xuất: {formatVndCurrency(trip.totalGoodsValue)}
              </span>
            </div>
          </div>

          {/* Quy định nghiệp vụ SN-194 / SN-197 */}
          <div className="rounded-xl bg-blue-50/80 border border-blue-200/90 p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
            <ShieldAlert className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">
                Quy định kiểm soát hàng chưa giao xong (SN-194 / SN-197):
              </strong>
              <p className="text-2xs text-blue-800 mt-1 leading-relaxed">
                Khi ghi nhận một điểm giao <em>Chưa giao được</em>, số hàng đó{' '}
                <strong>vẫn thuộc trách nhiệm chuyến đi và giữ trên xe</strong> (tiền hàng vẫn nằm
                trong số tiền trên đường), <strong>tuyệt đối không tự hồi về tồn kho</strong>. Chỉ
                khi xe quay về kho và Quản lý kho thực hiện{' '}
                <em>Đối soát & Nhập kho hàng trả về</em> thì hàng mới được làm thủ tục nhập lại kho.
              </p>
            </div>
          </div>

          {/* Danh sách các điểm dừng giao hàng */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>Danh sách điểm giao hàng trên chuyến</span>
                <span className="text-xs font-normal text-slate-500">
                  ({trip.deliveredStops}/{trip.totalStops} điểm đã giao)
                </span>
              </h3>

              {canCheckinReturn && !trip.returnedToWarehouse && (
                <button
                  type="button"
                  onClick={() => onOpenReturnCheckin(trip)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-2xs cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Đối soát xe về kho ngay</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {trip.stops.map((stop) => {
                const isDelivered = stop.status === 'DELIVERED';
                const isFailed = stop.status === 'FAILED';
                const isPending = stop.status === 'PENDING';
                const isUpdating = updatingStopId === stop.id;

                return (
                  <div
                    key={stop.id}
                    className={`rounded-xl border p-4 transition-all ${
                      isDelivered
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : isFailed
                        ? 'border-rose-300 bg-rose-50/40'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      {/* Cột trái: Thông tin đại lý & Đơn hàng */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="h-5 w-5 rounded-full bg-slate-200 text-slate-700 font-bold text-2xs flex items-center justify-center shrink-0">
                            {stop.stopOrder}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {stop.orderCode}
                          </span>
                          <span className="font-semibold text-slate-900 text-sm">
                            {stop.customerName}
                          </span>

                          {/* Badge trạng thái */}
                          {isDelivered && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="h-3 w-3" />
                              Đã giao thành công
                            </span>
                          )}
                          {isFailed && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <XCircle className="h-3 w-3" />
                              Chưa giao được (Giữ trên xe)
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="h-3 w-3" />
                              Chờ giao
                            </span>
                          )}
                        </div>

                        <div className="mt-2 text-xs text-slate-600 space-y-1">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span>{stop.deliveryAddress}</span>
                          </div>
                          <div className="flex items-center gap-3 text-2xs text-slate-500">
                            <span>Người nhận: {stop.contactPerson}</span>
                            <span>•</span>
                            <a
                              href={`tel:${stop.contactPhone}`}
                              className="text-indigo-600 font-mono"
                            >
                              SĐT: {stop.contactPhone}
                            </a>
                          </div>
                        </div>

                        {/* Lý do chưa giao được nếu có */}
                        {isFailed && stop.failureReason && (
                          <div className="mt-2.5 p-2 rounded-lg bg-rose-100/70 border border-rose-200 text-xs text-rose-900">
                            <strong>Lý do chưa giao được:</strong> {stop.failureReason}
                            <div className="text-2xs text-rose-700 mt-0.5 italic">
                              Hàng vẫn đang được tài xế giữ trên xe, chờ chuyến đi về kho kiểm nhận
                              nhập lại.
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Cột phải: Tiền hàng & Nút hành động */}
                      <div className="flex flex-col sm:items-end justify-between gap-2 shrink-0">
                        <div>
                          <span className="text-2xs text-slate-400 block sm:text-right">
                            Tiền hàng:
                          </span>
                          <span className="font-mono font-bold text-sm text-slate-900">
                            {formatVndCurrency(stop.orderAmount)}
                          </span>
                        </div>

                        {/* Các nút cập nhật nếu chuyến đi đang chạy */}
                        {trip.status === 'IN_TRANSIT' && (
                          <div className="flex items-center gap-1.5 mt-1">
                            {!isDelivered && (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleMarkDelivered(stop)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Giao xong</span>
                              </button>
                            )}

                            {!isFailed && (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => {
                                  setSelectedStopForFailure(stop);
                                  setFailureReasonInput(stop.failureReason || '');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <XCircle className="h-3 w-3" />
                                <span>Chưa giao được</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal con: Nhập lý do chưa giao được */}
        {selectedStopForFailure && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 text-rose-600">
                  <AlertTriangle className="h-4 w-4" />
                  Ghi nhận điểm giao chưa thành công
                </h4>
                <button
                  type="button"
                  onClick={() => setSelectedStopForFailure(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="text-xs text-slate-600 space-y-2">
                <p>
                  Đại lý: <strong>{selectedStopForFailure.customerName}</strong> (
                  <span className="font-mono">{selectedStopForFailure.orderCode}</span>)
                </p>
                <p className="text-amber-800 bg-amber-50/80 px-2.5 py-1.5 rounded border border-amber-200/70 text-2xs">
                  Hàng của điểm này sẽ giữ trên xe và cần đối soát khi về kho.
                </p>

                <div>
                  <label className="block text-2xs font-semibold text-slate-700 uppercase mb-1">
                    Lý do chưa giao được <span className="text-rose-500">*</span>:
                  </label>
                  <textarea
                    rows={3}
                    value={failureReasonInput}
                    onChange={(e) => setFailureReasonInput(e.target.value)}
                    placeholder="Ví dụ: Đại lý đóng cửa sửa đường cấm tải, hẹn giao lại sau 18h..."
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedStopForFailure(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={!failureReasonInput.trim() || updatingStopId !== null}
                  onClick={handleConfirmFailure}
                  className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 rounded-lg disabled:opacity-50 shadow-2xs cursor-pointer"
                >
                  {updatingStopId ? 'Đang lưu...' : 'Xác nhận giữ hàng trên xe'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Modal */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Trạng thái:{' '}
            <strong className="text-slate-800">
              {trip.status === 'IN_TRANSIT'
                ? 'Đang vận chuyển trên đường'
                : trip.status === 'COMPLETED'
                ? 'Đã hoàn tất chuyến'
                : trip.status}
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
