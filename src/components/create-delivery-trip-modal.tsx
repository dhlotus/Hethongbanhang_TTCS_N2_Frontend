import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  X,
  MapPin,
  User,
  AlertCircle,
  Loader2,
  Package,
} from 'lucide-react';
import type { Shipment } from '../services/shipments.service';
import type { DeliveryTrip, CreateDeliveryTripPayload } from '../types/delivery-trip';
import { deliveryTripsService } from '../services/delivery-trips.service';
import { showToast } from './toast';
import { matchesSearchTerm } from '../utils/vietnamese';

interface Props {
  availableShipments: Shipment[];
  onClose: () => void;
  onCreated: (trip: DeliveryTrip) => void;
}

const ROUTE_SUGGESTIONS = [
  'Hà Nội - Nội thành (Hoàn Kiếm, Ba Đình, Đống Đa)',
  'Hà Nội - Ngoại thành (Đông Anh, Gia Lâm, Sóc Sơn)',
  'Bắc Ninh - Bắc Giang',
  'TP. Hồ Chí Minh - Trung tâm (Quận 1, 3, 5, 10)',
  'TP. Hồ Chí Minh - Thủ Đức & Bình Dương',
  'Đồng Nai - Biên Hòa & Long Thành',
  'Miền Tây - Cần Thơ & Hậu Giang',
  'Đà Nẵng & Quảng Nam',
  'Tây Nguyên - Đắk Lắk & Gia Lai',
];

