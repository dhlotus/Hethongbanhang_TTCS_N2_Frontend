import React, { useState } from 'react';
import { X, Plus, Truck } from 'lucide-react';
import type { CreateDeliveryTripPayload } from '../../types/delivery-trip';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateDeliveryTripPayload) => Promise<void>;
}

/**
 * Modal tạo chuyến đi giao hàng mới (SN-194 / SN-197)
 */
export const CreateTripModal: React.FC<CreateTripModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [tripName, setTripName] = useState('');
  const [warehouseId, setWarehouseId] = useState('wh-001');
  const [warehouseName, setWarehouseName] = useState('Kho Tổng Miền Bắc - LOHA WH01');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [carrierName, setCarrierName] = useState('Đội xe nội bộ LOHA');
  const [estimatedHours, setEstimatedHours] = useState('4');
  const [orderIdsText, setOrderIdsText] = useState('DH2609-09920, DH2609-09921, DH2609-09922');
  const [startImmediately, setStartImmediately] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleWarehouseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setWarehouseId(val);
    if (val === 'wh-001') {
      setWarehouseName('Kho Tổng Miền Bắc - LOHA WH01');
    } else {
      setWarehouseName('Kho Tổng Miền Nam - LOHA WH02');
    }
  };

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

    const orderIds = orderIdsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (orderIds.length === 0) {
      alert('Vui lòng nhập ít nhất một mã đơn hàng cần giao');
      return;
    }

    const hours = Number(estimatedHours) || 4;
    const estimatedCompletionTime = new Date(Date.now() + hours * 3600 * 1000).toISOString();

    const payload: CreateDeliveryTripPayload = {
      tripName: tripName.trim(),
      warehouseId,
      warehouseName,
      driverName: driverName.trim(),
      driverPhone: driverPhone.trim(),
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      carrierName: carrierName.trim(),
      estimatedCompletionTime,
      orderIds,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-indigo-50/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Lập chuyến đi giao hàng mới
              </h2>
              <p className="text-xs text-slate-500">
                Gán phương tiện, tài xế và thiết lập mốc thời gian dự kiến (ETA)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
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
              placeholder="VD: Tuyến Ba Đình - Hoàn Kiếm (Chuyến chiều)"
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
                <option value="wh-001">Kho Tổng Miền Bắc - LOHA WH01</option>
                <option value="wh-002">Kho Tổng Miền Nam - LOHA WH02</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Thời gian dự kiến chạy (Giờ):
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
                placeholder="VD: Nguyễn Văn Nam"
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
                placeholder="09xxxxxxxx"
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
                placeholder="29C-123.45"
                className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono uppercase focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Đơn vị vận chuyển:
              </label>
              <input
                type="text"
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
                placeholder="VD: Đội xe nội bộ LOHA"
                className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Danh sách Mã Đơn hàng gom theo xe <span className="text-rose-500">*</span>:
            </label>
            <input
              type="text"
              required
              value={orderIdsText}
              onChange={(e) => setOrderIdsText(e.target.value)}
              placeholder="VD: DH2609-09920, DH2609-09921, DH2609-09922 (ngăn cách bằng dấu phẩy)"
              className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            <p className="text-2xs text-slate-400 mt-1">
              Nhập các mã đơn hàng đã đóng gói/xuất kho cần giao trong chuyến xe này
            </p>
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
              Xuất phát ngay (Chuyển trạng thái sang <strong>Đang chạy trên đường</strong>)
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
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
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
