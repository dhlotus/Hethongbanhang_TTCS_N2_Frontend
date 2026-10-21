import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  Download,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Printer,
  Copy,
  Check,
} from 'lucide-react';
import type { InvoiceItem } from '../services/invoices.service';
import { invoicesService } from '../services/invoices.service';
import { Pagination } from './pagination';
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [itemsPage, setItemsPage] = useState<number>(1);
  const [itemsPageSize, setItemsPageSize] = useState<number>(10);

  const invoiceItems = React.useMemo(() => invoice?.items || [], [invoice?.items]);
  const totalItemsPages = Math.max(1, Math.ceil(invoiceItems.length / itemsPageSize));
  const paginatedItems = React.useMemo(() => {
    const start = (itemsPage - 1) * itemsPageSize;
    return invoiceItems.slice(start, start + itemsPageSize);
  }, [invoiceItems, itemsPage, itemsPageSize]);

  if (!isOpen || !invoice) return null;

  const isOverdue =
    invoice.remainingAmount > 0 && new Date(invoice.dueDate) < new Date();

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('success', `Đã sao chép: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      showToast('info', 'Đang tạo và tải file hóa đơn PDF...');
      await invoicesService.downloadInvoicePdf(invoice.id, invoice.invoiceCode);
      showToast('success', 'Đã tải hóa đơn PDF thành công');
    } catch {
      showToast('error', 'Không thể tải hóa đơn. Vui lòng thử lại sau.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = async () => {
    try {
      await invoicesService.printInvoice(invoice.id);
    } catch {
      showToast('error', 'Không thể mở bản in hóa đơn');
    }
  };

  const renderStatusBadge = () => {
    if (invoice.status === 'PAID' || invoice.remainingAmount === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Đã thanh toán đủ
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
          <AlertTriangle className="h-3.5 w-3.5" />
          Quá hạn nợ
        </span>
      );
    }
    if (invoice.status === 'PARTIALLY_PAID') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
          <Clock className="h-3.5 w-3.5" />
          Thanh toán một phần
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
        Chưa thanh toán
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
      }}
    >
      <div className="relative w-full max-w-3xl my-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]">
        {/* ================================================================= */}
        {/* 1. MODAL HEADER - Responsive tự xuống hàng khi thiếu chỗ          */}
        {/* ================================================================= */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 bg-slate-50/95 border-b border-slate-200 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4">
            {/* Tiêu đề & Trạng thái & Nút đóng trên mobile */}
            <div className="flex items-start justify-between gap-2.5 min-w-0 flex-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8.5 w-8.5 sm:h-10 sm:w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <FileText className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 break-words leading-snug">
                      Hóa Đơn {invoice.invoiceCode}
                    </h2>
                    {renderStatusBadge()}
                  </div>
                </div>
              </div>

              {/* Nút đóng trên Mobile (Góc phải trên cùng) */}
              <button
                type="button"
                onClick={onClose}
                className="sm:hidden p-1.5 -mr-1 -mt-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Đóng modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Các nút thao tác: In, Tải PDF và Nút đóng trên desktop */}
            <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="In trực tiếp qua trình duyệt"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-500" />
                  <span>In hóa đơn</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  title="Tải file PDF hóa đơn về thiết bị"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{isDownloading ? 'Đang tải...' : 'Tải PDF'}</span>
                </button>
              </div>

              {/* Nút đóng trên Desktop */}
              <button
                type="button"
                onClick={onClose}
                className="hidden sm:inline-flex p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Đóng modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. MODAL BODY (SCROLLABLE, KHÔNG TRÀN NGANG)                      */}
        {/* ================================================================= */}
        <div className="p-3.5 sm:p-6 overflow-y-auto min-h-0 flex-1 space-y-4 sm:space-y-5">
          {/* Cảnh báo nợ quá hạn */}
          {isOverdue && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span className="leading-relaxed">
                Hóa đơn đã quá hạn thanh toán từ ngày <strong>{formatDate(invoice.dueDate)}</strong>. Quý đại lý vui lòng thanh toán để duy trì hạn mức công nợ.
              </span>
            </div>
          )}

          {/* Khung thông tin chứng từ: Gộp gọn gàng, loại bỏ trùng lặp và không hiển thị UUID */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs">
              {/* Cột 1: Thông tin đại lý */}
              <div className="flex flex-col justify-center min-w-0">
                <p className="font-bold text-slate-900 text-sm sm:text-base leading-snug break-words" title={invoice.customerName}>
                  {invoice.customerName}
                </p>
              </div>

              {/* Cột 2: Đơn hàng liên kết */}
              <div className="space-y-1 sm:border-l sm:border-slate-200/80 sm:pl-4 min-w-0">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Đơn hàng liên kết</span>
                </div>
                {invoice.orderCode ? (
                  <Link
                    to={`/sales/orders?search=${encodeURIComponent(invoice.orderCode)}`}
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline text-xs sm:text-sm break-all"
                    title="Bấm để mở trang đơn hàng đối chiếu chi tiết"
                  >
                    <span>{invoice.orderCode}</span>
                    <span className="text-[11px] font-normal text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 hover:bg-indigo-100 shrink-0">
                      Đối chiếu
                    </span>
                  </Link>
                ) : (
                  <p className="font-mono font-bold text-slate-400 text-xs sm:text-sm">—</p>
                )}
              </div>

              {/* Cột 3: Kỳ hạn chứng từ */}
              <div className="space-y-1 sm:border-l sm:border-slate-200/80 sm:pl-4 min-w-0">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Thời hạn chứng từ</span>
                </div>
                <div className="flex items-center justify-between text-slate-700 gap-2">
                  <span className="text-slate-500 shrink-0">Ngày phát hành:</span>
                  <span className="font-semibold text-slate-900">{formatDate(invoice.issueDate)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 shrink-0">Hạn thanh toán:</span>
                  <span className={`font-semibold ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-900'}`}>
                    {formatDate(invoice.dueDate)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Danh sách sản phẩm: Table trên Tablet/Desktop & Card List trên Mobile */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Danh sách sản phẩm xuất bán</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                  {(invoice.items || []).length} mặt hàng
                </span>
              </h3>
            </div>

            <div className="rounded-xl border border-slate-200/90 overflow-hidden bg-white shadow-2xs">
              {/* 1. Phiên bản Desktop & Tablet: Bảng truyền thống */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[620px]">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-3 text-center w-12 shrink-0">STT</th>
                      <th className="py-3 px-3.5 w-32 shrink-0">Mã SKU</th>
                      <th className="py-3 px-3.5 min-w-[200px]">Tên sản phẩm</th>
                      <th className="py-3 px-3 text-center w-16 shrink-0">ĐVT</th>
                      <th className="py-3 px-3.5 text-right w-24 shrink-0 whitespace-nowrap">Số lượng</th>
                      <th className="py-3 px-3.5 text-right w-28 shrink-0 whitespace-nowrap">Đơn giá</th>
                      <th className="py-3 px-3.5 text-right w-32 shrink-0 whitespace-nowrap">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedItems.length > 0 ? (
                      paginatedItems.map((it, idx) => {
                        const itemIndex = (itemsPage - 1) * itemsPageSize + idx + 1;
                        return (
                          <tr key={it.productId || idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3 text-center text-slate-400 font-medium">{itemIndex}</td>
                            <td className="py-3 px-3.5">
                              <span className="font-mono text-slate-700 font-semibold bg-slate-100/80 px-2 py-0.5 rounded text-[11px] inline-block border border-slate-200/60">
                                {it.productSku}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 font-semibold text-slate-900 leading-snug">
                              {it.productName}
                            </td>
                            <td className="py-3 px-3 text-center text-slate-600 font-medium">{it.unit}</td>
                            <td className="py-3 px-3.5 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                              {it.quantity.toLocaleString('vi-VN')}
                            </td>
                            <td className="py-3 px-3.5 text-right text-slate-600 tabular-nums whitespace-nowrap">
                              {formatCurrency(it.unitPrice)}
                            </td>
                            <td className="py-3 px-3.5 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                              {formatCurrency(it.lineTotal)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          Không có thông tin chi tiết sản phẩm
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 2. Phiên bản Mobile: Danh sách thẻ (Card List) không tràn ngang */}
              <div className="md:hidden divide-y divide-slate-100">
                {paginatedItems.length > 0 ? (
                  paginatedItems.map((it, idx) => {
                    const itemIndex = (itemsPage - 1) * itemsPageSize + idx + 1;
                    return (
                      <div key={it.productId || idx} className="p-3.5 space-y-2.5 bg-white">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {itemIndex}
                            </span>
                            <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                              {it.productSku}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60 shrink-0">
                            ĐVT: <strong className="text-slate-800">{it.unit}</strong>
                          </span>
                        </div>

                        <p className="font-semibold text-xs sm:text-sm text-slate-900 leading-snug break-words">
                          {it.productName}
                        </p>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                          <div>
                            <span className="text-slate-500 text-[11px] block">Số lượng</span>
                            <span className="font-bold text-slate-900 font-mono text-xs sm:text-sm tabular-nums">
                              {it.quantity.toLocaleString('vi-VN')} {it.unit}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[11px] block">Đơn giá</span>
                            <span className="text-slate-700 font-medium font-mono text-xs sm:text-sm tabular-nums">
                              {formatCurrency(it.unitPrice)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs bg-slate-50/70 -mx-3.5 -mb-3.5 p-3 rounded-b-lg">
                          <span className="font-semibold text-slate-700">Thành tiền:</span>
                          <span className="font-bold text-sm text-indigo-700 font-mono tabular-nums">
                            {formatCurrency(it.lineTotal)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Không có thông tin chi tiết sản phẩm
                  </div>
                )}
              </div>

              {/* Thanh phân trang gắn liền chân bảng */}
              {invoiceItems.length > 0 && (
                <Pagination
                  variant="default"
                  currentPage={itemsPage}
                  totalPages={totalItemsPages}
                  totalItems={invoiceItems.length}
                  pageSize={itemsPageSize}
                  pageSizeOptions={[5, 10, 20, 50]}
                  itemLabel="mặt hàng"
                  showRecordRange={false}
                  showFirstLast={false}
                  size="sm"
                  onPageChange={(page) => setItemsPage(page)}
                  onPageSizeChange={(size) => {
                    setItemsPageSize(size);
                    setItemsPage(1);
                  }}
                />
              )}
            </div>
          </div>

          {/* 3 Thẻ thống kê tài chính trực quan, rõ ràng */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                Tổng giá trị hóa đơn
              </span>
              <p className="text-base sm:text-lg font-bold text-slate-900 mt-1 font-mono tabular-nums">
                {formatCurrency(invoice.amount)}
              </p>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
              <span className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider flex items-center justify-between">
                <span>Đã thanh toán</span>
                {invoice.paidAmount > 0 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              </span>
              <p className="text-base sm:text-lg font-bold text-emerald-700 mt-1 font-mono tabular-nums">
                {formatCurrency(invoice.paidAmount)}
              </p>
            </div>

            <div
              className={`p-3 sm:p-3.5 rounded-xl border ${
                invoice.remainingAmount > 0
                  ? isOverdue
                    ? 'bg-rose-50/70 border-rose-200'
                    : 'bg-amber-50/70 border-amber-200'
                  : 'bg-slate-50 border-slate-200/80'
              }`}
            >
              <span
                className={`text-[11px] font-medium uppercase tracking-wider block ${
                  invoice.remainingAmount > 0
                    ? isOverdue
                      ? 'text-rose-700'
                      : 'text-amber-800'
                    : 'text-slate-500'
                }`}
              >
                Số dư nợ còn lại
              </span>
              <p
                className={`text-base sm:text-lg font-bold mt-1 font-mono tabular-nums ${
                  invoice.remainingAmount > 0
                    ? isOverdue
                      ? 'text-rose-700'
                      : 'text-amber-800'
                    : 'text-emerald-700'
                }`}
              >
                {formatCurrency(invoice.remainingAmount)}
              </p>
            </div>
          </div>

          {/* Lịch sử thanh toán nếu có: Table trên Desktop, Card List trên Mobile */}
          {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                <span>Lịch sử các lần thanh toán</span>
              </h3>
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                {/* 1. Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-[11px] uppercase tracking-wider">
                        <th className="py-2.5 px-3">Mã chứng từ</th>
                        <th className="py-2.5 px-3">Ngày thanh toán</th>
                        <th className="py-2.5 px-3">Hình thức</th>
                        <th className="py-2.5 px-3">Ghi chú</th>
                        <th className="py-2.5 px-3 text-right">Số tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {invoice.paymentHistory.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-700">{p.paymentCode}</td>
                          <td className="py-2.5 px-3 text-slate-600">{formatDate(p.paymentDate)}</td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {p.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : p.paymentMethod}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 italic">{p.note || '—'}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600 font-mono tabular-nums">
                            +{formatCurrency(p.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 2. Mobile Card List */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {invoice.paymentHistory.map((p) => (
                    <div key={p.id} className="p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {p.paymentCode}
                        </span>
                        <span className="font-bold text-emerald-600 font-mono text-sm tabular-nums">
                          +{formatCurrency(p.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 gap-2">
                        <span className="text-slate-500 text-[11px]">Ngày:</span>
                        <span>{formatDate(p.paymentDate)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 gap-2">
                        <span className="text-slate-500 text-[11px]">Hình thức:</span>
                        <span className="font-medium">
                          {p.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : p.paymentMethod}
                        </span>
                      </div>
                      {p.note && (
                        <p className="text-slate-500 italic text-[11px] pt-1 border-t border-slate-100 break-words">
                          {p.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Thông tin chuyển khoản Vietcombank */}
          {invoice.remainingAmount > 0 && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  Tài khoản nhận thanh toán (Vietcombank)
                </span>
                <span className="text-[11px] text-slate-500 break-words">
                  Chủ TK: CONG TY CO PHAN LOHA SALES
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 min-w-0">
                  <span className="text-slate-500 shrink-0">Số tài khoản:</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono font-bold text-slate-900 truncate">0071 0008 89999</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('0071000889999', 'stk')}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer shrink-0"
                      title="Sao chép số tài khoản"
                    >
                      {copiedKey === 'stk' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 min-w-0">
                  <span className="text-slate-500 shrink-0">Nội dung CK:</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono font-bold text-indigo-600 truncate">{invoice.invoiceCode}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(invoice.invoiceCode, 'nd')}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer shrink-0"
                      title="Sao chép nội dung chuyển khoản"
                    >
                      {copiedKey === 'nd' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Nút hành động thanh toán ở cuối cùng bên trong modal */}
          {invoice.remainingAmount > 0 && onOpenPayment && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => onOpenPayment(invoice)}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 h-10 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <CreditCard className="h-4 w-4" />
                <span>Thanh toán ngay</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};




