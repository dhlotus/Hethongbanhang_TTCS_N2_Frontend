import React, { useState } from 'react';
import {
  X,
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
  Truck,
  Phone,
  User,
  Star,
  Edit2,
  AlertCircle,
  Save,
} from 'lucide-react';
import { showToast } from './toast';
import { customersService } from '../services/customers.service';
import type { Customer, DeliveryPoint } from '../types/customer';

interface DeliveryPointModalProps {
  open: boolean;
  customer: Customer;
  onClose: () => void;
  onUpdated: (points: DeliveryPoint[], selectedPointId?: string) => void;
}

interface FormState {
  id?: string;
  name: string;
  address: string;
  receiverName: string;
  phone: string;
  roadNote: string;
  isDefault: boolean;
}

const INITIAL_FORM: FormState = {
  name: '',
  address: '',
  receiverName: '',
  phone: '',
  roadNote: '',
  isDefault: false,
};

/**
 * Modal Quản lý và Khai báo nhiều điểm giao hàng cho Đại lý (SN-31 & SN-32)
 */
export const DeliveryPointModal: React.FC<DeliveryPointModalProps> = ({
  open,
  customer,
  onClose,
  onUpdated,
}) => {
  const [points, setPoints] = useState<DeliveryPoint[]>(customer.deliveryPoints || []);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const handleOpenAddForm = () => {
    setFormData({
      ...INITIAL_FORM,
      receiverName: customer.name,
      phone: customer.phone || '',
      isDefault: points.length === 0,
    });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (point: DeliveryPoint) => {
    setFormData({
      id: point.id,
      name: point.name,
      address: point.address,
      receiverName: point.receiverName || point.contactPerson || '',
      phone: point.phone || '',
      roadNote: point.roadNote || '',
      isDefault: Boolean(point.isDefault),
    });
    setIsFormOpen(true);
  };

  const handleCancelForm = () => {
    setFormData(INITIAL_FORM);
    setIsFormOpen(false);
  };

  const handleSavePoint = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast('error', 'Vui lòng nhập tên điểm giao hàng');
      return;
    }
    if (!formData.address.trim()) {
      showToast('error', 'Vui lòng nhập địa chỉ giao hàng');
      return;
    }
    if (!formData.receiverName.trim()) {
      showToast('error', 'Vui lòng nhập tên người nhận hàng');
      return;
    }
    if (!formData.phone.trim()) {
      showToast('error', 'Vui lòng nhập số điện thoại người nhận');
      return;
    }

    setIsSubmitting(true);
    try {
      if (formData.id) {
        // Cập nhật
        const updated = await customersService.updateDeliveryPoint(
          customer.id,
          formData.id,
          {
            name: formData.name,
            address: formData.address,
            receiverName: formData.receiverName,
            phone: formData.phone,
            roadNote: formData.roadNote,
            isDefault: formData.isDefault,
          },
        );

        let newPoints = points.map((p) => (p.id === updated.id ? updated : p));
        if (formData.isDefault) {
          newPoints = newPoints.map((p) => ({
            ...p,
            isDefault: p.id === updated.id,
          }));
        }
        setPoints(newPoints);
        showToast('success', `Đã cập nhật điểm giao "${updated.name}"`);
        onUpdated(newPoints, updated.id);
      } else {
        // Thêm mới
        const created = await customersService.createDeliveryPoint(customer.id, {
          name: formData.name,
          address: formData.address,
          receiverName: formData.receiverName,
          phone: formData.phone,
          roadNote: formData.roadNote,
          isDefault: formData.isDefault,
        });

        let newPoints = [...points, created];
        if (formData.isDefault) {
          newPoints = newPoints.map((p) => ({
            ...p,
            isDefault: p.id === created.id,
          }));
        }
        setPoints(newPoints);
        showToast('success', `Đã thêm điểm giao "${created.name}"`);
        onUpdated(newPoints, created.id);
      }

      handleCancelForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu điểm giao hàng';
      showToast('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (pointId: string) => {
    try {
      await customersService.setDefaultDeliveryPoint(customer.id, pointId);
      const newPoints = points.map((p) => ({
        ...p,
        isDefault: p.id === pointId,
      }));
      setPoints(newPoints);
      showToast('success', 'Đã đặt làm điểm giao hàng mặc định');
      onUpdated(newPoints, pointId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể đặt mặc định';
      showToast('error', msg);
    }
  };

  const handleDeletePoint = async (pointId: string, pointName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa điểm giao hàng "${pointName}"?`)) return;

    try {
      await customersService.deleteDeliveryPoint(customer.id, pointId);
      const newPoints = points.filter((p) => p.id !== pointId);
      if (newPoints.length > 0 && !newPoints.some((p) => p.isDefault)) {
        newPoints[0].isDefault = true;
      }
      setPoints(newPoints);
      showToast('success', `Đã xóa điểm giao "${pointName}"`);
      onUpdated(newPoints);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa điểm giao hàng';
      showToast('error', msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-lg overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                Điểm Giao Hàng — {customer.name}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Mã đại lý: <span className="font-medium text-slate-700">{customer.code}</span> · {points.length} điểm nhận hàng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4">
          {/* Nút thêm mới hoặc Form nhập */}
          {!isFormOpen ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Danh sách điểm nhận hàng (SN-31)
              </p>
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-medium rounded-lg shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm điểm giao mới
              </button>
            </div>
          ) : (
            /* Form thêm / sửa */
            <form
              onSubmit={handleSavePoint}
              className="p-3.5 sm:p-4 rounded-lg border border-[var(--color-primary-subtle)] bg-[var(--color-primary-light)]/40 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-semibold text-[var(--color-primary)]">
                  {formData.id ? 'Chỉnh sửa điểm giao hàng' : 'Khai báo điểm giao hàng mới'}
                </h3>
                <span className="text-[11px] text-[var(--color-primary)] font-medium">* Bắt buộc nhập</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-medium text-slate-700">
                    Tên gợi nhớ kho / điểm nhận hàng *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Kho Tổng Tân Bình, Điểm Bán Lẻ Q.1, Cửa Hàng 2..."
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    required
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-medium text-slate-700">
                    Địa chỉ giao hàng chi tiết *
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="VD: 123 Nguyễn Trọng Tuyển, P.8, Q.Phú Nhuận, TP.HCM"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    Người nhận hàng *
                  </label>
                  <input
                    type="text"
                    value={formData.receiverName}
                    onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })}
                    placeholder="Tên thủ kho hoặc người đại diện nhận"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    Số điện thoại nhận hàng *
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="VD: 0901234567"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    required
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-medium text-slate-700">
                    Ghi chú đường đi / Giao vận (SN-31)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.roadNote}
                    onChange={(e) => setFormData({ ...formData, roadNote: e.target.value })}
                    placeholder="VD: Hẻm 6m xe tải 2.5T vào được, giao giờ hành chính 8h-17h, gọi trước 30p..."
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefaultCheckbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4 text-[var(--color-primary)] rounded border-slate-300 focus:ring-[var(--color-primary)] cursor-pointer"
                />
                <label htmlFor="isDefaultCheckbox" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Đặt điểm này làm điểm giao hàng mặc định cho đại lý
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-primary-subtle)]">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-medium rounded-lg shadow-sm disabled:opacity-50 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Đang lưu...' : formData.id ? 'Cập nhật' : 'Thêm điểm'}
                </button>
              </div>
            </form>
          )}

          {/* Danh sách các điểm giao hàng */}
          <div className="space-y-2.5">
            {points.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs sm:text-sm text-slate-500">Đại lý chưa có điểm giao hàng nào.</p>
                <button
                  onClick={handleOpenAddForm}
                  className="mt-2 text-xs text-[var(--color-primary)] hover:underline font-medium"
                >
                  + Khai báo điểm giao đầu tiên ngay
                </button>
              </div>
            ) : (
              points.map((pt) => (
                <div
                  key={pt.id}
                  className={`p-3.5 rounded-lg border transition-all ${
                    pt.isDefault
                      ? 'border-[var(--color-primary-subtle)] bg-[var(--color-primary-light)]/30 ring-1 ring-[var(--color-primary)]/30 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-semibold text-slate-800">
                          {pt.name}
                        </span>
                        {pt.isDefault ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                            <CheckCircle2 className="w-3 h-3" />
                            Mặc định
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(pt.id)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                            title="Đặt điểm này làm mặc định"
                          >
                            <Star className="w-3 h-3" />
                            Đặt làm mặc định
                          </button>
                        )}
                      </div>

                      {/* Địa chỉ */}
                      <p className="text-xs text-slate-600 mt-1 flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{pt.address}</span>
                      </p>

                      {/* Người nhận & SĐT */}
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {pt.receiverName || pt.contactPerson || '—'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {pt.phone || '—'}
                        </span>
                      </div>

                      {/* Ghi chú đường đi */}
                      {pt.roadNote && (
                        <p className="text-xs text-amber-700 bg-amber-50/70 px-2 py-1 rounded-md mt-2 flex items-start gap-1.5 border border-amber-200/50">
                          <Truck className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>Ghi chú: {pt.roadNote}</span>
                        </p>
                      )}
                    </div>

                    {/* Nút hành động */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditForm(pt)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
                        title="Chỉnh sửa điểm giao"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePoint(pt.id, pt.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Xóa điểm giao"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
