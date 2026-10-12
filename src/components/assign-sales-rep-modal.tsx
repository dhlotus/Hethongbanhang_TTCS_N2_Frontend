import React, { useState, useEffect } from 'react';
import { X, UserCheck, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { customersService } from '../services/customers.service';
import { toast } from './toast';
import type { Customer, SalesRepOption } from '../types/customer';

interface AssignSalesRepModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  salesReps: SalesRepOption[];
  onSuccess: (updatedCustomer: Customer) => void;
}

/**
 * Modal Gán Nhân viên Kinh doanh phụ trách chính cho từng Đại lý (SN-35)
 * - Hiển thị đại lý cần phân công và người phụ trách hiện tại
 * - Chọn nhân viên kinh doanh từ danh sách nhân sự đang hoạt động
 * - Nhập lý do phân công / ghi chú địa bàn
 * - Phản hồi Toast và cập nhật trạng thái ngay lập tức
 */
export const AssignSalesRepModal: React.FC<AssignSalesRepModalProps> = ({
  isOpen,
  onClose,
  customer,
  salesReps,
  onSuccess,
}) => {
  const [selectedSalesRepId, setSelectedSalesRepId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setSelectedSalesRepId(customer.salesRepId || '');
      setReason('');
      setNotes('');
      setErrorMessage(null);
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalesRepId) {
      setErrorMessage('Vui lòng chọn nhân viên kinh doanh phụ trách');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const updated = await customersService.assignSalesRep(customer.id, {
        salesRepId: selectedSalesRepId,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success(
        `Đã gán thành công đại lý "${customer.name}" cho nhân viên phụ trách mới!`,
      );
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi gán nhân viên';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedRep = salesReps.find((r) => r.id === selectedSalesRepId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-fade-in">
      <div
        className="w-full max-w-lg overflow-hidden bg-white rounded-2xl shadow-xl border border-slate-200/80 transition-all transform scale-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Phân công Nhân viên Phụ trách
              </h3>
              <p className="text-xs text-slate-500">
                Gán nhân viên kinh doanh chịu trách nhiệm chăm sóc đại lý (SN-35)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4.5">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Thông tin đại lý */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Đại lý
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                {customer.code}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-800">{customer.name}</p>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-200/50">
              <span>Khu vực: <strong className="text-slate-700">{customer.region}</strong></span>
              <span>
                Hiện tại:{' '}
                <strong className={customer.salesRepName ? 'text-indigo-600' : 'text-amber-600'}>
                  {customer.salesRepName || 'Chưa có người phụ trách'}
                </strong>
              </span>
            </div>
          </div>

          {/* Chọn nhân viên phụ trách mới */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Nhân viên kinh doanh phụ trách chính <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedSalesRepId}
              onChange={(e) => setSelectedSalesRepId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              required
            >
              <option value="">-- Chọn nhân viên kinh doanh --</option>
              {salesReps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.fullName} ({rep.email}) — Đang phụ trách {rep.assignedCustomerCount} đại lý
                </option>
              ))}
            </select>
            {selectedRep && (
              <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                Số điện thoại liên hệ: <strong className="text-slate-700">{selectedRep.phone || 'Chưa cập nhật'}</strong>
              </p>
            )}
          </div>

          {/* Lý do phân công */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Lý do phân công / Điều chuyển
            </label>
            <div className="relative">
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ví dụ: Phân công địa bàn mới theo kế hoạch Q4/2026..."
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              />
            </div>
          </div>

          {/* Ghi chú thêm */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Ghi chú công việc / Hướng dẫn chăm sóc
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú đặc thù công nợ hoặc tuyến đường giao hàng..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 focus:outline-none transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:bg-indigo-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Xác nhận phân công</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
