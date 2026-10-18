import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  Download,
  X,
  CreditCard,
  Banknote,
  Receipt as ReceiptIcon,
} from 'lucide-react';
import { numberToVietnameseWords } from '../utils/number-to-words';
import { receiptsService } from '../services/receipts.service';
import { ConfirmActionModal } from './confirm-action-modal';
import type { Receipt, ReceiptPrintData, PaymentMethod } from '../types/receipt';

interface ReceiptPrintTemplateProps {
  receipt: Receipt | ReceiptPrintData | null;
  isOpen: boolean;
  onClose: () => void;
}

const formatCurrency = (val?: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(val || 0);
};

const getPaymentMethodMeta = (
  method?: PaymentMethod | string,
): { label: string; icon: React.ReactNode } => {
  switch (method) {
    case 'CASH':
      return {
        label: 'Tiền mặt',
        icon: <Banknote className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
      };
    case 'BANK_TRANSFER':
      return {
        label: 'Chuyển khoản ngân hàng',
        icon: <CreditCard className="w-3.5 h-3.5 text-indigo-600 shrink-0" />,
      };
    case 'CREDIT_CARD':
      return {
        label: 'Thẻ tín dụng / Ghi nợ',
        icon: <CreditCard className="w-3.5 h-3.5 text-sky-600 shrink-0" />,
      };
    case 'CHECK':
      return {
        label: 'Séc thanh toán',
        icon: <ReceiptIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
      };
    default:
      return {
        label: method || 'Khác',
        icon: <Banknote className="w-3.5 h-3.5 text-slate-500 shrink-0" />,
      };
  }
};

const extractCustomerInfo = (item: Receipt | ReceiptPrintData) => {
  if ('customerInfo' in item && item.customerInfo) {
    return item.customerInfo;
  }
  const r = item as Receipt;
  return {
    id: r.customerId || '',
    code: r.customerCode || '---',
    name: r.customerName || 'Đại lý B2B',
    phone: r.customerPhone || '---',
    address: r.customerAddress || '---',
  };
};

const extractCollectorInfo = (item: Receipt | ReceiptPrintData) => {
  if ('collectorInfo' in item && item.collectorInfo) {
    return item.collectorInfo;
  }
  const r = item as Receipt;
  return {
    id: r.collectorId || '',
    name: r.collectorName || 'Nguyễn Thị Mai',
    role: 'Kế toán công nợ',
  };
};