export const CreateDeliveryTripModal: React.FC<Props> = ({
  availableShipments,
  onClose,
  onCreated,
}) => {
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [name, setName] = useState(() => {
    const today = new Date();
    const dateStr = `${today.getDate()}/${today.getMonth() + 1}`;
    return `Chuyến giao hàng ngày ${dateStr}`;
  });
  const [routeArea, setRouteArea] = useState(ROUTE_SUGGESTIONS[0]);
  const [customRouteArea, setCustomRouteArea] = useState('');
  const [isCustomArea, setIsCustomArea] = useState(false);

  const [departureDate, setDepartureDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    return now.toISOString().slice(0, 16);
  });

  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Xe tải 2.5T');
  const [note, setNote] = useState('');

  // Selected shipments
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchShipment, setSearchShipment] = useState('');

  // Các phiếu xuất có thể gom: chưa có tripId và không phải DELIVERED/CANCELLED
  const eligibleShipments = useMemo(() => {
    return availableShipments.filter(
      (s) => !s.tripId && s.status !== 'DELIVERED' && s.status !== 'CANCELLED',
    );
  }, [availableShipments]);

  const filteredShipments = useMemo(() => {
    if (!searchShipment.trim()) return eligibleShipments;
    const q = searchShipment.trim();
    return eligibleShipments.filter(
      (s) =>
        matchesSearchTerm(s.id, q) ||
        matchesSearchTerm(s.orderCode, q) ||
        matchesSearchTerm(s.customerName, q) ||
        matchesSearchTerm(s.deliveryAddress, q) ||
        matchesSearchTerm(s.receiverName, q) ||
        matchesSearchTerm(s.phone, q),
    );
  }, [eligibleShipments, searchShipment]);

  const handleToggleShipment = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredShipments.length && filteredShipments.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredShipments.map((s) => s.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalRoute = isCustomArea ? customRouteArea.trim() : routeArea.trim();

    if (!name.trim()) {
      showToast('error', 'Vui lòng nhập tên chuyến giao hàng');
      return;
    }
    if (!finalRoute) {
      showToast('error', 'Vui lòng chọn hoặc nhập khu vực / tuyến giao');
      return;
    }
    if (selectedIds.length === 0) {
      showToast('error', 'Vui lòng chọn ít nhất 1 phiếu xuất kho để gom vào chuyến');
      return;
    }

    try {
      setSubmitting(true);
      const payload: CreateDeliveryTripPayload = {
        name: name.trim(),
        routeArea: finalRoute,
        departureDate: new Date(departureDate).toISOString(),
        driverName: driverName.trim() || undefined,
        driverPhone: driverPhone.trim() || undefined,
        vehicleNumber: vehicleNumber.trim() || undefined,
        vehicleType: vehicleType.trim() || undefined,
        note: note.trim() || undefined,
        shipmentIds: selectedIds,
      };

      const newTrip = await deliveryTripsService.createTrip(payload);
      showToast('success', `Đã tạo thành công chuyến giao hàng ${newTrip.tripCode} gồm ${selectedIds.length} điểm giao!`);
      onCreated(newTrip);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi tạo chuyến giao hàng');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-600" />
              Lập Chuyến Giao Hàng & Phân Tuyến (SN-196)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Gom nhiều phiếu xuất vào một chuyến giao theo khu vực và gán tài xế, phương tiện
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Section 1: Thông tin chuyến */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              1. Thông tin Tuyến & Chuyến giao
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Tên chuyến giao <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Chuyến giao Nội thành Hà Nội - Sáng"
                  className="w-full h-[38px] px-3 text-xs border border-slate-200 rounded-lg bg-slate-50/60 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Khu vực / Tuyến giao hàng <span className="text-rose-500">*</span>
                </label>
                {!isCustomArea ? (
                  <div className="flex gap-2">
                    <select
                      value={routeArea}
                      onChange={(e) => setRouteArea(e.target.value)}
                      className="flex-1 h-[38px] px-3 text-xs border border-slate-200 rounded-lg bg-slate-50/60 hover:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium cursor-pointer"
                    >
                      {ROUTE_SUGGESTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsCustomArea(true)}
                      className="px-2.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Tự nhập
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customRouteArea}
                      onChange={(e) => setCustomRouteArea(e.target.value)}
                      placeholder="Nhập tên tuyến / khu vực..."
                      className="flex-1 h-[38px] px-3 text-xs border border-slate-200 rounded-lg bg-slate-50/60 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomArea(false)}
                      className="px-2.5 text-xs text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Chọn có sẵn
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Thời gian xuất phát dự kiến <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="w-full h-[38px] px-3 text-xs border border-slate-200 rounded-lg bg-slate-50/60 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Ghi chú điều phối (tuỳ chọn)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: Xe cần tránh giờ cấm tải, ưu tiên giao điểm 1..."
                  className="w-full h-[38px] px-3 text-xs border border-slate-200 rounded-lg bg-slate-50/60 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Gán Tài xế & Xe */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              2. Gán Tài xế & Phương tiện vận chuyển (SN-196 AC 2)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1 sm:col-span-1">
                <label className="text-xs font-bold text-slate-700 block">Tên tài xế</label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="VD: Nguyễn Văn Hùng"
                  className="w-full h-[38px] px-3 text-xs border border-slate-200 rounded-lg bg-slate-50/60 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1 sm:col-span-1">
                <label className="text-xs font-bold text-slate-700 block">SĐT tài xế</label>
                <input
                  type="text"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="VD: 0908123456"
                  className="w-full h-[38px] px-3 text-xs border border-slate-200 rounded-lg bg-slate-50/60 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono"
                />
              </div>

              <div className="space-y-1 sm:col-span-1">
                <label className="text-xs font-bold text-slate-700 block">Biển số xe</label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="VD: 29C-889.92"
                  className="w-full h-[38px] px-3 text-xs border border-slate-200 rounded-lg bg-slate-50/60 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono font-bold"
                />
              </div>

              <div className="space-y-1 sm:col-span-1">
                <label className="text-xs font-bold text-slate-700 block">Loại xe</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full h-[38px] px-3 text-xs border border-slate-200 rounded-lg bg-slate-50/60 hover:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer"
                >
                  <option value="Xe tải 2.5T Thaco">Xe tải 2.5T Thaco</option>
                  <option value="Xe van 1.25T Hyundai">Xe van 1.25T Hyundai</option>
                  <option value="Xe tải 5T Isuzu">Xe tải 5T Isuzu</option>
                  <option value="Xe tải 1.5T Kia">Xe tải 1.5T Kia</option>
                  <option value="Xe máy giao gấp">Xe máy giao gấp</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              * Có thể để trống để điều phối gán tài xế sau khi đóng gói xong đủ hàng.
            </p>
          </div>

          {/* Section 3: Gom phiếu xuất kho */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-indigo-600" />
                  3. Gom các phiếu xuất kho vào chuyến (SN-196 AC 1)
                  <span className="text-rose-500">*</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Đã chọn: <strong className="text-indigo-600">{selectedIds.length}</strong> / {eligibleShipments.length} phiếu xuất khả dụng
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchShipment}
                  onChange={(e) => setSearchShipment(e.target.value)}
                  placeholder="Tìm theo mã đơn, khách, địa chỉ..."
                  className="h-[32px] px-2.5 text-[11px] border border-slate-200 rounded-lg bg-slate-50 focus:bg-white w-48"
                />
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  {selectedIds.length === filteredShipments.length && filteredShipments.length > 0
                    ? 'Bỏ chọn tất cả'
                    : 'Chọn tất cả'}
                </button>
              </div>
            </div>

            {eligibleShipments.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">
                  Hiện không có phiếu xuất kho nào sẵn sàng để gom chuyến.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  (Tất cả các phiếu xuất hiện tại đã được giao hoặc đã nằm trong chuyến giao khác).
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto bg-white divide-y divide-slate-100">
                {filteredShipments.map((s) => {
                  const isChecked = selectedIds.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleToggleShipment(s.id)}
                      className={`p-3 flex items-start gap-3 transition-colors cursor-pointer ${
                        isChecked ? 'bg-indigo-50/50' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="font-mono font-bold text-slate-900">{s.id}</span>
                          <span className="font-mono text-slate-500 ml-1.5">({s.orderCode})</span>
                          <div className="text-[11px] text-slate-700 font-medium truncate mt-0.5">
                            {s.customerName}
                          </div>
                        </div>
                        <div className="text-slate-600">
                          <div className="truncate text-[11px]">{s.deliveryAddress || 'Tại kho'}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Người nhận: <span className="font-medium text-slate-700">{s.receiverName || 'Đại lý'}</span>
                            {s.phone && <span className="font-mono ml-1 text-indigo-700 font-medium">({s.phone})</span>}
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            {s.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <div className="text-xs text-slate-600">
            Đã chọn: <strong className="text-indigo-600">{selectedIds.length}</strong> điểm dừng giao hàng
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex items-center justify-center h-[38px] px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSubmit as unknown as React.MouseEventHandler<HTMLButtonElement>}
              disabled={submitting || selectedIds.length === 0}
              className="inline-flex items-center justify-center gap-1.5 h-[38px] px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <Plus className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>Tạo Chuyến Giao Hàng</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
