import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  MapPin,
  User,
  Loader2,
  Package,
  Search,
  ArrowLeft,
} from 'lucide-react';
import { shipmentsService, type Shipment } from '../services/shipments.service';
import type { CreateDeliveryTripPayload } from '../types/delivery-trip';
import { deliveryTripsService } from '../services/delivery-trips.service';
import { showToast } from '../components/toast';

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

const VEHICLE_TYPES = [
  'Xe máy',
  'Xe bán tải 500kg',
  'Xe tải 1.25T',
  'Xe tải 2.5T',
  'Xe tải 3.5T',
  'Xe tải 5T Thaco',
  'Xe chuyên dụng',
];

export const CreateDeliveryTripPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isIssuesContext = location.pathname.includes('/issues');
  const backListUrl = isIssuesContext ? '/inventory/issues?tab=trips' : '/inventory/shipments?tab=trips';

  const [availableShipments, setAvailableShipments] = useState<Shipment[]>([]);
  const [loadingShipments, setLoadingShipments] = useState(true);
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

  // Tải danh sách phiếu xuất kho để gom
  useEffect(() => {
    const loadShipments = async () => {
      try {
        setLoadingShipments(true);
        const data = await shipmentsService.getShipments();
        const list = Array.isArray(data) ? data : (data as any)?.items || [];
        setAvailableShipments(list);
      } catch (err) {
        console.error('Lỗi tải danh sách phiếu xuất kho:', err);
      } finally {
        setLoadingShipments(false);
      }
    };
    loadShipments();
  }, []);

  // Các phiếu xuất có thể gom: chưa có tripId và không phải DELIVERED/CANCELLED
  const eligibleShipments = useMemo(() => {
    return availableShipments.filter(
      (s) => !s.tripId && s.status !== 'DELIVERED' && s.status !== 'CANCELLED',
    );
  }, [availableShipments]);

  const filteredShipments = useMemo(() => {
    if (!searchShipment.trim()) return eligibleShipments;
    const q = searchShipment.toLowerCase().trim();
    return eligibleShipments.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.orderCode.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.deliveryAddress?.toLowerCase().includes(q) ||
        s.receiverName?.toLowerCase().includes(q),
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
      navigate(backListUrl);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi tạo chuyến giao hàng');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Thông tin Tuyến & Chuyến giao */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <button
                type="button"
                onClick={() => navigate(backListUrl)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer mr-1"
                title="Quay lại danh sách"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Thông tin Tuyến & Chuyến giao hàng
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Tên chuyến giao <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Chuyến giao Nội thành Hà Nội - Sáng"
                  className="w-full h-[38px] px-3 text-xs border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium"
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <label className="text-xs font-semibold text-slate-700 block">
                  Khu vực / Tuyến giao hàng <span className="text-rose-500">*</span>
                </label>
                {!isCustomArea ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <select
                      value={routeArea}
                      onChange={(e) => setRouteArea(e.target.value)}
                      className="flex-1 min-w-0 h-[38px] px-3 text-xs border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium cursor-pointer"
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
                      className="shrink-0 px-3 h-[38px] text-xs text-indigo-600 hover:text-indigo-800 font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Tự nhập
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="text"
                      value={customRouteArea}
                      onChange={(e) => setCustomRouteArea(e.target.value)}
                      placeholder="Nhập tên tuyến / khu vực..."
                      className="flex-1 min-w-0 h-[38px] px-3 text-xs border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomArea(false)}
                      className="shrink-0 px-3 h-[38px] text-xs text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Chọn có sẵn
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Thời gian xuất phát dự kiến <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="w-full h-[38px] px-3 text-xs border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Ghi chú điều phối (tùy chọn)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: Xe cần tránh giờ cấm tải, ưu tiên giao điểm 1..."
                  className="w-full h-[38px] px-3 text-xs border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Gán Tài xế & Phương tiện */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Tài xế & Phương tiện vận chuyển
              </h2>
              <span className="text-[11px] text-slate-400">
                Có thể để trống để điều phối gán tài xế sau khi đóng gói xong
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Tên tài xế</label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="VD: Nguyễn Văn Hùng"
                  className="w-full h-[38px] px-3 text-xs border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">SĐT tài xế</label>
                <input
                  type="text"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="VD: 0908123456"
                  className="w-full h-[38px] px-3 text-xs border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Biển số xe</label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="VD: 29C-889.92"
                  className="w-full h-[38px] px-3 text-xs border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Loại xe</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full h-[38px] px-3 text-xs border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
                >
                  {VEHICLE_TYPES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Card 3: Gom các Phiếu xuất kho vào Chuyến */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Gom phiếu xuất kho vào chuyến <span className="text-rose-500">*</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đã chọn <strong className="text-indigo-600 font-bold">{selectedIds.length}</strong> / {eligibleShipments.length} phiếu xuất khả dụng
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchShipment}
                    onChange={(e) => setSearchShipment(e.target.value)}
                    placeholder="Tìm theo mã đơn, khách, địa chỉ..."
                    className="w-full h-[34px] pl-8 pr-3 text-xs border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </div>
                {filteredShipments.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="h-[34px] px-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/60 rounded-lg transition-colors whitespace-nowrap cursor-pointer shrink-0"
                  >
                    {selectedIds.length === filteredShipments.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                )}
              </div>
            </div>

            {/* Danh sách phiếu xuất dạng bảng/thẻ */}
            <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
              {loadingShipments ? (
                <div className="py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                  <p className="text-xs">Đang nạp danh sách phiếu xuất kho...</p>
                </div>
              ) : filteredShipments.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-medium text-slate-600">
                    {eligibleShipments.length === 0
                      ? 'Hiện không có phiếu xuất kho nào sẵn sàng để gom chuyến'
                      : 'Không tìm thấy phiếu xuất nào khớp với từ khóa'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Chỉ các phiếu xuất kho chưa được gán vào chuyến xe và chưa hoàn tất giao mới có thể gom.
                  </p>
                </div>
              ) : (
                filteredShipments.map((shp) => {
                  const isSelected = selectedIds.includes(shp.id);
                  return (
                    <div
                      key={shp.id}
                      onClick={() => handleToggleShipment(shp.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3.5 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500/30 shadow-2xs'
                          : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleShipment(shp.id)}
                          className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {shp.id}
                            </span>
                            <span className="text-slate-400 text-xs">·</span>
                            <span className="font-mono text-indigo-600 text-xs font-medium">
                              {shp.orderCode}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {shp.customerName}
                          </p>
                          <div className="text-[11px] text-slate-500 flex items-center gap-3 flex-wrap">
                            {shp.deliveryAddress && (
                              <span className="flex items-center gap-1 truncate max-w-md">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{shp.deliveryAddress}</span>
                              </span>
                            )}
                            {shp.receiverName && (
                              <span className="flex items-center gap-1 text-slate-600">
                                <User className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{shp.receiverName} ({shp.phone || 'Không có SĐT'})</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                            shp.status === 'PACKED'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {shp.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-slate-600">
              Đã chọn: <strong className="text-indigo-600 text-sm font-bold">{selectedIds.length}</strong> điểm dừng giao hàng
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(backListUrl)}
                disabled={submitting}
                className="px-5 h-[38px] text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting || selectedIds.length === 0}
                className="inline-flex items-center justify-center gap-2 h-[38px] px-6 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none rounded-lg transition-all shadow-xs cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Tạo Chuyến Giao Hàng</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
