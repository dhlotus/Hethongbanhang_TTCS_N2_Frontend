import React, { useState } from 'react';
import { X, Lock, Unlock, AlertTriangle, Check } from 'lucide-react';
import type {
  CreditLimitItem,
  UpdateCreditStatusPayload,
} from '../../types/credit-limit';
import { CreditStatus } from '../../types/credit-limit';

interface CreditLimitStatusModalProps {
  isOpen: boolean;
  item: CreditLimitItem | null;
  onClose: () => void;
  onSubmit: (customerId: string, payload: UpdateCreditStatusPayload) => Promise<void>;
  loading?: boolean;
}

export const CreditLimitStatusModal: React.FC<CreditLimitStatusModalProps> = ({
  isOpen,
  item,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [reason, setReason] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen || !item) return null;

  const isCurrentlyBlocked = item.status === CreditStatus.BLOCKED;
  const targetStatus = isCurrentlyBlocked
    ? CreditStatus.NORMAL
    : CreditStatus.BLOCKED;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!reason.trim() || reason.trim().length < 5) {
      setErrorMsg('Vui lòng nhập lý do thay đổi trạng thái (tối thiểu 5 ký tự).');
      return;
    }

    try {
      await onSubmit(item.customerId, {
        status: targetStatus,
        reason: reason.trim(),
      });
      setReason('');
      onClose();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Không thể cập nhật trạng thái hạn mức.',
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${
                isCurrentlyBlocked
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-rose-50 text-rose-600'
              }`}
            >
              {isCurrentlyBlocked ? (
                <Unlock className="h-5 w-5" />
              ) : (
                <Lock className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isCurrentlyBlocked
                  ? 'Mở Khóa Hạn Mức Tín Dụng'
                  : 'Tạm Khóa Hạn Mức Tín Dụng'}
              </h3>
              <p className="text-xs text-slate-500">
                Đại lý: <strong className="text-slate-700">{item.customerName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              {errorMsg}
            </div>
          )}

          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              isCurrentlyBlocked
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-rose-50/70 border-rose-200 text-rose-900'
            }`}
          >
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              {isCurrentlyBlocked ? (
                <p>
                  Đại lý sẽ được phép tiếp tục đặt hàng mua trả chậm theo hạn
                  mức tín dụng được cấp.
                </p>
              ) : (
                <p>
                  Khi bị khóa, đại lý sẽ <strong>không thể tạo đơn hàng công nợ mới</strong> cho đến khi được Kế toán hoặc Quản lý mở khóa.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Lý do thực hiện <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isCurrentlyBlocked
                  ? 'Ví dụ: Đại lý đã hoàn tất thanh toán khoản nợ quá hạn...'
                  : 'Ví dụ: Tạm khóa do quá hạn thanh toán trên 30 ngày hoặc có tranh chấp...'
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50 ${
                isCurrentlyBlocked
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {loading ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>
                    {isCurrentlyBlocked ? 'Xác nhận mở khóa' : 'Xác nhận khóa'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
