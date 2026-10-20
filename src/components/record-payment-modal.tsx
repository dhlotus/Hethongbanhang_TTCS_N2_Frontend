import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Building2,
  DollarSign,
  Smartphone,
  ChevronDown,
  Check,
} from 'lucide-react';
import type { InvoiceItem } from '../services/invoices.service';
import { invoicesService } from '../services/invoices.service';
import { showToast } from './toast';

interface RecordPaymentModalProps {
  invoice: InvoiceItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedInvoice: InvoiceItem, message: string) => void;
}

interface PaymentMethodItem {
  value: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  bankDetail: string;
  defaultNote: string;
}

const PAYMENT_METHOD_OPTIONS: PaymentMethodItem[] = [
  {
    value: 'BANK_TRANSFER',
    shortLabel: 'Chuyển khoản ngân hàng',
    description: 'Vietcombank, MB, Techcombank qua UNC / QR',
    icon: Building2,
    bankDetail: 'Vietcombank CN TP.HCM — STK: 0071 0008 89999 — CÔNG TY CP LOHA SALES',
    defaultNote: 'Thanh toán qua ủy nhiệm chi Vietcombank',
  },
  {
    value: 'CASH',
    shortLabel: 'Tiền mặt',
    description: 'Nộp tại quầy thu quỹ hoặc COD khi giao nhận',
    icon: DollarSign,
    bankDetail: 'Nộp tiền mặt trực tiếp tại quầy Kế toán hoặc thanh toán COD khi nhận hàng',
    defaultNote: 'Nộp tiền mặt tại quầy kế toán',
  },
  {
    value: 'E_WALLET',
    shortLabel: 'Ví điện tử / Cổng thanh toán',
    description: 'VNPAY-QR, MoMo, ZaloPay, Thẻ ATM / Visa',
    icon: Smartphone,
    bankDetail: 'Quét mã QR thanh toán tức thời qua VNPAY / Cổng liên kết',
    defaultNote: 'Thanh toán ví điện tử trực tuyến',
  },
];

