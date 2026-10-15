import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  Download,
  X,
  CreditCard,
  Banknote,
  Receipt as ReceiptIcon,
  CheckCircle2,
} from 'lucide-react';
import { BarcodeSvg } from './barcode-svg';
import { numberToVietnameseWords } from '../utils/number-to-words';
import { receiptsService } from '../services/receipts.service';
import { showToast } from './toast';
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

    const documentTitle = `Phieu_Thu_${receiptCode}`;

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${documentTitle}</title>
        ${styleTags}
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 10mm 12mm;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
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
   * Tải trực tiếp file PDF chính thức từ Backend
   */
  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      await receiptsService.downloadReceiptPdf(
        receipt.id || receiptCode,
        `phieu-thu-${receiptCode}.pdf`,
      );
      showToast('success', `Đã tải xuống file PDF: phieu-thu-${receiptCode}.pdf`);
    } catch {
      showToast(
        'info',
        'Đang mở hộp thoại xuất file PDF từ trình duyệt (chọn "Lưu dưới dạng PDF")...',
      );
      handlePrint();
    } finally {
      setIsDownloading(false);
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
              onClick={() => void handleDownloadPdf()}
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
              onClick={handlePrint}
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
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100/60 flex-1 flex justify-center">
          <div
            ref={printContentRef}
            className="w-full max-w-[680px] bg-white rounded-lg border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-5 text-slate-800"
          >
            {/* Header Doanh nghiệp & Mẫu số chứng từ */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">
                  LOHA GOLD B2B SALES & DISTRIBUTION
                </div>
                <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase">
                  CÔNG TY CỔ PHẦN THỰC PHẨM DINH DƯỠNG LOHA GOLD
                </h1>
                <p className="text-[11px] text-slate-500">
                  Địa chỉ: Lô C2-4, KCN Tân Bình, P. Tây Thạnh, Q. Tân Phú, TP. Hồ Chí Minh
                </p>
                <p className="text-[11px] text-slate-500">
                  Mã số thuế: <strong className="text-slate-700">0316889988</strong> · Hotline: <strong className="text-slate-700">1900 6868</strong>
                </p>
              </div>

              <div className="text-right shrink-0">
                <div className="text-[10px] font-bold text-slate-700 uppercase">
                  Mẫu số: 01 - TT
                </div>
                <div className="text-[9px] text-slate-400 italic">
                  (Ban hành theo TT 200/2014/TT-BTC)
                </div>
                <div className="mt-1 flex justify-end">
                  <BarcodeSvg value={receiptCode} height={28} showText={false} />
                </div>
              </div>
            </div>

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
                <div className="sm:col-span-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-white border border-slate-200 text-slate-800 shadow-2xs">
                    {paymentMeta.icon}
                    <span>{paymentMeta.label}</span>
                  </span>
                </div>
              </div>

              {/* [Trường 5] Người thu tiền */}
              <div className="p-3 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                <span className="font-semibold text-slate-600">Người thu tiền:</span>
                <div className="sm:col-span-3 flex items-center gap-2">
                  <span className="font-bold text-slate-900">{collectorName}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>Kế toán công nợ</span>
                  </span>
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

            {/* Khung chữ ký 4 bên chuẩn mực kế toán */}
            <div className="pt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="space-y-1">
                <div className="font-bold text-slate-900 uppercase text-[11px]">
                  Người nộp tiền
                </div>
                <div className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</div>
                <div className="h-16 flex items-end justify-center font-semibold text-slate-800 text-[11px]">
                  {customerName}
                </div>
              </div>

              <div className="space-y-1">
                <div className="font-bold text-slate-900 uppercase text-[11px]">
                  Người thu tiền
                </div>
                <div className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</div>
                <div className="h-16 flex items-end justify-center font-semibold text-slate-800 text-[11px]">
                  {collectorName}
                </div>
              </div>

              <div className="space-y-1">
                <div className="font-bold text-slate-900 uppercase text-[11px]">
                  Kế toán trưởng / Thủ quỹ
                </div>
                <div className="text-[10px] text-slate-400 italic">(Ký, đóng dấu)</div>
                <div className="h-16 flex items-end justify-center font-semibold text-slate-400 text-[10px] italic">
                  (Đã ký điện tử)
                </div>
              </div>
            </div>

            {/* Chân trang chứng thực hệ thống */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 gap-1">
              <div>Hệ Thống Bán Hàng & Kho LOHA SALES (Mã chứng từ: {receiptCode})</div>
              <div>Thời gian in: {new Date().toLocaleString('vi-VN')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
