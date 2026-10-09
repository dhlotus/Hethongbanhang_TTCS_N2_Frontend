import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Lock, Unlock, AlertCircle, X, RefreshCw, Building2 } from 'lucide-react';
import type { Customer } from '../types/customer.types';

export interface LockAgencyModalProps {
  open: boolean;
  mode: 'LOCK' | 'UNLOCK';
  customer: Customer | null;
  onClose: () => void;
  onConfirmLock: (reason: string) => Promise<void> | void;
  onConfirmUnlock: () => Promise<void> | void;
  loading?: boolean;
}

/**
 * Modal Khóa / Mở khóa giao dịch Đại lý (Task SN-36)
 * - Sử dụng createPortal gắn trực tiếp document.body để cố định 100% giữa màn hình
 * - Khóa cuộn trang nền (Scroll Lock trên cả body và main container) không để popup bị trượt
 * - Hỗ trợ phím tắt Escape và click backdrop đóng an toàn
 */
export const LockAgencyModal: React.FC<LockAgencyModalProps> = ({
  open,
  mode,
  customer,
  onClose,
  onConfirmLock,
  onConfirmUnlock,
  loading = false,
}) => {
  const [reason, setReason] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  // Reset form khi mở hoặc đổi đại lý
  useEffect(() => {
    if (open) {
      setReason('');
      setValidationError('');
    }
  }, [open, customer, mode]);

  // Khóa cuộn trang nền để popup cố định tuyệt đối giữa màn hình
  useEffect(() => {
    if (open && customer) {
      const prevBodyOverflow = document.body.style.overflow;
      const mainEl = document.querySelector('main');
      const prevMainOverflow = mainEl ? mainEl.style.overflow : '';

      document.body.style.overflow = 'hidden';
      if (mainEl) mainEl.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !loading) {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = prevBodyOverflow;
        if (mainEl) mainEl.style.overflow = prevMainOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [open, customer, loading, onClose]);

  if (!open || !customer) return null;

  const handleConfirm = async () => {
    if (loading) return;

    if (mode === 'LOCK') {
      if (!reason.trim()) {
        setValidationError('Vui lòng nhập lý do khóa giao dịch (Bắt buộc)');
        return;
      }
      setValidationError('');
      await onConfirmLock(reason.trim());
    } else {
      await onConfirmUnlock();
    }
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg max-h-[90vh] rounded-2xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header (shrink-0) */}
        <div
          className={`flex items-start justify-between p-5 border-b shrink-0 ${
            mode === 'LOCK' ? 'border-rose-100 bg-rose-50/60' : 'border-emerald-100 bg-emerald-50/60'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                mode === 'LOCK'
                  ? 'bg-rose-100 text-rose-600 ring-2 ring-rose-200/60'
                  : 'bg-emerald-100 text-emerald-600 ring-2 ring-emerald-200/60'
              }`}
            >
              {mode === 'LOCK' ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {mode === 'LOCK' ? 'Xác nhận khóa giao dịch đại lý' : 'Xác nhận mở khóa giao dịch'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {mode === 'LOCK'
                  ? 'Tạm dừng quyền tạo đơn hàng và các giao dịch bán buôn'
                  : 'Khôi phục quyền giao dịch và đặt hàng bình thường'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
            title="Đóng modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (flex-1 overflow-y-auto) */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Thông tin Mã & Tên đại lý */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              Đại lý áp dụng
            </div>
            <div className="font-semibold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
              <span>{customer.name}</span>
              <span className="font-mono text-xs px-2 py-0.5 bg-white border border-slate-200 rounded-md text-slate-600 font-normal">
                {customer.code}
              </span>
            </div>
            {customer.address && (
              <div className="text-xs text-slate-500 mt-1 line-clamp-1">
                {customer.address}
              </div>
            )}

            {mode === 'UNLOCK' && customer.lockReason && (
              <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-xs text-rose-700 bg-rose-50/70 p-2 rounded-lg border border-rose-100">
                <span className="font-semibold">Lý do khóa trước đây:</span> {customer.lockReason}
              </div>
            )}
          </div>

          {/* Nội dung chi tiết theo mode */}
          {mode === 'LOCK' ? (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Lý do khóa giao dịch <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (validationError && e.target.value.trim()) {
                    setValidationError('');
                  }
                }}
                placeholder="Nhập lý do khóa giao dịch (VD: Quá hạn thanh toán công nợ theo quy định, tạm dừng giao dịch...)"
                className={`w-full p-3 text-xs sm:text-sm rounded-xl border ${
                  validationError
                    ? 'border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-200 focus:border-rose-500'
                    : 'border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500'
                } focus:outline-none transition-all placeholder:text-slate-400 resize-none`}
                autoFocus
              />
              {validationError && (
                <p className="text-xs text-rose-600 flex items-center gap-1.5 font-medium mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{validationError}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-emerald-50/40 p-3 rounded-xl border border-emerald-100">
              Bạn có chắc chắn muốn mở khóa giao dịch cho đại lý này? Sau khi mở khóa, đại lý sẽ có thể tiếp tục tạo đơn hàng và giao dịch kinh doanh bình thường trên hệ thống.
            </div>
          )}
        </div>

        {/* Footer (shrink-0) */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>

          {mode === 'LOCK' ? (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Xác nhận khóa</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Xác nhận mở khóa</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
