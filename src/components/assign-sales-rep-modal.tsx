import React, { useState, useEffect } from 'react';
import { X, UserCheck, AlertCircle, Loader2 } from 'lucide-react';
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
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setSelectedSalesRepId(customer.salesRepId || '');
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

      const noteText = notes.trim() || undefined;
      const updated = await customersService.assignSalesRep(customer.id, {
        salesRepId: selectedSalesRepId,
        reason: noteText,
        notes: noteText,
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

  const formatRepOption = (rep: SalesRepOption) => {
    // Lọc bỏ email dài ngoặc đơn nếu có
    const cleanName = rep.fullName.replace(/\s*\([^)]*@[^)]*\)/g, '').trim();
    const count = rep.assignedCustomerCount !== undefined ? ` (${rep.assignedCustomerCount} đại lý)` : '';
    return `${cleanName}${count}`;
  };

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
                Chỉ định nhân viên kinh doanh phụ trách đại lý
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
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

          {/* Thông tin đại lý (Thẻ tinh tế 2 dòng, bỏ badge mã DL) */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
            <p className="text-sm font-bold text-slate-900">{customer.name}</p>
            <p className="text-xs text-slate-500 mt-1">
              {customer.region || 'Miền Nam'} • Đang phụ trách:{' '}
              <span className={customer.salesRepName ? 'font-semibold text-slate-800' : 'font-medium text-amber-600'}>
                {customer.salesRepName || 'Chưa có người phụ trách'}
              </span>
            </p>
          </div>

          {/* Chọn nhân viên phụ trách mới (Định dạng ngắn gọn, không tràn email) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
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
                  {formatRepOption(rep)}
                </option>
              ))}
            </select>
          </div>

          {/* Ghi chú / Lý do điều chuyển (Gộp 2 ô thành 1 ô duy nhất) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Ghi chú / Lý do điều chuyển
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhập ghi chú bàn giao hoặc lý do điều chuyển phụ trách đại lý..."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors resize-none"
            />
          </div>

          {/* Modal Actions (Bỏ nút Hủy bỏ, chỉ giữ Xác nhận) */}
          <div className="flex items-center justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSubmitting || !selectedSalesRepId}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:bg-indigo-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50 cursor-pointer"
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