export const ReceiptPrintTemplate: React.FC<ReceiptPrintTemplateProps> = ({
  receipt,
  isOpen,
  onClose,
}) => {
  const printContentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
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

  // Xử lý phím ESC để đóng modal
  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !receipt) return null;

  const customer = extractCustomerInfo(receipt);
  const collector = extractCollectorInfo(receipt);

  const receiptCode = receipt.code || ('receiptCode' in receipt ? receipt.receiptCode : '') || 'PT-DEFAULT';
  const customerName = customer.name;
  const customerCode = customer.code;
  const customerPhone = customer.phone || '---';
  const customerAddress = customer.address || '---';

  const amount = receipt.amount || 0;
  const amountFormatted = formatCurrency(amount);
  const amountInWords =
    ('amountInWords' in receipt && receipt.amountInWords) ||
    numberToVietnameseWords(amount);

  const paymentMethod = receipt.paymentMethod || 'CASH';
  const paymentMeta = getPaymentMethodMeta(paymentMethod);

  const collectorName = collector.name;

  const paymentDate = receipt.paymentDate || new Date().toISOString();
  const referenceCode = receipt.referenceCode || '---';
  const notes =
    receipt.notes ||
    `Thu tiền cấn trừ công nợ khách hàng ${customerName} (${customerCode})`;

  const d = new Date(paymentDate);
  const dayStr = isNaN(d.getTime()) ? '15' : d.getDate().toString().padStart(2, '0');
  const monthStr = isNaN(d.getTime())
    ? '10'
    : (d.getMonth() + 1).toString().padStart(2, '0');
  const yearStr = isNaN(d.getTime()) ? '2026' : d.getFullYear().toString();

  /**
   * In độc lập qua Hidden Iframe:
   * Chỉ in duy nhất trang Phiếu thu tiền A4/A5, loại bỏ hoàn toàn các thành phần UI nền
   */
  const handlePrint = () => {
    const contentElement = printContentRef.current;
    if (!contentElement) {
      window.print();
      return;
    }

    // Dọn dẹp iframe cũ
    const oldIframe = document.getElementById('receipt-print-iframe');
    if (oldIframe) {
      oldIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'receipt-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      window.print();
      return;
    }

    const styleTags = Array.from(
      document.querySelectorAll('style, link[rel="stylesheet"]'),
    )
      .map((el) => el.outerHTML)
      .join('\n');

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title></title>
        ${styleTags}
        <style>
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 15mm 20mm !important;
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            font-size: 13px !important;
            line-height: 1.5 !important;
          }
          #receipt-print-document {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }
        </style>
      </head>
      <body>
        <div id="receipt-print-document">
          ${contentElement.innerHTML}
        </div>
      </body>
      </html>
    `);
    iframeDoc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.print();
      } finally {
        setTimeout(() => {
          iframe.remove();
        }, 3000);
      }
    }, 400);
  };

  /**
   * Tải file PDF chính thức trực tiếp, không hiện thông báo nổ ra màn hình
   */
  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      await receiptsService.downloadReceiptPdf(
        receipt.id || receiptCode,
        `phieu-thu-${receiptCode}.pdf`,
      );
    } catch (err) {
      console.error('Lỗi khi tải file PDF:', err);
      const element = printContentRef.current;
      if (element) {
        try {
          const html2canvasModule = await import('html2canvas');
          const html2canvas = html2canvasModule.default || html2canvasModule;
          const { jsPDF } = await import('jspdf');

          const canvas = await html2canvas(element, {
            scale: 2.5,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
          });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
          });
          const contentWidth = 190;
          const contentHeight = (canvas.height * contentWidth) / canvas.width;
          pdf.addImage(imgData, 'PNG', 10, 15, contentWidth, contentHeight);
          pdf.save(`phieu-thu-${receiptCode}.pdf`);
        } catch {
          handlePrint();
        }
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenPrintConfirm = () => {
    setConfirmModal({
      isOpen: true,
      type: 'print',
      title: 'Xác nhận in phiếu thu',
      message: `Bạn có chắc chắn muốn thực hiện in phiếu thu ${receiptCode} không?`,
    });
  };

  const handleOpenDownloadConfirm = () => {
    setConfirmModal({
      isOpen: true,
      type: 'download',
      title: 'Xác nhận tải phiếu thu PDF',
      message: `Bạn có chắc chắn muốn tải file PDF cho phiếu thu ${receiptCode} về thiết bị không?`,
    });
  };

  const handleExecuteConfirmedAction = async () => {
    if (confirmModal.type === 'download') {
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      await handleDownloadPdf();
    } else {
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      handlePrint();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
        {/* =================================================================== */}
        {/* 1. MODAL ACTION HEADER (TUÂN THỦ UI_GUIDELINES.md)                    */}
        {/* =================================================================== */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <ReceiptIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                In Phiếu Thu Tiền (Biên Lai)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Nút 1: Tải PDF */}
            <button
              type="button"
              onClick={handleOpenDownloadConfirm}
              disabled={isDownloading}
              className="inline-flex items-center justify-center gap-1.5 h-[36px] px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              title="Tải file PDF phiếu thu về máy"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>{isDownloading ? 'Đang tải...' : 'Tải PDF'}</span>
            </button>

            {/* Nút 2: In phiếu trực tiếp */}
            <button
              type="button"
              onClick={handleOpenPrintConfirm}
              className="inline-flex items-center justify-center gap-1.5 h-[36px] px-3.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-xs cursor-pointer"
              title="In trực tiếp phiếu thu (A4/A5)"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span>In phiếu</span>
            </button>

            {/* Nút Đóng */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 2. KHU VỰC HIỂN THỊ NỘI DUNG TỜ BIÊN LAI IN ẤN                      */}
        {/* =================================================================== */}
        <div className="p-4 sm:p-6 sm:py-8 overflow-y-auto bg-slate-100/80 flex-1">
          <div
            ref={printContentRef}
            className="mx-auto w-full max-w-[680px] bg-white rounded-xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6 text-slate-800 mb-8"
          >
            {/* Tiêu đề Phiếu thu */}
            <div className="text-center space-y-1 py-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                PHIẾU THU TIỀN
              </h2>
              <p className="text-xs text-slate-500 italic">
                Ngày {dayStr} tháng {monthStr} năm {yearStr}
              </p>
            </div>

            {/* =============================================================== */}
            {/* 3. KHỐI HIỂN THỊ ĐỦ 5 TRƯỜNG BẮT BUỘC                            */}
            {/* 1. Mã duy nhất, 2. Thông tin đại lý, 3. Số tiền,                  */}
            {/* 4. Hình thức, 5. Người thu                                      */}
            {/* =============================================================== */}
            <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 text-xs bg-slate-50/40 overflow-hidden">
              {/* [Trường 1] Mã duy nhất */}
              <div className="p-3 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                <span className="font-semibold text-slate-600">Mã phiếu thu:</span>
                <span className="sm:col-span-3 font-mono font-extrabold text-indigo-700 text-sm">
                  {receiptCode}
                </span>
              </div>

              {/* [Trường 2] Thông tin Đại lý / Người nộp tiền */}
              <div className="p-3 grid grid-cols-1 sm:grid-cols-4 gap-2 items-start">
                <span className="font-semibold text-slate-600">Đại lý / Người nộp:</span>
                <div className="sm:col-span-3 space-y-0.5">
                  <div className="font-bold text-slate-900 text-sm">
                    {customerName}{' '}
                    <span className="font-mono text-xs font-semibold text-slate-500">
                      ({customerCode})
                    </span>
                  </div>
                  <div className="text-slate-600 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px]">
                    <span>
                      Điện thoại: <strong className="text-slate-800">{customerPhone}</strong>
                    </span>
                    <span>
                      Địa chỉ: <span className="text-slate-700">{customerAddress}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* [Trường 3] Số tiền (Bằng số VND và Bằng chữ) */}
              <div className="p-3 grid grid-cols-1 sm:grid-cols-4 gap-2 items-start bg-emerald-50/40">
                <span className="font-semibold text-slate-700">Số tiền thu:</span>
                <div className="sm:col-span-3 space-y-1">
                  <div className="text-base sm:text-lg font-extrabold text-emerald-700 font-mono">
                    {amountFormatted}
                  </div>
                  <div className="text-slate-700 italic text-[11px]">
                    (Viết bằng chữ: <strong className="text-slate-900 not-italic">{amountInWords}</strong>)
                  </div>
                </div>
              </div>

              {/* [Trường 4] Hình thức thu tiền */}
              <div className="p-3 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                <span className="font-semibold text-slate-600">Hình thức thu:</span>
                <div className="sm:col-span-3 font-semibold text-slate-800">
                  {paymentMeta.label}
                </div>
              </div>

              {/* [Trường 5] Người thu tiền */}
              <div className="p-3 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                <span className="font-semibold text-slate-600">Người thu tiền:</span>
                <div className="sm:col-span-3 font-bold text-slate-900">
                  {collectorName}
                </div>
              </div>

              {/* Thông tin bổ sung: Lý do nộp & Chứng từ gốc */}
              <div className="p-3 grid grid-cols-1 sm:grid-cols-4 gap-2 items-start text-[11px]">
                <span className="font-semibold text-slate-600">Lý do thu / Đối trừ:</span>
                <div className="sm:col-span-3 text-slate-700 space-y-0.5">
                  <div>{notes}</div>
                  <div className="text-slate-500">
                    Chứng từ gốc liên kết:{' '}
                    <span className="font-mono font-semibold text-slate-800">
                      {referenceCode}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Khung chữ ký 3 bên chuẩn mực chứng từ kế toán */}
            <div className="pt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="space-y-1">
                <div className="font-bold text-slate-900 uppercase text-[11px]">
                  Người nộp tiền
                </div>
                <div className="text-[10px] text-slate-400 italic">(Ký, họ tên)</div>
                <div className="h-14 sm:h-16 flex items-end justify-center font-medium text-slate-800 text-[11px]">
                  {customerName}
                </div>
              </div>

              <div className="space-y-1">
                <div className="font-bold text-slate-900 uppercase text-[11px]">
                  Người thu tiền
                </div>
                <div className="text-[10px] text-slate-400 italic">(Ký, họ tên)</div>
                <div className="h-14 sm:h-16 flex items-end justify-center font-medium text-slate-800 text-[11px]">
                  {collectorName}
                </div>
              </div>

              <div className="space-y-1">
                <div className="font-bold text-slate-900 uppercase text-[11px]">
                  Thủ quỹ / Kế toán
                </div>
                <div className="text-[10px] text-slate-400 italic">(Ký, đóng dấu)</div>
                <div className="h-14 sm:h-16 flex items-end justify-center font-medium text-slate-400 text-[10px] italic">
                  (Đã ký xác nhận)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
    </div>,
    document.body,
  );
};
