import React from 'react';
import {
  X,
  Download,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  BadgeAlert,
  Printer,
} from 'lucide-react';
import type { InvoiceItem } from '../services/invoices.service';
import { invoicesService } from '../services/invoices.service';
import { showToast } from './toast';

interface InvoiceDetailModalProps {
  invoice: InvoiceItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenPayment?: (invoice: InvoiceItem) => void;
}

const formatCurrency = (val?: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(val || 0);
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onOpenPayment,
}) => {
  if (!isOpen || !invoice) return null;

  const isOverdue =
    invoice.remainingAmount > 0 && new Date(invoice.dueDate) < new Date();

  const handleDownloadPdf = async () => {
    try {
      showToast('info', 'Đang tạo và tải file hóa đơn PDF...');
      await invoicesService.downloadInvoicePdf(invoice.id, invoice.invoiceCode);
      showToast('success', 'Đã tải hóa đơn PDF thành công');
    } catch {
      showToast('error', 'Không thể tải hóa đơn. Vui lòng thử lại sau.');
    }
  };

  const handlePrint = async () => {
    try {
      await invoicesService.printInvoice(invoice.id);
    } catch {
      showToast('error', 'Không thể mở bản in');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-3xl my-8 bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-slate-50 border-b border-slate-200/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  Hóa Đơn {invoice.invoiceCode}
                </h2>
                {invoice.status === 'PAID' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Đã thanh toán đủ
                  </span>
                ) : isOverdue ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Quá hạn nợ
                  </span>
                ) : invoice.status === 'PARTIALLY_PAID' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="h-3.5 w-3.5" />
                    Thanh toán một phần
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    Chưa thanh toán
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Đơn hàng gốc: <span className="font-semibold text-slate-700">{invoice.orderCode}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
              title="In trực tiếp qua trình duyệt"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              <span>In</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
              title="Tải file PDF chuẩn VAT về máy"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Tải PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Đóng modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Nội dung Modal */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Cảnh báo nợ quá hạn nếu có */}
          {isOverdue && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
              <BadgeAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-900">
                  Hóa đơn đã quá hạn thanh toán từ ngày {formatDate(invoice.dueDate)}!
                </p>
                <p className="text-xs text-rose-700 mt-0.5">
                  Số tiền còn phải thanh toán là <strong>{formatCurrency(invoice.remainingAmount)}</strong>. Quý đại lý vui lòng thanh toán sớm để duy trì hạn mức mua hàng.
                </p>
              </div>
            </div>
          )}

          {/* Grid thông tin chung */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                <Building2 className="h-3.5 w-3.5 text-slate-500" />
                <span>Thông tin Đại lý nhận hóa đơn</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Tên đại lý:</span>
                <span className="font-semibold text-slate-800">{invoice.customerName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Mã khách hàng:</span>
                <span className="font-mono text-slate-700">{invoice.customerId}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Email nhận nợ:</span>
                <span className="text-slate-700">{invoice.customerEmail || 'dealer@loha.vn'}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span>Kỳ hạn & Ngày chứng từ</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Ngày phát hành:</span>
                <span className="font-semibold text-slate-800">{formatDate(invoice.issueDate)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Hạn thanh toán:</span>
                <span className={`font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
                  {formatDate(invoice.dueDate)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Đơn hàng liên kết:</span>
                <span className="font-mono font-semibold text-indigo-600">{invoice.orderCode}</span>
              </div>
            </div>
          </div>

          {/* Bảng sản phẩm trong hóa đơn */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span>Danh sách sản phẩm xuất bán</span>
              <span className="text-xs font-normal text-slate-500">
                {(invoice.items || []).length} mặt hàng
              </span>
            </h3>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold uppercase">
                    <th className="py-2.5 px-3 text-center w-10">STT</th>
                    <th className="py-2.5 px-3">Mã SKU</th>
                    <th className="py-2.5 px-3">Tên sản phẩm</th>
                    <th className="py-2.5 px-3 text-center">ĐVT</th>
                    <th className="py-2.5 px-3 text-right">Số lượng</th>
                    <th className="py-2.5 px-3 text-right">Đơn giá</th>
                    <th className="py-2.5 px-3 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 bg-white">
                  {(invoice.items || []).map((it, idx) => (
                    <tr key={it.productId || idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{it.productSku}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{it.productName}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{it.unit}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                        {it.quantity.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        {formatCurrency(it.unitPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                        {formatCurrency(it.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Khung tổng tiền công nợ */}
          <div className="flex justify-end">
            <div className="w-full sm:w-80 rounded-xl bg-slate-50 border border-slate-200/80 p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Tổng giá trị hóa đơn:</span>
                <span className="font-semibold text-slate-900">{formatCurrency(invoice.amount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Số tiền đã thanh toán:</span>
                <span className="font-semibold">-{formatCurrency(invoice.paidAmount)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold">
                <span className={invoice.remainingAmount > 0 ? 'text-rose-700' : 'text-slate-800'}>
                  CÒN NỢ PHẢI TRẢ:
                </span>
                <span className={invoice.remainingAmount > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                  {formatCurrency(invoice.remainingAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Lịch sử thanh toán nếu có */}
          {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2.5 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                <span>Lịch sử các lần thanh toán</span>
              </h3>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="py-2 px-3">Mã chứng từ</th>
                      <th className="py-2 px-3">Ngày thanh toán</th>
                      <th className="py-2 px-3">Hình thức</th>
                      <th className="py-2 px-3">Ghi chú</th>
                      <th className="py-2 px-3 text-right">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 bg-white">
                    {invoice.paymentHistory.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 px-3 font-mono font-medium text-slate-700">{p.paymentCode}</td>
                        <td className="py-2 px-3 text-slate-600">{formatDate(p.paymentDate)}</td>
                        <td className="py-2 px-3 text-slate-600">
                          {p.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : p.paymentMethod}
                        </td>
                        <td className="py-2 px-3 text-slate-500 italic">{p.note || '—'}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-600">
                          +{formatCurrency(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Thông tin chuyển khoản Vietcombank */}
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-950 space-y-1">
            <p className="font-bold text-indigo-900">Thông tin tài khoản nhận thanh toán của công ty:</p>
            <p>Ngân hàng: <strong>TMCP Ngoại Thương Việt Nam (Vietcombank)</strong> — CN TP.HCM</p>
            <p>Số tài khoản: <strong className="font-mono text-indigo-700">0071 0008 89999</strong> — Chủ TK: <strong>CONG TY CO PHAN LOHA SALES</strong></p>
            <p>Nội dung chuyển khoản: <strong className="font-mono text-indigo-700">{invoice.invoiceCode} — {invoice.customerId}</strong></p>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200/80">
          <div className="text-xs text-slate-500">
            {invoice.remainingAmount === 0 ? (
              <span className="text-emerald-700 font-semibold">✓ Hóa đơn này đã được tất toán 100%</span>
            ) : (
              <span>Số dư nợ còn lại: <strong className="text-rose-700">{formatCurrency(invoice.remainingAmount)}</strong></span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {invoice.remainingAmount > 0 && onOpenPayment && (
              <button
                type="button"
                onClick={() => onOpenPayment(invoice)}
                className="inline-flex items-center gap-1.5 px-4 h-9 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Thanh toán ngay</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-9 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