const formatCurrency = (val?: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(val || 0);
};

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !invoice) return null;

  const [amount, setAmount] = useState<number>(invoice.remainingAmount);
  const [paymentMethod, setPaymentMethod] = useState<string>('BANK_TRANSFER');
  const [note, setNote] = useState<string>('Thanh toán qua ủy nhiệm chi Vietcombank');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Custom Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedMethod =
    PAYMENT_METHOD_OPTIONS.find((opt) => opt.value === paymentMethod) ||
    PAYMENT_METHOD_OPTIONS[0];

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Hỗ trợ bàn phím: Escape đóng dropdown
  const handleDropdownKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIndex = PAYMENT_METHOD_OPTIONS.findIndex((opt) => opt.value === paymentMethod);
      const nextIndex =
        e.key === 'ArrowDown'
          ? (currentIndex + 1) % PAYMENT_METHOD_OPTIONS.length
          : (currentIndex - 1 + PAYMENT_METHOD_OPTIONS.length) % PAYMENT_METHOD_OPTIONS.length;
      handleSelectMethod(PAYMENT_METHOD_OPTIONS[nextIndex]);
    }
  };

  const handleSelectMethod = (option: PaymentMethodItem) => {
    const prevDefault = selectedMethod.defaultNote;
    setPaymentMethod(option.value);
    // Nếu ghi chú trước đó là mặc định của option cũ thì tự đổi sang mặc định mới
    if (!note.trim() || note === prevDefault) {
      setNote(`${option.defaultNote} - HĐ ${invoice.invoiceCode}`);
    }
    setIsDropdownOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setErrorMessage('Số tiền thanh toán phải lớn hơn 0 đ');
      return;
    }
    if (amount > invoice.remainingAmount) {
      setErrorMessage(`Số tiền không được vượt quá số dư nợ (${formatCurrency(invoice.remainingAmount)})`);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await invoicesService.recordPayment(invoice.id, {
        amount,
        paymentMethod,
        note,
      });

      showToast('success', res.message);
      onSuccess(res.invoice, res.message);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi ghi nhận thanh toán';
      setErrorMessage(msg);
      showToast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const SelectedIcon = selectedMethod.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
      }}
    >
      <div className="relative w-full max-w-[calc(100vw-1.25rem)] sm:max-w-md my-auto bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-2.5 px-3.5 sm:px-5 py-3 sm:py-3.5 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CreditCard className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                Ghi Nhận Thanh Toán Hóa Đơn
              </h2>
              <p className="text-[11px] text-slate-500 font-mono truncate">
                {invoice.invoiceCode} — {invoice.orderCode}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -mr-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Đóng modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-5 space-y-3.5 overflow-y-auto min-h-0 flex-1">
          {errorMessage && (
            <div className="flex items-center gap-2 p-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Hộp tóm tắt dư nợ */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600 gap-2">
              <span className="shrink-0">Tổng hóa đơn:</span>
              <span className="font-semibold text-slate-900 font-mono tabular-nums">{formatCurrency(invoice.amount)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 gap-2">
              <span className="shrink-0">Đã thanh toán:</span>
              <span className="font-semibold font-mono tabular-nums">{formatCurrency(invoice.paidAmount)}</span>
            </div>
            <div className="border-t border-slate-200 pt-1 flex justify-between font-bold text-slate-900 gap-2">
              <span className="text-rose-700 shrink-0">Dư nợ còn lại:</span>
              <span className="text-rose-700 font-mono text-sm tabular-nums">{formatCurrency(invoice.remainingAmount)}</span>
            </div>
          </div>

          {/* Ô nhập số tiền */}
          <div>
            <div className="flex flex-wrap justify-between items-center gap-1 mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Số tiền thanh toán (VND) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setAmount(invoice.remainingAmount)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline"
              >
                Trả hết ({formatCurrency(invoice.remainingAmount)})
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                min={1000}
                max={invoice.remainingAmount}
                step={1000}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono bg-white"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Quy đổi: <strong className="text-slate-800 font-mono">{formatCurrency(amount)}</strong>
            </p>
          </div>

          {/* Ô chọn Phương thức thanh toán chuẩn Responsive & Accessible */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phương thức thanh toán <span className="text-rose-500">*</span>
            </label>

            {/* Nút Trigger Dropdown (Vừa chiều rộng vùng nhập liệu, không đẩy giãn popup) */}
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              onKeyDown={handleDropdownKeyDown}
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
              className="w-full min-h-[42px] px-3 py-2 flex items-center justify-between rounded-lg border border-slate-300 bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors cursor-pointer text-left shadow-2xs"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <SelectedIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs sm:text-sm font-bold text-slate-800 block truncate">
                    {selectedMethod.shortLabel}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                  isDropdownOpen ? 'rotate-180 text-indigo-600' : ''
                }`}
              />
            </button>

            {/* Danh sách lựa chọn khi mở (Nằm gọn trong màn hình, tự xuống dòng) */}
            {isDropdownOpen && (
              <div
                role="listbox"
                className="absolute left-0 right-0 top-full mt-1.5 w-full bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto animate-fade-in"
              >
                {PAYMENT_METHOD_OPTIONS.map((opt) => {
                  const IconComp = opt.icon;
                  const isSelected = opt.value === paymentMethod;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelectMethod(opt)}
                      className={`w-full px-3 py-2.5 flex items-start gap-2.5 text-left transition-colors cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:outline-none ${
                        isSelected ? 'bg-indigo-50/80 hover:bg-indigo-50' : 'bg-white'
                      }`}
                    >
                      <div
                        className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <IconComp className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 break-words leading-tight">
                          {opt.shortLabel}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 whitespace-normal break-words leading-snug">
                          {opt.description}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5 ml-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Khối mô tả chi tiết phương thức (nằm bên dưới) */}
            <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <SelectedIcon className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span>Chi tiết phương thức:</span>
              </div>
              <p className="text-[11.5px] text-slate-600 whitespace-normal break-words leading-relaxed pl-5 font-medium">
                {selectedMethod.bankDetail}
              </p>
              {selectedMethod.value === 'BANK_TRANSFER' && (
                <p className="text-[11px] text-indigo-700 font-semibold pl-5 pt-0.5">
                  Cú pháp UNC: {invoice.invoiceCode} — {invoice.orderCode}
                </p>
              )}
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú chứng từ / Mã tham chiếu
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Ủy nhiệm chi số UNC-98765 chuyển khoản Vietcombank"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2.5 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full sm:w-auto px-4 h-9 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || amount <= 0}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 h-9 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{submitting ? 'Đang ghi nhận...' : 'Xác nhận thanh toán'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
