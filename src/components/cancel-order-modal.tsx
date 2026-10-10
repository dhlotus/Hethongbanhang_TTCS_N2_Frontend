import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, X, RefreshCw } from 'lucide-react';

interface CancelOrderModalProps {
  isOpen: boolean;
  orderCode: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  isOpen,
  orderCode,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do hủy đơn hàng.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onConfirm(reason.trim());
      setReason('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra khi hủy đơn hàng.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]">
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Hủy đơn hàng</h2>
              <p className="text-xs text-slate-500 font-mono">{orderCode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <p>
              Hành động này không thể hoàn tác. Số lượng tồn kho đang giữ chỗ cho đơn này (nếu có) sẽ được tự động giải phóng.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Lý do hủy đơn <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all resize-none ${
                error
                  ? 'border-red-300 focus:ring-red-500/20'
                  : 'border-slate-200 focus:ring-blue-500/20'
              } text-slate-800 placeholder-slate-400`}
              placeholder="Vui lòng nhập lý do hủy đơn (ví dụ: Khách đổi ý, Hết hàng...)"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              disabled={isSubmitting}
            />
            {error && <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Quay lại
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || !reason.trim()}
            className="inline-flex items-center gap-2 px-5 py-3 min-h-[36px] text-sm font-semibold text-white bg-red-500 hover:bg-red-600 active:scale-95 disabled:opacity-50 disabled:active:scale-100 rounded-md transition-all shadow-sm"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
            Xác nhận Hủy đơn
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
