import React, { useState, useEffect } from 'react';
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
  Pencil,
  Check,
  User,
  Lock,
} from 'lucide-react';
import type { DeliveryStop, DeliveryTrip, StopDeliveryStatus } from '../../types/delivery-trip';
import { formatTripDateTime, formatVndCurrency } from '../../utils/delivery-format';
import { deliveryTripsService } from '../../services/delivery-trips.service';

const COMMON_DRIVERS = [
  { name: 'Nguyễn Văn Toàn', phone: '0988123456', vehicle: '29H-868.99' },
  { name: 'Trần Minh Đức', phone: '0912888999', vehicle: '29C-456.78' },
  { name: 'Lê Quốc Hưng', phone: '0903789012', vehicle: '51D-987.65' },
  { name: 'Phạm Hồng Thái', phone: '0972111222', vehicle: '29C-333.44' },
  { name: 'Nguyễn Văn Thắng', phone: '0988123456', vehicle: '29H-868.99' },
];

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
  onTripUpdated?: (trip: DeliveryTrip) => void;
}

/**
 * Modal xem chi tiết chuyến đi & cập nhật kết quả từng điểm giao
 */
export const TripDetailModal: React.FC<TripDetailModalProps> = ({
  trip,
  isOpen,
  onClose,
  onUpdateStopStatus,
  onOpenReturnCheckin,
  onTripUpdated,
}) => {
  const [localTrip, setLocalTrip] = useState<DeliveryTrip | null>(trip);
  const [selectedStopForFailure, setSelectedStopForFailure] = useState<DeliveryStop | null>(null);
  const [failureReasonInput, setFailureReasonInput] = useState('');
  const [updatingStopId, setUpdatingStopId] = useState<string | null>(null);

  // Trạng thái sửa thông tin tài xế & số điện thoại
  const [isEditingDriver, setIsEditingDriver] = useState(false);
  const [editDriverName, setEditDriverName] = useState('');
  const [editDriverPhone, setEditDriverPhone] = useState('');
  const [editVehicleNumber, setEditVehicleNumber] = useState('');
  const [driverError, setDriverError] = useState('');
  const [savingDriver, setSavingDriver] = useState(false);
  const [driverSaveSuccess, setDriverSaveSuccess] = useState(false);

  useEffect(() => {
    setLocalTrip(trip);
    if (trip) {
      setEditDriverName(trip.driverName || '');
      setEditDriverPhone(trip.driverPhone || '');
      setEditVehicleNumber(trip.vehicleNumber || '');
    }
    setIsEditingDriver(false);
    setDriverError('');
    setDriverSaveSuccess(false);
  }, [trip]);

  if (!isOpen || !trip) return null;

  const displayTrip = localTrip || trip;

  const handlePhoneChange = (newPhone: string) => {
    setEditDriverPhone(newPhone);
    setDriverError('');
    // Khi thay đổi số điện thoại, nếu số khớp với danh sách tài xế quen thuộc thì tự điền tên và số xe tương ứng
    const matched = COMMON_DRIVERS.find((d) => d.phone === newPhone.trim());
    if (matched) {
      setEditDriverName(matched.name);
      setEditVehicleNumber(matched.vehicle);
    }
  };

  const handleSelectPresetDriver = (preset: { name: string; phone: string; vehicle: string }) => {
    setEditDriverName(preset.name);
    setEditDriverPhone(preset.phone);
    setEditVehicleNumber(preset.vehicle);
    setDriverError('');
  };

  const handleSaveDriver = async () => {
    if (!editDriverName.trim()) {
      setDriverError('Vui lòng nhập tên tài xế');
      return;
    }
    const cleanPhone = editDriverPhone.trim();
    if (!/^0[0-9]{9}$/.test(cleanPhone)) {
      setDriverError('Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0');
      return;
    }
    if (!editVehicleNumber.trim()) {
      setDriverError('Vui lòng nhập biển số xe');
      return;
    }

    try {
      setSavingDriver(true);
      setDriverError('');
      const updated = await deliveryTripsService.updateDriver(displayTrip.id, {
        driverName: editDriverName.trim(),
        driverPhone: cleanPhone,
        vehicleNumber: editVehicleNumber.trim(),
      });
      setLocalTrip(updated);
      setIsEditingDriver(false);
      setDriverSaveSuccess(true);
      setTimeout(() => setDriverSaveSuccess(false), 3000);
      onTripUpdated?.(updated);
    } catch (err) {
      setDriverError((err as Error).message || 'Lỗi khi cập nhật tài xế');
    } finally {
      setSavingDriver(false);
    }
  };

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
              <div className="flex items-center justify-between">
                <span className="text-slate-400 block text-2xs uppercase">Tài xế & Số xe</span>
                <button
                  type="button"
                  onClick={() => setIsEditingDriver(!isEditingDriver)}
                  className="text-indigo-600 hover:text-indigo-800 p-0.5 rounded hover:bg-indigo-50 inline-flex items-center gap-0.5 text-2xs font-semibold cursor-pointer"
                  title="Sửa thông tin tài xế & số điện thoại"
                >
                  <Pencil className="w-3 h-3" />
                  <span>{isEditingDriver ? 'Đóng' : 'Sửa'}</span>
                </button>
              </div>
              <p className="font-semibold text-slate-800 mt-0.5">{displayTrip.driverName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <a
                  href={`tel:${displayTrip.driverPhone}`}
                  className="text-indigo-600 font-mono text-2xs flex items-center gap-1"
                >
                  <Phone className="h-3 w-3" />
                  {displayTrip.driverPhone}
                </a>
                <span className="text-slate-400 text-2xs font-mono">• {displayTrip.vehicleNumber}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-2xs uppercase">Kho xuất</span>
              <p className="font-semibold text-slate-800 mt-0.5 truncate">{displayTrip.warehouseName}</p>
              <span className="text-slate-500 text-2xs">Đơn vị: {displayTrip.carrierName}</span>
            </div>

            <div>
              <span className="text-slate-400 block text-2xs uppercase">Thời gian</span>
              <p className="text-slate-700 mt-0.5">
                Xuất phát: <span className="font-mono">{formatTripDateTime(displayTrip.departedAt)}</span>
              </p>
              <p
                className={`text-2xs font-mono font-semibold ${
                  displayTrip.isOverdue && displayTrip.status === 'IN_TRANSIT' ? 'text-rose-600' : 'text-slate-600'
                }`}
              >
                ETA: {formatTripDateTime(displayTrip.estimatedCompletionTime)}
              </p>
            </div>

            <div>
              <span className="text-slate-400 block text-2xs uppercase">Tiền hàng trên đường</span>
              <p className="text-sm font-bold text-indigo-700 font-mono mt-0.5">
                {formatVndCurrency(displayTrip.inTransitGoodsValue)}
              </p>
              <span className="text-2xs text-slate-500">
                Tổng xuất: {formatVndCurrency(displayTrip.totalGoodsValue)}
              </span>
            </div>
          </div>

          {/* Form sửa thông tin tài xế & liên hệ */}
          {isEditingDriver && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-bold text-xs text-slate-900 uppercase">Cập nhật tài xế & Liên hệ</h4>
                </div>
                <span className="text-2xs text-slate-500">
                  Nhập SĐT để tự động nhận diện tài xế quen thuộc
                </span>
              </div>

              {/* Gợi ý chọn nhanh */}
              <div>
                <label className="block text-2xs font-semibold text-slate-600 mb-1">
                  Chọn nhanh tài xế:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_DRIVERS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPresetDriver(preset)}
                      className={`text-2xs px-2 py-1 rounded-md border font-medium transition-colors cursor-pointer ${
                        editDriverPhone === preset.phone && editDriverName === preset.name
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                      }`}
                    >
                      {preset.name} - {preset.phone} ({preset.vehicle})
                    </button>
                  ))}
                </div>
              </div>

              {/* 3 Trường nhập liệu */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">
                    Số điện thoại tài xế <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editDriverPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="VD: 0988123456"
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">
                    Họ & tên tài xế <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editDriverName}
                    onChange={(e) => {
                      setEditDriverName(e.target.value);
                      setDriverError('');
                    }}
                    placeholder="VD: Nguyễn Văn Toàn"
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">
                    Biển số xe giao <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editVehicleNumber}
                    onChange={(e) => {
                      setEditVehicleNumber(e.target.value);
                      setDriverError('');
                    }}
                    placeholder="VD: 29H-868.99"
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono uppercase focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {driverError && (
                <div className="text-2xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                  {driverError}
                </div>
              )}

              {/* Nút hành động */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingDriver(false);
                    setDriverError('');
                  }}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200/60 rounded-lg cursor-pointer transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={savingDriver}
                  onClick={handleSaveDriver}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{savingDriver ? 'Đang lưu...' : 'Lưu tài xế'}</span>
                </button>
              </div>
            </div>
          )}

          {driverSaveSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Đã cập nhật thông tin tài xế và số xe thành công!</span>
            </div>
          )}

          {/* Quy định nghiệp vụ kiểm soát hàng chưa giao xong */}
          <div className="rounded-xl bg-blue-50/80 border border-blue-200/90 p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
            <ShieldAlert className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">
                Quy định kiểm soát hàng chưa giao xong:
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
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold ${
                                displayTrip.returnedToWarehouse
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {displayTrip.returnedToWarehouse ? (
                                <RotateCcw className="h-3 w-3 text-amber-600" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                              {displayTrip.returnedToWarehouse
                                ? 'Chưa giao được (Đã nhập lại kho)'
                                : 'Chưa giao được (Giữ trên xe)'}
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

                        {/* Các nút cập nhật nếu chuyến đi đang chạy (Chỉ dành riêng cho Tài xế) */}
                        {trip.status === 'IN_TRANSIT' && (
                          <div className="flex flex-col sm:items-end gap-1 mt-1">
                            <div className="flex items-center gap-1.5">
                              {!isDelivered && (
                                <button
                                  type="button"
                                  disabled
                                  title="Chỉ tài xế phụ trách chuyến mới có quyền xác nhận"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700/60 border border-emerald-200/60 shadow-2xs opacity-75 cursor-not-allowed select-none"
                                >
                                  <Lock className="h-3 w-3 text-emerald-600/70" />
                                  <span>Giao xong</span>
                                </button>
                              )}

                              {!isFailed && (
                                <button
                                  type="button"
                                  disabled
                                  title="Chỉ tài xế phụ trách chuyến mới có quyền xác nhận"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700/60 border border-rose-200/60 opacity-75 cursor-not-allowed select-none"
                                >
                                  <Lock className="h-3 w-3 text-rose-500/70" />
                                  <span>Chưa giao được</span>
                                </button>
                              )}
                            </div>
                            <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 inline-flex items-center gap-1 font-medium select-none">
                              <Lock className="w-2.5 h-2.5 text-amber-600" />
                              Chỉ tài xế phụ trách chuyến mới có quyền xác nhận
                            </span>
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
