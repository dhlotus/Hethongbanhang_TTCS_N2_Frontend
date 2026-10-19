import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Printer,
  Download,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import type { InvoiceItem } from '../services/invoices.service';
import { invoicesService } from '../services/invoices.service';
import { Pagination } from '../components/pagination';
import { RecordPaymentModal } from '../components/record-payment-modal';
import { ConfirmActionModal } from '../components/confirm-action-modal';
import { showToast } from '../components/toast';

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

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [invoice, setInvoice] = useState<InvoiceItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'download' | 'print';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'download',
    title: '',
    message: '',
  });

  const [itemsPage, setItemsPage] = useState<number>(1);
  const [itemsPageSize, setItemsPageSize] = useState<number>(10);

  const invoiceItems = useMemo(() => invoice?.items || [], [invoice?.items]);
  const totalItemsPages = Math.max(1, Math.ceil(invoiceItems.length / itemsPageSize));
  const paginatedItems = useMemo(() => {
    const start = (itemsPage - 1) * itemsPageSize;
    return invoiceItems.slice(start, start + itemsPageSize);
  }, [invoiceItems, itemsPage, itemsPageSize]);

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await invoicesService.getInvoiceById(id);
      setInvoice(data);
    } catch {
      showToast('error', 'Không thể tải thông tin chi tiết hóa đơn.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchInvoice();
  }, [fetchInvoice]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('success', `Đã sao chép: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handlePrintClick = () => {
    if (!invoice) return;
    setConfirmModal({
      isOpen: true,
      type: 'print',
      title: 'Xác nhận in hóa đơn',
      message: `Bạn có chắc chắn muốn mở bản in hóa đơn ${invoice.invoiceCode} cho đại lý ${invoice.customerName}?`,
    });
  };

  const handleDownloadPdfClick = () => {
    if (!invoice) return;
    setConfirmModal({
      isOpen: true,
      type: 'download',
      title: 'Xác nhận tải file PDF',
      message: `Bạn có chắc chắn muốn tải file PDF hóa đơn ${invoice.invoiceCode} về thiết bị không?`,
    });
  };

  const handleExecuteConfirmedAction = async () => {
    if (!invoice) return;
    if (confirmModal.type === 'download') {
      try {
        setIsDownloading(true);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        // Tải file trực tiếp, không hiển thị thông báo toast theo yêu cầu
        await invoicesService.downloadInvoicePdf(invoice.id, invoice.invoiceCode);
      } catch {
        showToast('error', 'Không thể tải hóa đơn. Vui lòng thử lại sau.');
      } finally {
        setIsDownloading(false);
      }
    } else if (confirmModal.type === 'print') {
      try {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        // In trực tiếp, không hiển thị thông báo toast theo yêu cầu
        await invoicesService.printInvoice(invoice.id);
      } catch {
        showToast('error', 'Không thể mở bản in hóa đơn');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-semibold">Đang tải thông tin chi tiết hóa đơn...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6 text-center">
        <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Không tìm thấy thông tin hóa đơn</h2>
          <p className="text-xs text-slate-500">Hóa đơn không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
          <Link
            to="/accounting/invoices"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh sách</span>
          </Link>
        </div>
      </div>
    );
  }

  const isOverdue = invoice.remainingAmount > 0 && new Date(invoice.dueDate) < new Date();

  return (
    <div className="max-w-7xl mx-auto space-y-5 p-3 sm:p-6 pb-24">
      {/* =================================================================== */}
      {/* 1. THANH HEADER ĐIỀU HƯỚNG & NÚT THAO TÁC                           */}
      {/* =================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <Link
            to="/accounting/invoices"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shrink-0 shadow-2xs"
            title="Quay lại danh sách hóa đơn"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại</span>
          </Link>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
              Hóa Đơn {invoice.invoiceCode}
            </h1>
          </div>

          {/* Badge trạng thái thanh toán */}
          {invoice.status === 'PAID' || invoice.remainingAmount === 0 ? (
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

        {/* Nút hành động In, Tải PDF, Thanh toán */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrintClick}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
            title="In trực tiếp qua trình duyệt"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            <span>In</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPdfClick}
            disabled={isDownloading}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title="Tải file PDF hóa đơn về thiết bị"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isDownloading ? 'Đang tải...' : 'Tải PDF'}</span>
          </button>
          {invoice.remainingAmount > 0 && (
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Thanh toán ngay</span>
            </button>
          )}
        </div>
      </div>

      {/* Cảnh báo nợ quá hạn nếu có */}
      {isOverdue && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>
            Hóa đơn đã quá hạn thanh toán từ ngày <strong>{formatDate(invoice.dueDate)}</strong>. Quý đại lý vui lòng thanh toán để duy trì hạn mức công nợ.
          </span>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. THÔNG TIN CHỨNG TỪ                                               */}
      {/* =================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Cột 1: Đại lý nhận hóa đơn */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>Đại lý nhận hóa đơn</span>
            </div>
            <p className="font-bold text-slate-900 text-sm truncate" title={invoice.customerName}>
              {invoice.customerName}
            </p>
            {invoice.customerEmail && (
              <p className="text-[11px] text-slate-400 truncate">{invoice.customerEmail}</p>
            )}
          </div>

          {/* Cột 2: Đơn hàng & Phiếu giao liên kết */}
          <div className="space-y-1 sm:border-l sm:border-slate-100 sm:pl-4">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Đơn hàng liên kết</span>
            </div>
            <p className="font-mono font-bold text-indigo-600 text-sm">
              {invoice.orderCode || '—'}
            </p>
            {invoice.deliverySlipCodes && invoice.deliverySlipCodes.length > 0 && (
              <p className="text-[11px] text-slate-500 font-mono">
                Phiếu giao: {invoice.deliverySlipCodes.join(', ')}
              </p>
            )}
          </div>

          {/* Cột 3: Kỳ hạn chứng từ */}
          <div className="space-y-1 sm:border-l sm:border-slate-100 sm:pl-4">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Thời hạn chứng từ</span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span className="text-slate-500">Ngày phát hành:</span>
              <span className="font-semibold text-slate-900">{formatDate(invoice.issueDate)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Hạn thanh toán:</span>
              <span className={`font-semibold ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-900'}`}>
                {formatDate(invoice.dueDate)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. BẢNG SẢN PHẨM TRONG HÓA ĐƠN                                      */}
      {/* =================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Danh sách sản phẩm xuất bán</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              {(invoice.items || []).length} mặt hàng
            </span>
          </h2>
        </div>

        <div className="rounded-xl border border-slate-200/80 overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto">
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
                      <tr key={it.productId || it.productSku || idx} className="hover:bg-slate-50/70 transition-colors">
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

          {/* Thanh phân trang gắn liền chân bảng chuẩn Quản lý đại lý */}
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
              onPageChange={(page) => setItemsPage(page)}
              onPageSizeChange={(size) => {
                setItemsPageSize(size);
                setItemsPage(1);
              }}
            />
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4. BA THẺ THỐNG KÊ TÀI CHÍNH TRỰC QUAN                               */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Tổng giá trị hóa đơn
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">
            {formatCurrency(invoice.amount)}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
            <span>Đã thanh toán</span>
            {invoice.paidAmount > 0 && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 font-mono">
            {formatCurrency(invoice.paidAmount)}
          </p>
        </div>

        <div
          className={`p-4 rounded-xl border shadow-xs ${
            invoice.remainingAmount > 0
              ? isOverdue
                ? 'bg-rose-50/80 border-rose-200'
                : 'bg-amber-50/80 border-amber-200'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <span
            className={`text-[11px] font-bold uppercase tracking-wider ${
              invoice.remainingAmount > 0
                ? isOverdue
                  ? 'text-rose-800'
                  : 'text-amber-800'
                : 'text-slate-500'
            }`}
          >
            Số dư nợ còn lại
          </span>
          <p
            className={`text-xl sm:text-2xl font-black mt-1 font-mono ${
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

      {/* =================================================================== */}
      {/* 5. LỊCH SỬ CÁC LẦN THANH TOÁN (NẾU CÓ)                              */}
      {/* =================================================================== */}
      {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3.5">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            <span>Lịch sử các lần thanh toán</span>
          </h2>
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
            <div className="overflow-x-auto">
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
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600 font-mono">
                        +{formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 6. THÔNG TIN CHUYỂN KHOẢN VIETCOMBANK (KHI CÒN DƯ NỢ)               */}
      {/* =================================================================== */}
      {invoice.remainingAmount > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              Tài khoản nhận thanh toán (Vietcombank)
            </span>
            <span className="text-xs text-slate-500">Chủ TK: CONG TY CO PHAN LOHA SALES</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500">Số tài khoản:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900 text-sm">0071 0008 89999</span>
                <button
                  type="button"
                  onClick={() => handleCopy('0071000889999', 'stk')}
                  className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                  title="Sao chép số tài khoản"
                >
                  {copiedKey === 'stk' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500">Nội dung CK:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-indigo-600 text-sm">{invoice.invoiceCode}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(invoice.invoiceCode, 'nd')}
                  className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                  title="Sao chép nội dung chuyển khoản"
                >
                  {copiedKey === 'nd' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal ghi nhận thanh toán hóa đơn */}
      <RecordPaymentModal
        invoice={invoice}
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => {
          void fetchInvoice();
        }}
      />

      {/* Modal xác nhận trước khi In / Tải PDF */}
      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        actionType={confirmModal.type}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.type === 'download' ? 'Xác nhận tải' : 'Xác nhận in'}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleExecuteConfirmedAction}
        isLoading={isDownloading}
      />
    </div>
  );
};
