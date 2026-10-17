import React, { useState } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-lg my-8 bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ghi Nhận Thanh Toán Hóa Đơn
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {invoice.invoiceCode} — {invoice.orderCode}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Hộp tóm tắt dư nợ */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Tổng hóa đơn:</span>
              <span className="font-semibold text-slate-900">{formatCurrency(invoice.amount)}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Đã thanh toán trước đó:</span>
              <span className="font-semibold">{formatCurrency(invoice.paidAmount)}</span>
            </div>
            <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900">
              <span className="text-rose-700">Số dư nợ còn lại:</span>
              <span className="text-rose-700 font-mono text-sm">{formatCurrency(invoice.remainingAmount)}</span>
            </div>
          </div>

          {/* Ô nhập số tiền */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Số tiền thanh toán đợt này (VND) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setAmount(invoice.remainingAmount)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
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
                className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Quy đổi: <strong className="text-slate-800">{formatCurrency(amount)}</strong>
            </p>
          </div>

          {/* Phương thức thanh toán */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phương thức thanh toán <span className="text-rose-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white text-slate-700"
            >
              <option value="BANK_TRANSFER">Chuyển khoản Ngân hàng (Vietcombank)</option>
              <option value="CASH">Tiền mặt tại quầy / COD</option>
              <option value="E_WALLET">Ví điện tử / Cổng thanh toán trực tuyến</option>
            </select>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú chứng từ / Mã tham chiếu UNC
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Ủy nhiệm chi số UNC-98765 chuyển khoản Vietcombank"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 h-9 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || amount <= 0}
              className="inline-flex items-center gap-1.5 px-4 h-9 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
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
