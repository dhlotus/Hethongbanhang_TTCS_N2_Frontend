import React, { useState, useEffect } from 'react';
import { X, CreditCard, AlertCircle, AlertTriangle, Check, CheckCircle2 } from 'lucide-react';
import type { CreditLimit, UpdateCreditLimitPayload } from '../../types/credit-limit.type';
import type { Customer } from '../../types/customer.types';

export type EditableAgencyItem =
  | CreditLimit
  | Customer
  | {
      id: string;
      agencyId?: string;
      agencyCode?: string;
      agencyName?: string;
      customerId?: string;
      customerCode?: string;
      customerName?: string;
      name?: string;
      code?: string;
      creditLimit: number;
      maxDebtDays?: number;
      currentDebt?: number;
      paymentTerms?: string;
      temporaryCreditLimit?: number;
    };

interface UpdateLimitModalProps {
  isOpen: boolean;
  item: EditableAgencyItem | null;
  onClose: () => void;
  onSubmit: (agencyId: string, payload: UpdateCreditLimitPayload) => Promise<void>;
  loading?: boolean;
}

const formatVND = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(val || 0);
};

const INVALID_REASON_MSG = 'Lý do chưa rõ ràng. Vui lòng mô tả cụ thể hơn (tối thiểu 10 ký tự).';

/**
 * Component Form Modal Cập nhật Hạn mức Công nợ (SN-34 Scope)
 * Đúng chuẩn 3 trường: Hạn mức tiền tối đa, Số ngày nợ tối đa, Lý do thay đổi (BẮT BUỘC)
 */
