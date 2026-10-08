import React, { useEffect, useState } from 'react';
import { X, History, Clock, User, ArrowRight, FileText } from 'lucide-react';
import type {
  CreditLimitHistory,
  CreditLimitItem,
} from '../../types/credit-limit';
import { creditLimitService } from '../../services/credit-limit.service';

interface CreditLimitHistoryModalProps {
  isOpen: boolean;
  item: CreditLimitItem | null;
  onClose: () => void;
}

const formatVND = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(val || 0);
};

const formatDate = (iso: string): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const CreditLimitHistoryModal: React.FC<CreditLimitHistoryModalProps> = ({
  isOpen,
  item,
  onClose,
}) => {
  const [histories, setHistories] = useState<CreditLimitHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && item) {
      setLoading(true);
      creditLimitService
        .getCreditLimitHistory(item.customerId)
        .then((data) => setHistories(data))
        .catch(() => setHistories([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Lịch Sử Điều Chỉnh Hạn Mức & Nhật Ký Kiểm Toán
              </h3>
              <p className="text-xs text-slate-500">
                Đại lý: <strong className="text-slate-700">{item.customerName}</strong> ({item.customerCode})
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <div className="h-6 w-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-500">
                Đang tải lịch sử điều chỉnh...
              </span>
            </div>
          ) : histories.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <FileText className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm">Chưa có lịch sử điều chỉnh nào được ghi nhận cho đại lý này.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {histories.map((h, idx) => {
                const diff = h.newCreditLimit - h.oldCreditLimit;
                return (
                  <div
                    key={h.id || idx}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-3"
                  >
                    {/* Hàng 1: Thời gian & Người thực hiện */}
                    <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{formatDate(h.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          {h.adjustedBy}{' '}
                          <span className="text-[11px] text-slate-400 font-normal">
                            ({h.adjustedRole})
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Hàng 2: Biến động Hạn mức */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="text-slate-500 mb-1">Hạn mức công nợ</div>
                        <div className="flex items-center gap-2 font-bold text-sm">
                          <span className="text-slate-500 line-through">
                            {formatVND(h.oldCreditLimit)} đ
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-[var(--color-primary)]">
                            {formatVND(h.newCreditLimit)} đ
                          </span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
                              diff > 0
                                ? 'bg-emerald-50 text-emerald-700'
                                : diff < 0
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {diff > 0 ? `+${formatVND(diff)}` : formatVND(diff)} đ
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="text-slate-500 mb-1">
                          Thời hạn nợ & Điều khoản
                        </div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                          <span>{h.oldMaxDebtDays} ngày</span>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-slate-900">
                            {h.newMaxDebtDays} ngày
                          </span>
                          <span className="text-xs font-normal text-slate-500">
                            ({h.newPaymentTerms})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Hàng 3: Lý do ghi nhận */}
                    <div className="text-xs text-slate-700 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                      <strong className="text-amber-900">Lý do điều chỉnh:</strong>{' '}
                      {h.reason}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
