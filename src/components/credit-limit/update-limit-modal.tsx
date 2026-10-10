import React, { useState, useEffect } from 'react';
import { X, CreditCard, AlertCircle, Check, ShieldAlert } from 'lucide-react';
import type { CreditLimit, UpdateCreditLimitPayload } from '../../types/credit-limit.type';
import { PaymentTerm } from '../../types/credit-limit.type';

interface UpdateLimitModalProps {
  isOpen: boolean;
  item: CreditLimit | null;
  onClose: () => void;
  onSubmit: (agencyId: string, payload: UpdateCreditLimitPayload) => Promise<void>;
  loading?: boolean;
}

const formatVND = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(val || 0);
};

/**
 * Component Form Modal Cập nhật Hạn mức Công nợ (SN-34)
 * Các input: Hạn mức tiền, Số ngày nợ, Lý do thay đổi (BẮT BUỘC)
 */
export const UpdateLimitModal: React.FC<UpdateLimitModalProps> = ({
  isOpen,
  item,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [creditLimitStr, setCreditLimitStr] = useState<string>('0');
  const [maxDebtDays, setMaxDebtDays] = useState<number>(30);
  const [reason, setReason] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState<string>(PaymentTerm.NET_30);
  const [temporaryCreditLimitStr, setTemporaryCreditLimitStr] = useState<string>('0');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (item) {
      setCreditLimitStr(formatVND(item.creditLimit));
      setMaxDebtDays(item.maxDebtDays || 30);
      setPaymentTerms(item.paymentTerms || PaymentTerm.NET_30);
      setTemporaryCreditLimitStr(formatVND(item.temporaryCreditLimit || 0));
      setReason('');
      setErrorMsg('');
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const handleMoneyChange = (raw: string, setter: (val: string) => void) => {
    const numericOnly = raw.replace(/\D/g, '');
    const num = Number(numericOnly || 0);
    setter(formatVND(num));
  };

  const parsedCreditLimit = Number(creditLimitStr.replace(/\D/g, '') || 0);
  const parsedTempLimit = Number(temporaryCreditLimitStr.replace(/\D/g, '') || 0);
  const totalNewEffectiveLimit = parsedCreditLimit + parsedTempLimit;
  const difference = parsedCreditLimit - item.creditLimit;

  // Tính tỷ lệ sử dụng mới dựa trên dư nợ hiện tại
  const newUsageRate =
    totalNewEffectiveLimit > 0
      ? Math.round((item.currentDebt / totalNewEffectiveLimit) * 10000) / 100
      : 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // 1. Validate Hạn mức tiền
    if (parsedCreditLimit < 0) {
      setErrorMsg('Hạn mức tiền không được là số âm.');
      return;
    }

    // 2. Validate Số ngày nợ
    if (maxDebtDays === undefined || maxDebtDays === null || maxDebtDays < 0) {
      setErrorMsg('Số ngày nợ tối đa phải lớn hơn hoặc bằng 0.');
      return;
    }

    // 3. Validate Lý do thay đổi (BẮT BUỘC)
    if (!reason.trim() || reason.trim().length < 5) {
      setErrorMsg('Vui lòng nhập lý do thay đổi hạn mức (tối thiểu 5 ký tự) để phục vụ kiểm toán.');
      return;
    }

    const payload: UpdateCreditLimitPayload = {
      creditLimit: parsedCreditLimit,
      maxDebtDays,
      reason: reason.trim(),
      paymentTerms,
      temporaryCreditLimit: parsedTempLimit > 0 ? parsedTempLimit : undefined,
    };

    try {
      await onSubmit(item.agencyId || item.id, payload);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi lưu dữ liệu.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center font-bold">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Cập Nhật Hạn Mức Công Nợ (SN-34)</h3>
              <p className="text-xs text-slate-500">
                Đại lý: <strong className="text-slate-700">{item.agencyName}</strong> (
                {item.agencyCode})
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

        {/* Body Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Hộp so sánh Hạn mức cũ & Mới */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-slate-500 mb-1">Hạn mức tiền hiện hành</div>
              <div className="text-base font-semibold text-slate-700">
                {formatVND(item.creditLimit)} đ
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Hạn mức tiền đề xuất mới</div>
              <div className="text-base font-bold text-[var(--color-primary)]">
                {formatVND(parsedCreditLimit)} đ
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Chênh lệch</div>
              <div
                className={`text-base font-bold ${
                  difference > 0
                    ? 'text-emerald-600'
                    : difference < 0
                      ? 'text-rose-600'
                      : 'text-slate-600'
                }`}
              >
                {difference > 0 ? `+${formatVND(difference)}` : formatVND(difference)} đ
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Input 1: Hạn mức tiền tối đa */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Hạn mức tiền tối đa (VND) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={creditLimitStr}
                  onChange={(e) => handleMoneyChange(e.target.value, setCreditLimitStr)}
                  className="w-full px-3 py-2 pr-10 text-sm font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                  placeholder="Ví dụ: 100,000,000"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">
                  đ
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Số tiền công nợ tối đa đại lý được phép nợ gối đầu.
              </p>
            </div>

            {/* Input 2: Số ngày nợ tối đa */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Số ngày nợ tối đa <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="365"
                  required
                  value={maxDebtDays}
                  onChange={(e) => setMaxDebtDays(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 pr-12 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                  placeholder="Ví dụ: 30"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">ngày</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Thời hạn được phép nợ kể từ khi giao hàng trước khi đến hạn thanh toán.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Input: Điều khoản thanh toán */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Điều khoản thanh toán
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] bg-white"
              >
                <option value={PaymentTerm.COD}>COD - Thanh toán ngay khi nhận hàng</option>
                <option value={PaymentTerm.NET_15}>NET 15 - Thanh toán trong 15 ngày</option>
                <option value={PaymentTerm.NET_30}>
                  NET 30 - Thanh toán trong 30 ngày (Chuẩn)
                </option>
                <option value={PaymentTerm.NET_45}>NET 45 - Thanh toán trong 45 ngày</option>
                <option value={PaymentTerm.NET_60}>NET 60 - Thanh toán trong 60 ngày</option>
                <option value={PaymentTerm.EOM_30}>EOM + 30 - Cuối tháng cộng 30 ngày</option>
              </select>
            </div>

            {/* Input: Hạn mức tạm thời */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Hạn mức tạm thời cấp thêm (Mùa vụ)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={temporaryCreditLimitStr}
                  onChange={(e) => handleMoneyChange(e.target.value, setTemporaryCreditLimitStr)}
                  className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                  placeholder="0"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">
                  đ
                </span>
              </div>
            </div>
          </div>

          {/* Thông tin dư nợ hiện tại & tỷ lệ dự kiến */}
          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <p>
                Dư nợ hiện hành của đại lý: <strong>{formatVND(item.currentDebt)} đ</strong>. Với
                hạn mức mới, tỷ lệ sử dụng công nợ ước tính là <strong>{newUsageRate}%</strong>.
              </p>
            </div>
          </div>

          {/* Input 3: Lý do thay đổi (BẮT BUỘC) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Lý do thay đổi hạn mức (BẮT BUỘC) <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do thay đổi hạn mức công nợ (tối thiểu 5 ký tự) để phục vụ kiểm toán hệ thống..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Lý do này sẽ được ghi nhận vào Nhật ký kiểm toán hệ thống (Audit Log) trong Database
              Transaction.
            </p>
          </div>

          {/* Footer nút bấm */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Lưu hạn mức công nợ</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/** Alias tương thích ngược */
export { UpdateLimitModal as CreditLimitUpdateModal };
