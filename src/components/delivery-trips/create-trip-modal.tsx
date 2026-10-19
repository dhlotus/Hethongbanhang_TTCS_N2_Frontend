import React, { useState, useEffect, useMemo } from 'react';
import { X, Truck, Search, Package, MapPin } from 'lucide-react';
import type { CreateDeliveryTripPayload } from '../../types/delivery-trip';
import { ordersService, getStoredDemoOrders } from '../../services/orders.service';
import type { Order } from '../../types/order';
import { formatVndCurrency } from '../../utils/delivery-format';
import { matchesSearchTerm } from '../../utils/vietnamese';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateDeliveryTripPayload) => Promise<void>;
}

/**
 * Modal tạo chuyến đi giao hàng mới (SN-194 / SN-197)
 * Tích hợp trực tiếp dữ liệu danh sách đơn hàng từ bên "Theo dõi đơn hàng & Giao vận"
 */
export const CreateTripModal: React.FC<CreateTripModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [tripName, setTripName] = useState('');
  const [warehouseId, setWarehouseId] = useState('wh-002');
  const [warehouseName, setWarehouseName] = useState('Kho Tổng Miền Nam - LOHA WH02');
  const [driverName, setDriverName] = useState('Nguyễn Văn Thắng');
  const [driverPhone, setDriverPhone] = useState('0988123456');
  const [vehicleNumber, setVehicleNumber] = useState('29H-868.99');
  const [carrierName, setCarrierName] = useState('LOHA Fleet Logistics');
  const [estimatedHours, setEstimatedHours] = useState('4');
  const [startImmediately, setStartImmediately] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Danh sách đơn hàng từ bên "Theo dõi đơn hàng"
  const [candidateOrders, setCandidateOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrderCodes, setSelectedOrderCodes] = useState<string[]>([]);

  // Tải danh sách đơn hàng thực tế khi mở modal
  useEffect(() => {
    if (isOpen) {
      setLoadingOrders(true);
      const demoList = getStoredDemoOrders();

      ordersService
        .getOrders({ limit: 100 })
        .then((res) => {
          const list = res?.data && res.data.length > 0 ? res.data : demoList;
          // Lọc các đơn hàng chưa giao xong hoặc chưa hủy để có thể xuất giao
          const available = list.filter(
            (o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED',
          );
          setCandidateOrders(available);

          // Mặc định chọn trước đơn đã xuất kho (DISPATCHED) hoặc đang soạn nếu có
          const defaultDispatched = available.find((o) => o.status === 'DISPATCHED');
          if (defaultDispatched) {
            const defCode = defaultDispatched.orderCode || defaultDispatched.id || '';
            if (defCode) setSelectedOrderCodes([defCode]);
            setTripName(`Tuyến giao ${defaultDispatched.orderCode || defCode} - ${defaultDispatched.customerName || ''}`);
            if ((defaultDispatched as any).driverName) setDriverName((defaultDispatched as any).driverName);
            if ((defaultDispatched as any).driverPhone) setDriverPhone((defaultDispatched as any).driverPhone);
            if ((defaultDispatched as any).licensePlate) setVehicleNumber((defaultDispatched as any).licensePlate);
            if ((defaultDispatched as any).carrierName) setCarrierName((defaultDispatched as any).carrierName);
          } else if (available.length > 0) {
            const firstCode = available[0].orderCode || available[0].id || '';
            if (firstCode) setSelectedOrderCodes([firstCode]);
            setTripName(`Tuyến giao ${available[0].orderCode || firstCode} - ${available[0].customerName || ''}`);
          }
        })
        .catch(() => {
          const available = demoList.filter(
            (o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED',
          );
          setCandidateOrders(available);
          if (available.length > 0) {
            const firstCode = available[0].orderCode || available[0].id || '';
            if (firstCode) setSelectedOrderCodes([firstCode]);
            setTripName(`Tuyến giao ${available[0].orderCode || firstCode} - ${available[0].customerName || ''}`);
          }
        })
        .finally(() => {
          setLoadingOrders(false);
        });
    }
  }, [isOpen]);

  const handleWarehouseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setWarehouseId(val);
    if (val === 'wh-001') {
      setWarehouseName('Kho Tổng Miền Bắc - LOHA WH01');
    } else {
      setWarehouseName('Kho Tổng Miền Nam - LOHA WH02');
    }
  };

  // Đơn hàng khớp từ khóa tìm kiếm
  const filteredOrders = useMemo(() => {
    if (!orderSearch.trim()) return candidateOrders;
    const q = orderSearch.trim();
    return candidateOrders.filter(
      (o) =>
        matchesSearchTerm(o.orderCode, q) ||
        matchesSearchTerm(o.customerName, q) ||
        matchesSearchTerm(o.deliveryPoint?.address, q) ||
        matchesSearchTerm(o.deliveryPoint?.receiverName, q) ||
        matchesSearchTerm(o.deliveryPoint?.phone, q),
    );
  }, [candidateOrders, orderSearch]);

  const toggleSelectOrder = (code: string) => {
    setSelectedOrderCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const handleSelectAll = () => {
    if (selectedOrderCodes.length === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedOrderCodes([]);
    } else {
      setSelectedOrderCodes(
        filteredOrders
          .map((o) => o.orderCode || o.id || '')
          .filter((c): c is string => Boolean(c)),
      );
    }
  };

  // Tổng tiền hàng của các đơn đã chọn
  const selectedTotalAmount = useMemo(() => {
    return candidateOrders
      .filter((o) => {
        const code = o.orderCode || o.id || '';
        return code ? selectedOrderCodes.includes(code) : false;
      })
      .reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  }, [candidateOrders, selectedOrderCodes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripName.trim()) {
      alert('Vui lòng nhập tên chuyến đi');
      return;
    }
    if (!driverName.trim()) {
      alert('Vui lòng nhập tên tài xế');
      return;
    }
    if (!/^0[0-9]{9}$/.test(driverPhone.trim())) {
      alert('Số điện thoại tài xế phải gồm đúng 10 chữ số và bắt đầu bằng số 0');
      return;
    }
    if (!vehicleNumber.trim()) {
      alert('Vui lòng nhập biển số xe');
      return;
    }

    if (selectedOrderCodes.length === 0) {
      alert('Vui lòng chọn ít nhất một đơn hàng bên Theo dõi đơn hàng để giao');
      return;
    }

    const hours = Number(estimatedHours) || 4;
    const estimatedCompletionTime = new Date(Date.now() + hours * 3600 * 1000).toISOString();

    const payload: CreateDeliveryTripPayload = {
      tripName: tripName.trim(),
      name: tripName.trim(),
      warehouseId,
      warehouseName,
      driverName: driverName.trim(),
      driverPhone: driverPhone.trim(),
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      carrierName: carrierName.trim(),
      estimatedCompletionTime,
      orderIds: selectedOrderCodes,
      startImmediately,
      notes: notes.trim() || undefined,
    };

    try {
      setIsSubmitting(true);
      await onSubmit(payload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Lập chuyến đi giao hàng mới
              </h2>
              <p className="text-xs text-slate-500">
                Lấy dữ liệu đơn hàng từ bên Theo dõi đơn hàng & Giao vận để xếp xe
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Tên chuyến đi / Tuyến đường <span className="text-rose-500">*</span>:
            </label>
            <input
              type="text"
              required
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="VD: Tuyến Phú Nhuận - Giao các đơn chiều"
              className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Kho xuất phát <span className="text-rose-500">*</span>:
              </label>
              <select
                value={warehouseId}
                onChange={handleWarehouseChange}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="wh-002">Kho Tổng Miền Nam - LOHA WH02</option>
                <option value="wh-001">Kho Tổng Miền Bắc - LOHA WH01</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Thời gian dự kiến chạy (ETA):
              </label>
              <select
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
              >
                <option value="2">2 giờ (Giao nhanh nội quận)</option>
                <option value="4">4 giờ (Nửa ngày)</option>
                <option value="6">6 giờ (Cả ngày nội thành)</option>
                <option value="8">8 giờ (Tuyến ngoại tỉnh)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Tài xế <span className="text-rose-500">*</span>:
              </label>
              <input
                type="text"
                required
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="VD: Nguyễn Văn Thắng"
                className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                SĐT Tài xế <span className="text-rose-500">*</span>:
              </label>
              <input
                type="text"
                required
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="0988123456"
                className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Biển số xe <span className="text-rose-500">*</span>:
              </label>
              <input
                type="text"
                required
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="29H-868.99"
                className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono uppercase focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Đơn vị vận chuyển:
            </label>
            <input
              type="text"
              value={carrierName}
              onChange={(e) => setCarrierName(e.target.value)}
              placeholder="VD: LOHA Fleet Logistics"
              className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* CHỌN ĐƠN HÀNG TỪ BÊN THEO DÕI ĐƠN HÀNG */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <label className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-indigo-600" />
                  Chọn Đơn hàng cần gom xuất phát trên đường <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Dữ liệu đồng bộ trực tiếp từ bên Theo dõi đơn hàng & Giao vận
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                >
                  {selectedOrderCodes.length === filteredOrders.length && filteredOrders.length > 0
                    ? 'Bỏ chọn tất cả'
                    : 'Chọn tất cả'}
                </button>
              </div>
            </div>

            {/* Tìm kiếm đơn */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Tìm mã đơn, tên đại lý, địa chỉ giao..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
              />
            </div>

            {/* Danh sách các đơn hàng */}
            <div className="max-h-52 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-1.5 bg-white divide-y divide-slate-100">
              {loadingOrders ? (
                <div className="text-center py-4 text-xs text-slate-400">
                  Đang tải danh sách đơn hàng...
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">
                  Không tìm thấy đơn hàng nào phù hợp
                </div>
              ) : (
                filteredOrders.map((ord) => {
                  const code = (ord.orderCode || ord.id || '') as string;
                  const isChecked = selectedOrderCodes.includes(code);
                  return (
                    <div
                      key={ord.id || ord.orderCode}
                      onClick={() => toggleSelectOrder(code)}
                      className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                        isChecked ? 'bg-indigo-50/70 border border-indigo-200' : 'hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent onClick
                        className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <span className="font-mono font-bold text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-100">
                            {code}
                          </span>
                          <span className="font-bold text-slate-900 font-mono">
                            {formatVndCurrency(ord.grandTotal || 0)}
                          </span>
                        </div>
                        <div className="font-medium text-slate-800 truncate mt-0.5">
                          {ord.customerName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{ord.deliveryPoint?.address || 'Tại kho đại lý'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Thanh tổng kết các đơn đã chọn */}
            <div className="flex items-center justify-between bg-indigo-50/80 border border-indigo-100 px-3 py-2 rounded-lg text-xs">
              <span className="text-indigo-900 font-medium">
                Đã chọn: <strong>{selectedOrderCodes.length}</strong> đơn hàng
              </span>
              <span className="text-indigo-900 font-bold font-mono">
                Tổng tiền: {formatVndCurrency(selectedTotalAmount)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Ghi chú điều phối xe:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Lưu ý đường đi, hạn chế giờ tải trọng..."
              className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 select-none">
            <input
              type="checkbox"
              checked={startImmediately}
              onChange={(e) => setStartImmediately(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <span className="font-medium">
              Xuất phát ngay (Chuyển trạng thái các đơn sang <strong>Đang giao xe</strong> trên đường)
            </span>
          </label>

          {/* Buttons */}
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
              disabled={isSubmitting || selectedOrderCodes.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#371cdb] text-white hover:bg-[#2d14b8] transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Truck className="h-4 w-4" />
              <span>{isSubmitting ? 'Đang tạo...' : 'Tạo chuyến đi & Bàn giao'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
