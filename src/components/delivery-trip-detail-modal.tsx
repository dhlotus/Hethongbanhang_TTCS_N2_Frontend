import React, { useState } from 'react';
import {
  Truck,
  MapPin,
  Clock,
  Printer,
  CheckCircle2,
  XCircle,
  X,
  Play,
  RotateCcw,
  Loader2,
  Send,
} from 'lucide-react';
import type { DeliveryTrip, DeliveryTripStatus } from '../types/delivery-trip';
import { deliveryTripsService } from '../services/delivery-trips.service';
import { showToast } from './toast';
import { PrintTripManifestModal } from './print-trip-manifest-modal';

interface Props {
  trip: DeliveryTrip;
  canManage: boolean;
  onClose: () => void;
  onUpdated: (updated: DeliveryTrip) => void;
}

const TRIP_STATUS_CONFIG: Record<
  DeliveryTripStatus,
  { label: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }
> = {
  DRAFT: {
    label: 'Chờ điều xe',
    bg: 'bg-slate-50 border-slate-200',
    text: 'text-slate-700',
    icon: Clock,
  },
  ASSIGNED: {
    label: 'Đã gán tài xế',
    bg: 'bg-sky-50 border-sky-200',
    text: 'text-sky-700',
    icon: Truck,
  },
  IN_TRANSIT: {
    label: 'Đang giao hàng',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    icon: Play,
  },
  COMPLETED: {
    label: 'Đã hoàn thành',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'Đã hủy',
    bg: 'bg-rose-50 border-rose-200',
    text: 'text-rose-700',
    icon: XCircle,
  },
};

