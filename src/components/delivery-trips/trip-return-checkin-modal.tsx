import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  CheckSquare,
  Square,
  Package,
  ShieldCheck,
} from 'lucide-react';
import type { DeliveryTrip } from '../../types/delivery-trip';
import { formatVndCurrency } from '../../utils/delivery-format';

interface TripReturnCheckinModalProps {
  trip: DeliveryTrip | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmCheckin: (
    tripId: string,
    confirmReturnAll: boolean,
    notes?: string,
  ) => Promise<void>;
}

/**
 * Modal Đối soát xe về kho & Hoàn nhập kho hàng chưa giao (SN-194 / SN-197)
 */
export const TripReturnCheckinModal: React.FC<TripReturnCheckinModalProps> = ({
  trip,
  isOpen,
  onClose,
  onConfirmCheckin,
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !trip) return null;

  const failedStops = trip.stops.filter((s) => s.status === 'FAILED');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      alert('Vui lòng tích chọn xác nhận đã kiểm đếm hàng trả về để nhập lại kho');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirmCheckin(trip.id, confirmed, notes.trim());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-4.5 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {trip.tripCode}
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                Đối soát xe về kho & Nhập lại hàng chưa giao
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-700 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 text-2xs block">Tài xế giao hàng:</span>
                <strong>{trip.driverName}</strong> ({trip.driverPhone})
              </div>
              <div>
                <span className="text-slate-400 text-2xs block">Biển số xe:</span>
                <strong>{trip.vehicleNumber}</strong>
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-2xs block">Kho tiếp nhận nhập lại:</span>
              <strong>{trip.warehouseName}</strong>
            </div>
          </div>

          {/* Danh sách các mặt hàng / điểm giao chưa giao được cần hoàn nhập */}
          <div>
            <h3 className="font-bold text-sm text-slate-900 mb-2 flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-600" />
              <span>Danh sách hàng chưa giao mang về kho ({failedStops.length} điểm)</span>
            </h3>

            {failedStops.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs">
                🎉 Tuyệt vời! Chuyến xe này đã giao thành công 100% tất cả các điểm, không có hàng
                thừa mang về kho.
              </div>
            ) : (
              <div className="space-y-2">
                {failedStops.map((stop) => (
                  <div
                    key={stop.id}
                    className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                          <span className="font-mono text-amber-700 font-bold">
                            {stop.orderCode}
                          </span>
                          <span>•</span>
                          <span>{stop.customerName}</span>
                        </div>
                        <p className="text-2xs text-slate-600 mt-0.5">{stop.deliveryAddress}</p>
                        <p className="text-2xs text-rose-700 font-medium mt-1">
                          Lý do chưa giao: {stop.failureReason || 'Khách hẹn dời ngày'}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-2xs text-slate-500 block">Giá trị hoàn kho:</span>
                        <span className="font-mono font-bold text-amber-700 text-sm">
                          {formatVndCurrency(stop.orderAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-between items-center p-3 rounded-xl bg-amber-100/70 border border-amber-300 text-xs font-bold text-amber-950">
                  <span>Tổng tiền hàng nhập lại kho:</span>
                  <span className="font-mono text-base text-amber-900">
                    {formatVndCurrency(trip.retainedGoodsValue)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Ghi chú đối soát */}
          <div>
            <label className="block text-2xs font-semibold text-slate-700 uppercase mb-1">
              Ghi chú biên bản bàn giao & đối soát về kho:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi nhận tình trạng niêm phong, bao bì sản phẩm, số lượng thực nhận tại cửa kho..."
              className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>

          {/* Hộp cam kết xác nhận của Quản lý kho */}
          <div
            onClick={() => setConfirmed(!confirmed)}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
              confirmed
                ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400'
                : 'bg-white border-slate-300 hover:border-slate-400'
            }`}
          >
            <div className="mt-0.5 text-amber-600 shrink-0">
              {confirmed ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
            </div>
            <div className="text-xs">
              <strong className="text-slate-900 block font-semibold">
                Xác nhận đối soát của Quản lý kho
              </strong>
              <p className="text-2xs text-slate-600 mt-0.5">
                Tôi xác nhận xe đã về đến kho an toàn, đã kiểm đếm đầy đủ số hàng chưa giao được (nếu
                có) và đồng ý nhập lại vào kho. Chuyến đi này sẽ chính thức chuyển sang trạng thái
                Hoàn tất (COMPLETED).
              </p>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={!confirmed || isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{isSubmitting ? 'Đang xử lý...' : 'Xác nhận nhập kho & Hoàn tất chuyến'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