export const UpdateLimitModal: React.FC<UpdateLimitModalProps> = ({
  isOpen,
  item,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [creditLimitStr, setCreditLimitStr] = useState<string>('0');
  const [maxDebtDaysStr, setMaxDebtDaysStr] = useState<string>('30');
  const [reason, setReason] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [reasonError, setReasonError] = useState<string>('');
  const [touchedReason, setTouchedReason] = useState<boolean>(false);

  useEffect(() => {
    if (item) {
      setCreditLimitStr(formatVND(item.creditLimit || 0));
      setMaxDebtDaysStr(String(item.maxDebtDays ?? 30));
      setReason('');
      setErrorMsg('');
      setReasonError('');
      setTouchedReason(false);
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const displayName =
    ('agencyName' in item && item.agencyName) ||
    ('customerName' in item && item.customerName) ||
    ('name' in item && item.name) ||
    'Đại lý';
  const displayCode =
    ('agencyCode' in item && item.agencyCode) ||
    ('customerCode' in item && item.customerCode) ||
    ('code' in item && item.code) ||
    '';
  const agencyId =
    ('agencyId' in item && item.agencyId) ||
    ('customerId' in item && item.customerId) ||
    item.id;
  const currentDebt = item.currentDebt || 0;

  // Cho phép xóa sạch (empty string) khi backspace
  const handleMoneyChange = (raw: string, setter: (val: string) => void) => {
    if (raw === '' || raw.trim() === '') {
      setter('');
      return;
    }
    const numericOnly = raw.replace(/\D/g, '');
    if (!numericOnly) {
      setter('');
      return;
    }
    const num = Number(numericOnly);
    setter(formatVND(num));
  };

  const handleMoneyBlur = (
    currentVal: string,
    setter: (val: string) => void,
    defaultValue = 0
  ) => {
    if (!currentVal.trim()) {
      setter(formatVND(defaultValue));
    }
  };

  // Nhập số ngày nợ tối đa (InputNumber hỗ trợ xóa rỗng)
  const handleMaxDebtDaysChange = (raw: string) => {
    if (raw === '') {
      setMaxDebtDaysStr('');
      return;
    }
    const numericOnly = raw.replace(/\D/g, '');
    if (numericOnly === '') {
      setMaxDebtDaysStr('');
      return;
    }
    const days = Math.min(365, Number(numericOnly));
    setMaxDebtDaysStr(String(days));
  };

  const handleMaxDebtDaysBlur = () => {
    if (maxDebtDaysStr === '') {
      const defaultDays = item.maxDebtDays ?? 30;
      setMaxDebtDaysStr(String(defaultDays));
    }
  };

  const parsedCreditLimit = Number(creditLimitStr.replace(/\D/g, '') || 0);
  const parsedMaxDebtDays =
    maxDebtDaysStr === '' ? (item.maxDebtDays ?? 30) : Number(maxDebtDaysStr);
  const effectiveLimit = parsedCreditLimit + (item.temporaryCreditLimit || 0);
  const difference = parsedCreditLimit - (item.creditLimit || 0);

  // Tính tỷ lệ sử dụng mới dựa trên dư nợ hiện tại (làm tròn số nguyên chuẩn)
  const rawUsageRate =
    effectiveLimit > 0 ? (currentDebt / effectiveLimit) * 100 : 100;
  const roundedUsageRate = Math.round(rawUsageRate);

  // Kiểm tra trùng lặp dữ liệu (Prevent Duplicate/Dirty Log)
  const initialCreditLimit = item.creditLimit || 0;
  const initialDebtDays = item.maxDebtDays ?? 30;

  const isValuesUnchanged =
    parsedCreditLimit === initialCreditLimit &&
    parsedMaxDebtDays === initialDebtDays;

  const isReasonEmpty = reason.trim().length === 0;

  const isButtonDisabled = loading || isValuesUnchanged || isReasonEmpty;

  // Helper trích xuất thông báo lỗi thân thiện (SN-34)
  const getFriendlyCreditLimitErrorMessage = (err: unknown): string => {
    if (!err) return INVALID_REASON_MSG;
    const anyErr = err as any;
    const status = anyErr?.response?.status || anyErr?.statusCode;

    // Khi API cập nhật trả về HTTP Status 400 (Bad Request), hiển thị thông báo theo yêu cầu
    if (
      status === 400 ||
      (typeof anyErr?.message === 'string' &&
        (anyErr.message.includes('400') || anyErr.message.includes('status code 400')))
    ) {
      return INVALID_REASON_MSG;
    }

    const serverMsg = anyErr?.response?.data?.message;
    if (typeof serverMsg === 'string' && serverMsg.trim() && !serverMsg.includes('status code')) {
      return serverMsg;
    }
    if (err instanceof Error && err.message && !err.message.includes('status code')) {
      return err.message;
    }
    return INVALID_REASON_MSG;
  };

  // Validation Rules chặt chẽ cho Textarea Lý do (SN-34)
  const validateReasonRule = (text: string): string => {
    const trimmed = text.trim();
    // 1. Trống hoặc độ dài tối thiểu < 10 ký tự
    if (!trimmed || trimmed.length < 10) {
      return INVALID_REASON_MSG;
    }
    // 2. Chặn chuỗi không chứa chữ cái (chỉ nhập số/ký tự đặc biệt)
    if (!/[a-zA-ZàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/.test(trimmed)) {
      return INVALID_REASON_MSG;
    }
    // 3. Chặn chuỗi lặp 1 ký tự quá 3 lần liên tiếp (từ 4 lần liên tiếp: aaaa, ....., 1111)
    if (/(.)\1{3,}/.test(trimmed)) {
      return INVALID_REASON_MSG;
    }
    // 4. Chặn từ ngữ kéo dài vô nghĩa không có khoảng trắng hợp lý (> 15 ký tự liên tục)
    if (/\S{16,}/.test(trimmed)) {
      return INVALID_REASON_MSG;
    }
    return '';
  };

  const handleReasonChange = (val: string) => {
    setReason(val);
    if (touchedReason) {
      setReasonError(validateReasonRule(val));
    }
  };

  const handleReasonBlur = () => {
    setTouchedReason(true);
    setReasonError(validateReasonRule(reason));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');


    // 1. Validate Hạn mức tiền
    if (parsedCreditLimit < 0) {
      setErrorMsg('Hạn mức tiền không được là số âm.');
      return;
    }

    // 2. Validate Số ngày nợ
    if (parsedMaxDebtDays < 0) {
      setErrorMsg('Số ngày nợ tối đa phải lớn hơn hoặc bằng 0.');
      return;
    }

    // 3. Validate Lý do thay đổi (BẮT BUỘC tối thiểu 10 ký tự, diễn giải rõ ràng)
    const err = validateReasonRule(reason);
    if (err) {
      setTouchedReason(true);
      setReasonError(err);
      return;
    }

    const payload: UpdateCreditLimitPayload = {
      creditLimit: parsedCreditLimit,
      maxDebtDays: parsedMaxDebtDays,
      reason: reason.trim(),
    };

    try {
      await onSubmit(agencyId, payload);
    } catch (errSubmit: unknown) {
      const friendlyMsg = getFriendlyCreditLimitErrorMessage(errSubmit);
      setErrorMsg(friendlyMsg);
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
              <h3 className="text-lg font-bold text-slate-900">Cập Nhật Hạn Mức Công Nợ</h3>
              <p className="text-xs text-slate-500">
                Đại lý: <strong className="text-slate-700">{displayName}</strong>
                {displayCode ? ` (${displayCode})` : ''}
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

        {/* Body Modal Form - noValidate để triệt tiêu popup tiếng Anh của trình duyệt */}
        <form noValidate onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
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
                {formatVND(item.creditLimit || 0)} đ
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

          {/* Đúng 2 trường cấu hình chuẩn Jira SN-34: Hạn mức tiền & Số ngày nợ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Input 1: Hạn mức tiền tối đa */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Hạn mức tiền tối đa <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={creditLimitStr}
                  onChange={(e) => handleMoneyChange(e.target.value, setCreditLimitStr)}
                  onBlur={() => handleMoneyBlur(creditLimitStr, setCreditLimitStr, item.creditLimit || 0)}
                  className="w-full px-3 py-2 pr-10 text-sm font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                  placeholder="Ví dụ: 100,000,000"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">
                  đ
                </span>
              </div>
            </div>

            {/* Input 2: Số ngày nợ tối đa */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Số ngày nợ tối đa <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={maxDebtDaysStr}
                  onChange={(e) => handleMaxDebtDaysChange(e.target.value)}
                  onBlur={handleMaxDebtDaysBlur}
                  className="w-full px-3 py-2 pr-12 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] font-semibold"
                  placeholder="Ví dụ: 30"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">ngày</span>
              </div>
            </div>
          </div>

          {/* Hộp Thông báo Dư nợ Động (Dynamic Alert Box) đồng bộ theo 2 cấp độ rủi ro (SN-34) */}
          {roundedUsageRate > 100 ? (
            /* Cấp độ 2 (Vượt Trần - Tỷ lệ dư nợ > 100%): Nền đỏ, viền & chữ đỏ đồng bộ với badge Vượt Trần */
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs text-red-700 leading-relaxed font-medium">
                <p>
                  <strong>Cảnh báo vượt trần:</strong> Dư nợ hiện hành <strong>{formatVND(currentDebt)}đ</strong> đã vượt quá hạn mức <strong>{roundedUsageRate}%</strong>. Cần rà soát và thu hồi nợ trước khi cấp thêm.
                </p>
              </div>
            </div>
          ) : roundedUsageRate >= 80 ? (
            /* Cấp độ 1 (Cảnh Báo - Tỷ lệ dư nợ từ 80% đến 100%): Nền vàng/cam, viền & chữ cam đồng bộ với badge Cảnh Báo */
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 leading-relaxed font-medium">
                <p>
                  <strong>Cảnh báo:</strong> Dư nợ hiện hành của đại lý là <strong>{formatVND(currentDebt)}đ</strong>, đã đạt <strong>{roundedUsageRate}%</strong> hạn mức.
                </p>
              </div>
            </div>
          ) : (
            /* Trường hợp An toàn (Tỷ lệ dư nợ < 80%): Màu xanh thông báo tỷ lệ an toàn */
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-700 leading-relaxed font-medium">
                <p>
                  Dư nợ hiện hành của đại lý: <strong>{formatVND(currentDebt)}đ</strong>. Tỷ lệ sử dụng công nợ an toàn: <strong>{roundedUsageRate}%</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Input 3: Lý do thay đổi (BẮT BUỘC) - Yêu cầu người dùng tự điền tay */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Lý do thay đổi hạn mức (BẮT BUỘC) <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {reason.trim().length}/10 ký tự tối thiểu
              </span>
            </div>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => handleReasonChange(e.target.value)}
              onBlur={handleReasonBlur}
              placeholder="Nhập lý do thay đổi hạn mức công nợ (tối thiểu 10 ký tự)..."
              className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors ${
                reasonError
                  ? 'border-red-400 focus:ring-2 focus:ring-red-400/20 focus:border-red-500'
                  : 'border-slate-300 focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]'
              } focus:outline-none`}
            />

            {reasonError && (
              <p className="mt-2 text-xs text-red-500 font-medium flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{reasonError}</span>
              </p>
            )}
          </div>

          {/* Footer nút bấm (Đã xóa nút Hủy bỏ, chỉ giữ nút Lưu và [X]) */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 min-h-[44px]">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isButtonDisabled}
                className="px-5 py-2 text-xs font-semibold text-white bg-[var(--color-primary)] rounded-lg shadow-sm transition-all flex items-center gap-1.5 enabled:hover:bg-[var(--color-primary-hover)] enabled:hover:shadow enabled:active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--color-primary)] disabled:hover:shadow-none"
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
          </div>
        </form>
      </div>
    </div>
  );
};

/** Alias tương thích ngược */
export { UpdateLimitModal as CreditLimitUpdateModal };