export const DeliveryTripDetailModal: React.FC<Props> = ({
  trip,
  canManage,
  onClose,
  onUpdated,
}) => {
  const [currentTrip, setCurrentTrip] = useState<DeliveryTrip>(trip);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isAssignDriverOpen, setIsAssignDriverOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form gán tài xế
  const [driverName, setDriverName] = useState(currentTrip.driverName || '');
  const [driverPhone, setDriverPhone] = useState(currentTrip.driverPhone || '');
  const [vehicleNumber, setVehicleNumber] = useState(currentTrip.vehicleNumber || '');
  const [vehicleType, setVehicleType] = useState(currentTrip.vehicleType || 'Xe tải 2.5T');

  const statusCfg = TRIP_STATUS_CONFIG[currentTrip.status];
  const StatusIcon = statusCfg.icon;

  const formatCurrency = (val?: number) => {
    return (val || 0).toLocaleString('vi-VN') + ' đ';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Gán tài xế & xe
  const handleAssignDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName.trim()) {
      showToast('error', 'Vui lòng nhập tên tài xế');
      return;
    }
    if (!vehicleNumber.trim()) {
      showToast('error', 'Vui lòng nhập biển số xe');
      return;
    }

    try {
      setIsSubmitting(true);
      const updated = await deliveryTripsService.assignDriver(currentTrip.id, {
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        vehicleNumber: vehicleNumber.trim(),
        vehicleType: vehicleType.trim() || undefined,
      });
      setCurrentTrip(updated);
      onUpdated(updated);
      setIsAssignDriverOpen(false);
      showToast('success', 'Đã gán tài xế và phương tiện cho chuyến thành công');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi gán tài xế');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xuất phát chuyến
  const handleDispatch = async () => {
    if (!currentTrip.driverName || !currentTrip.vehicleNumber) {
      showToast('error', 'Vui lòng gán tài xế và xe trước khi xuất phát');
      setIsAssignDriverOpen(true);
      return;
    }

    if (!window.confirm(`Xác nhận xuất phát chuyến giao ${currentTrip.tripCode}? Toàn bộ ${currentTrip.stops.length} phiếu xuất sẽ chuyển sang trạng thái Đang giao (SHIPPED).`)) {
      return;
    }

    try {
      setIsSubmitting(true);
      const updated = await deliveryTripsService.dispatchTrip(currentTrip.id);
      setCurrentTrip(updated);
      onUpdated(updated);
      showToast('success', `Chuyến giao ${currentTrip.tripCode} đã xuất phát thành công!`);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi xuất phát chuyến');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hoàn thành chuyến
  const handleComplete = async () => {
    if (!window.confirm(`Xác nhận hoàn thành chuyến giao ${currentTrip.tripCode}?`)) {
      return;
    }

    try {
      setIsSubmitting(true);
      const updated = await deliveryTripsService.completeTrip(currentTrip.id);
      setCurrentTrip(updated);
      onUpdated(updated);
      showToast('success', `Chuyến giao ${currentTrip.tripCode} đã hoàn tất`);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi hoàn tất chuyến');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hủy chuyến
  const handleCancelTrip = async () => {
    const reason = window.prompt('Nhập lý do hủy chuyến giao hàng này:');
    if (reason === null) return;

    try {
      setIsSubmitting(true);
      const updated = await deliveryTripsService.cancelTrip(currentTrip.id, reason || undefined);
      setCurrentTrip(updated);
      onUpdated(updated);
      showToast('success', `Đã hủy chuyến giao ${currentTrip.tripCode}`);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi hủy chuyến');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{currentTrip.name}</h3>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {currentTrip.tripCode}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusCfg.bg} ${statusCfg.text}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {statusCfg.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {currentTrip.routeArea}
                  </span>
                  <span>•</span>
                  <span>Xuất phát: {formatDate(currentTrip.departureDate)}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPrintOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 h-[34px] px-3 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all shadow-2xs cursor-pointer"
                title="In Lệnh điều xe & Bảng kê điểm giao (SN-196 AC 3)"
              >
                <Printer className="w-3.5 h-3.5 shrink-0" />
                <span>In Lệnh điều xe</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                <span className="text-[11px] font-medium text-slate-500 block mb-1">Tổng điểm giao</span>
                <span className="text-xl font-bold text-slate-900">{currentTrip.totalStops}</span>
                <span className="text-xs text-slate-500 ml-1">điểm dừng</span>
              </div>
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
                <span className="text-[11px] font-medium text-emerald-700 block mb-1">Đã giao thành công</span>
                <span className="text-xl font-bold text-emerald-700">{currentTrip.deliveredStops}</span>
                <span className="text-xs text-emerald-600 ml-1">/ {currentTrip.totalStops}</span>
              </div>
              <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                <span className="text-[11px] font-medium text-amber-700 block mb-1">Còn lại</span>
                <span className="text-xl font-bold text-amber-700">
                  {Math.max(0, currentTrip.totalStops - currentTrip.deliveredStops)}
                </span>
                <span className="text-xs text-amber-600 ml-1">điểm</span>
              </div>
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl">
                <span className="text-[11px] font-medium text-indigo-700 block mb-1">Tiền thu hộ (COD)</span>
                <span className="text-sm font-extrabold font-mono text-indigo-800">
                  {formatCurrency(currentTrip.totalCodAmount)}
                </span>
              </div>
            </div>

            {/* Thông tin Vận chuyển & Tài xế */}
            <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-indigo-600" />
                  Phương tiện & Tài xế phụ trách
                </h4>
                {canManage && currentTrip.status !== 'COMPLETED' && currentTrip.status !== 'CANCELLED' && (
                  <button
                    type="button"
                    onClick={() => setIsAssignDriverOpen(!isAssignDriverOpen)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    {currentTrip.driverName ? 'Thay đổi tài xế / xe' : '+ Gán tài xế & xe'}
                  </button>
                )}
              </div>

              {isAssignDriverOpen ? (
                <form onSubmit={handleAssignDriver} className="p-3 bg-white border border-indigo-100 rounded-lg space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Tên tài xế <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        placeholder="VD: Nguyễn Văn Hùng"
                        className="w-full h-[34px] px-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50/60 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        SĐT tài xế
                      </label>
                      <input
                        type="text"
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                        placeholder="VD: 0908123456"
                        className="w-full h-[34px] px-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50/60 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Biển số xe <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        placeholder="VD: 29C-123.45"
                        className="w-full h-[34px] px-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50/60 focus:bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Loại phương tiện
                      </label>
                      <select
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                        className="w-full h-[34px] px-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50/60 focus:bg-white"
                      >
                        <option value="Xe tải 2.5T Thaco">Xe tải 2.5T Thaco</option>
                        <option value="Xe van 1.25T Hyundai">Xe van 1.25T Hyundai</option>
                        <option value="Xe tải 5T Isuzu">Xe tải 5T Isuzu</option>
                        <option value="Xe tải 1.5T Kia">Xe tải 1.5T Kia</option>
                        <option value="Xe máy giao gấp">Xe máy giao gấp</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAssignDriverOpen(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      Lưu thông tin tài xế
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Tài xế:</span>
                    <span className="font-bold text-slate-800">{currentTrip.driverName || 'Chưa gán tài xế'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Số điện thoại:</span>
                    <span className="font-mono font-semibold text-slate-800">{currentTrip.driverPhone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Biển số xe:</span>
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50/70 px-1.5 py-0.5 rounded border border-indigo-200/60 inline-block">
                      {currentTrip.vehicleNumber || 'Chưa gán'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Loại xe:</span>
                    <span className="font-medium text-slate-700">{currentTrip.vehicleType || 'Xe tải'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Danh sách các điểm dừng giao hàng */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  Lộ trình các điểm giao hàng ({currentTrip.stops.length} điểm)
                </h4>
                <span className="text-[11px] text-slate-500 italic">Thứ tự giao theo cung đường tối ưu</span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                      <th className="py-2.5 px-3 text-center w-10">Thứ tự</th>
                      <th className="py-2.5 px-3 w-28">Mã phiếu / Đơn</th>
                      <th className="py-2.5 px-3">Đại lý & Người nhận</th>
                      <th className="py-2.5 px-3">Địa chỉ giao</th>
                      <th className="py-2.5 px-3 text-right w-28">Tiền thu hộ</th>
                      <th className="py-2.5 px-3 text-center w-28">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentTrip.stops.map((stop, idx) => (
                      <tr key={stop.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-3 text-center font-bold text-slate-700">
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 inline-flex items-center justify-center text-xs font-mono">
                            {stop.stopOrder || idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <div className="font-semibold text-slate-900">{stop.shipmentId}</div>
                          <div className="text-[11px] text-slate-400">{stop.orderCode}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800">{stop.customerName}</div>
                          <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                            <span className="font-medium text-slate-900">{stop.receiverName}</span>
                            <span>•</span>
                            <span className="font-mono text-indigo-700">{stop.receiverPhone || '—'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          <div className="line-clamp-2">{stop.deliveryAddress}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                          {formatCurrency(stop.codAmount)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {stop.status === 'DELIVERED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Đã giao
                            </span>
                          ) : stop.status === 'FAILED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-2.5 h-2.5" />
                              Thất bại
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-2.5 h-2.5" />
                              Chờ giao
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50 shrink-0">
            <div>
              {canManage && currentTrip.status !== 'COMPLETED' && currentTrip.status !== 'CANCELLED' && (
                <button
                  type="button"
                  onClick={handleCancelTrip}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Hủy chuyến này
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Nút Xuất phát chuyến (chuyển sang IN_TRANSIT) */}
              {canManage && (currentTrip.status === 'DRAFT' || currentTrip.status === 'ASSIGNED') && (
                <button
                  type="button"
                  onClick={handleDispatch}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-1.5 h-[38px] px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  ) : (
                    <Send className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>Xuất phát chuyến xe</span>
                </button>
              )}

              {/* Nút Hoàn thành chuyến */}
              {canManage && currentTrip.status === 'IN_TRANSIT' && (
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-1.5 h-[38px] px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>Hoàn thành chuyến giao</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal In Lệnh điều xe */}
      {isPrintOpen && (
        <PrintTripManifestModal trip={currentTrip} onClose={() => setIsPrintOpen(false)} />
      )}
    </>
  );
};
