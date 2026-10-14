import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  Download,
  X,
  Building2,
  MapPin,
  Calendar,
  User,
  FileText,
  Info,
} from 'lucide-react';
import { BarcodeSvg } from './barcode-svg';
import { numberToVietnameseWords } from '../utils/number-to-words';
import type { Order } from '../types/order';

interface OrderPrintModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
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

const getCustomerGroupLabel = (group?: string): string => {
  switch (group) {
    case 'AGENT_LEVEL_1':
      return 'Đại lý Cấp 1 (Phân phối sỉ)';
    case 'AGENT_LEVEL_2':
      return 'Đại lý Cấp 2';
    case 'RETAIL':
      return 'Điểm bán lẻ niêm yết';
    default:
      return group || 'Đại lý B2B';
  }
};

export const OrderPrintModal: React.FC<OrderPrintModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  const printContentRef = useRef<HTMLDivElement>(null);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Quản lý class body và phím ESC để đóng modal
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('has-order-print-open');
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onCloseRef.current();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.classList.remove('has-order-print-open');
      };
    } else {
      document.body.classList.remove('has-order-print-open');
      setPdfNotice(null);
    }
  }, [isOpen]);

  // Đồng bộ trạng thái mở modal vào sessionStorage & URL query để ấn F5 vẫn mở đúng trang In / Xuất PDF
  useEffect(() => {
    if (isOpen && order) {
      const code = order.orderCode || order.id || '';
      try {
        sessionStorage.setItem('loha_active_print_order_id', code);
        sessionStorage.setItem('loha_active_print_order_data', JSON.stringify(order));
      } catch {}

      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get('printOrderId') !== code) {
          url.searchParams.set('printOrderId', code);
          window.history.replaceState({}, '', url.toString());
        }
      } catch {}
    } else if (!isOpen) {
      try {
        sessionStorage.removeItem('loha_active_print_order_id');
        sessionStorage.removeItem('loha_active_print_order_data');
      } catch {}

      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('printOrderId')) {
          url.searchParams.delete('printOrderId');
          window.history.replaceState({}, '', url.toString());
        }
      } catch {}
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const totalQuantity = (order.lines || []).reduce(
    (sum, line) => sum + (line.quantity || 0),
    0
  );

  /**
   * In độc lập qua Hidden Iframe:
   * Loại bỏ 100% trang trắng rác, chỉ in DUY NHẤT phiếu đơn hàng chuẩn A4 Full trang
   */
  const executeIframePrint = (isPdf = false) => {
    const contentElement = printContentRef.current;
    if (!contentElement) {
      window.print();
      return;
    }

    if (isPdf) {
      setPdfNotice(
        `Đang xuất PDF: Trong hộp thoại in, chọn máy in đích là "Lưu dưới dạng PDF" (Save as PDF) hoặc "Microsoft Print to PDF" rồi nhấn Lưu.`
      );
    }

    // Dọn dẹp iframe cũ nếu có
    const oldIframe = document.getElementById('order-print-engine-iframe');
    if (oldIframe) {
      oldIframe.remove();
    }

    // Tạo hidden iframe chuyên dụng
    const iframe = document.createElement('iframe');
    iframe.id = 'order-print-engine-iframe';
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

    // Thu thập các thẻ style hiện hành từ ứng dụng
    const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join('\n');

    const documentTitle = `Phieu_Xac_Nhan_Don_Hang_${order.orderCode || 'LOHA'}`;

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
          /* ======================================================= */
          /* CHUẨN HÓA IN ẤN & XUẤT PDF A4 PORTRAIT FULL TRANG SẮC NÉT */
          /* ======================================================= */
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 8mm 10mm;
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
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
            font-size: 13px !important;
            line-height: 1.45 !important;
            width: 100% !important;
            height: auto !important;
          }

          #order-print-document {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }

          /* Bảng sản phẩm rộng 100%, nét viền rõ đậm */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 0 !important;
          }

          th, td {
            border: 1px solid #94a3b8 !important;
            padding: 6px 8px !important;
            vertical-align: middle !important;
          }

          thead {
            display: table-header-group !important;
          }

          th {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
            font-weight: 700 !important;
          }

          tr {
            page-break-inside: avoid !important;
          }

          /* Không ngắt trang giữa các khối tổng kết và chữ ký */
          .print-no-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        </style>
      </head>
      <body>
        <div id="order-print-document">
          ${contentElement.innerHTML}
        </div>
      </body>
      </html>
    `);
    iframeDoc.close();

    // Kích hoạt lệnh in sau khi DOM trong iframe hoàn tất
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Lỗi in iframe, chuyển sang window.print:', err);
        window.print();
      }
    }, 300);
  };

  const handlePrint = () => {
    executeIframePrint(false);
  };

  const handleExportPdf = () => {
    executeIframePrint(true);
  };

  const modalElement = (
    <div className="print-modal-backdrop fixed inset-0 z-50 flex flex-col w-screen h-screen bg-slate-900/70 backdrop-blur-xs overflow-hidden print:p-0 print:bg-white print:static">
      <div className="print-modal-container bg-white w-full h-full flex flex-col overflow-hidden print:shadow-none print:w-full print:rounded-none">
        {/* Thanh công cụ Trên cùng */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200 shrink-0 shadow-xs print:hidden z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#371cdb] shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-wide">
                  Xem Trước & Xuất Mẫu In Đơn Hàng (SN-47)
                </h2>
                <span className="font-mono font-bold text-xs text-[#371cdb] bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  {order.orderCode}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Hiển thị toàn màn hình chuẩn A4 · Đầy đủ thông tin không che khuất
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-[#371cdb] text-white hover:bg-[#2d16b5] shadow-xs hover:shadow transition-all cursor-pointer"
              title="In trực tiếp ra máy in A4 / máy in nhiệt"
            >
              <Printer className="w-4 h-4" />
              <span>In đơn hàng</span>
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
              title="Xuất file PDF để lưu trữ hoặc gửi Zalo cho đại lý"
            >
              <Download className="w-4 h-4" />
              <span>Xuất PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer ml-1"
              aria-label="Đóng"
              title="Đóng cửa sổ xem trước (Phím ESC)"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Đóng</span>
            </button>
          </div>
        </div>

        {/* Thông báo hướng dẫn khi xuất PDF */}
        {pdfNotice && (
          <div className="px-6 py-2.5 bg-blue-50 border-b border-blue-200 text-blue-900 text-xs sm:text-sm flex items-center justify-between gap-3 shrink-0 print:hidden animate-fade-in">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{pdfNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setPdfNotice(null)}
              className="text-blue-600 hover:text-blue-900 text-xs font-bold underline cursor-pointer"
            >
              Đã hiểu
            </button>
          </div>
        )}

        {/* Nội dung Mẫu in chuẩn SN-47 (Có LOHA SALES & Không còn Ghi chú đường) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/90 print:bg-white print:p-0 print:overflow-visible flex justify-center items-start">
          <div
            ref={printContentRef}
            id="order-print-document"
            className="bg-white w-full max-w-5xl p-6 sm:p-10 rounded-2xl shadow-lg border border-slate-300 text-slate-900 print:shadow-none print:border-none print:p-0 print:max-w-none text-xs sm:text-[13px] leading-relaxed my-auto sm:my-0"
          >
            {/* Header Mẫu in: Logo LOHA SALES & Mã vạch tra cứu */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b-2 border-slate-900 print-no-break">
              <div className="flex items-center">
                <div className="px-3.5 py-1.5 bg-[#371cdb] text-white font-black text-base sm:text-lg rounded-lg tracking-wider shadow-2xs">
                  LOHA SALES
                </div>
              </div>

              {/* Mã vạch Barcode SVG (SN-47: Tra cứu kho siêu nhanh) */}
              <div className="flex flex-col items-center sm:items-end justify-center bg-slate-50 p-2.5 rounded-xl border border-slate-300 self-stretch sm:self-auto shrink-0 print:bg-transparent print:border-none">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-600 mb-0.5">
                  MÃ TRA CỨU KHO (BARCODE)
                </div>
                <BarcodeSvg
                  value={order.orderCode || 'DH-UNKNOWN'}
                  height={50}
                  showText={true}
                  className="max-w-[200px]"
                />
              </div>
            </div>

            {/* Tiêu đề Phiếu Đặt Hàng */}
            <div className="text-center my-4 sm:my-5 print-no-break">
              <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-950 tracking-tight">
                PHIẾU XÁC NHẬN ĐƠN ĐẶT HÀNG
              </h2>
            </div>

            {/* Khối Thông tin Đại lý & Điểm giao hàng (ĐÃ XÓA GHI CHÚ ĐƯỜNG) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4 print-no-break">
              {/* Cột 1: Thông tin Đại lý */}
              <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50/80 space-y-1.5 print:bg-white print:border-slate-400">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-[#371cdb] border-b border-slate-200 pb-1 mb-1">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Thông Tin Đại Lý</span>
                </div>
                <div className="text-xs sm:text-[13px]">
                  <span className="text-slate-600 font-medium">Tên đại lý: </span>
                  <span className="font-bold text-slate-950">{order.customerName}</span>
                </div>
                <div className="text-xs sm:text-[13px]">
                  <span className="text-slate-600 font-medium">Mã đại lý: </span>
                  <span className="font-mono font-bold text-slate-900">{order.customerCode || '—'}</span>
                </div>
                <div className="text-xs sm:text-[13px]">
                  <span className="text-slate-600 font-medium">Phân cấp: </span>
                  <span className="font-semibold text-slate-800">
                    {getCustomerGroupLabel(order.customerGroup)}
                  </span>
                </div>
                <div className="text-xs sm:text-[13px]">
                  <span className="text-slate-600 font-medium">Số điện thoại: </span>
                  <span className="font-bold text-slate-900">{order.deliveryPoint?.phone || '—'}</span>
                </div>
              </div>

              {/* Cột 2: Thông tin Giao nhận (ĐÃ XÓA GHI CHÚ ĐƯỜNG) */}
              <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50/80 space-y-1.5 print:bg-white print:border-slate-400">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-[#371cdb] border-b border-slate-200 pb-1 mb-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>Điểm Giao Hàng & Nhận Hàng</span>
                </div>
                <div className="text-xs sm:text-[13px]">
                  <span className="text-slate-600 font-medium">Điểm giao: </span>
                  <span className="font-bold text-slate-900">
                    {order.deliveryPoint?.name || 'Giao tại địa chỉ đại lý'}
                  </span>
                </div>
                <div className="text-xs sm:text-[13px]">
                  <span className="text-slate-600 font-medium">Người nhận: </span>
                  <span className="font-bold text-slate-900">
                    {order.deliveryPoint?.receiverName || order.customerName}
                  </span>
                </div>
                <div className="text-xs sm:text-[13px]">
                  <span className="text-slate-600 font-medium">Địa chỉ giao: </span>
                  <span className="font-semibold text-slate-900">
                    {order.deliveryPoint?.address || 'Theo địa chỉ đăng ký đại lý'}
                  </span>
                </div>
              </div>
            </div>

            {/* Thông tin đơn hàng (Thời gian & NVKD) */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-100 rounded-xl text-xs sm:text-[13px] mb-4 print:bg-slate-50 print:border print:border-slate-300 print-no-break">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-slate-700">Ngày đặt:</span>
                <span className="font-bold text-slate-900">{formatDate(order.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-700" />
                <span className="text-slate-700">Ngày hẹn giao:</span>
                <span className="font-bold text-indigo-700">{formatDate(order.deliveryDate)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-slate-700">NV phụ trách:</span>
                <span className="font-bold text-slate-900">{order.salesRepName || 'Trần Văn Nam'}</span>
              </div>
            </div>

            {/* Bảng Chi Tiết Dòng Hàng (SN-47: Rộng 100%, nét căng) */}
            <div className="border border-slate-300 rounded-xl overflow-hidden mb-4 shadow-2xs">
              <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 border-b border-slate-300 font-bold print:bg-slate-200">
                    <th className="py-2.5 px-2 text-center w-9 border-r border-slate-300">STT</th>
                    <th className="py-2.5 px-2.5 border-r border-slate-300 w-24">Mã SKU</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">Tên Mặt Hàng</th>
                    <th className="py-2.5 px-2 text-center border-r border-slate-300 w-16">ĐVT</th>
                    <th className="py-2.5 px-2 text-right border-r border-slate-300 w-14">SL</th>
                    <th className="py-2.5 px-2.5 text-right border-r border-slate-300 w-24">Đơn Giá Gốc</th>
                    <th className="py-2.5 px-2 text-center border-r border-slate-300 w-16">CK (%)</th>
                    <th className="py-2.5 px-2.5 text-right border-r border-slate-300 w-24">Đơn Giá CK</th>
                    <th className="py-2.5 px-3 text-right w-28">Thành Tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {order.lines.map((line, index) => (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-2 text-center font-semibold text-slate-600 border-r border-slate-300">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-2.5 font-mono font-semibold text-slate-700 border-r border-slate-300">
                        {line.productSku}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-950 border-r border-slate-300">
                        {line.productName}
                      </td>
                      <td className="py-2.5 px-2 text-center font-medium text-slate-700 border-r border-slate-300">
                        {line.unit}
                      </td>
                      <td className="py-2.5 px-2 text-right font-black text-slate-950 border-r border-slate-300">
                        {line.quantity}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-medium text-slate-700 border-r border-slate-300">
                        {formatCurrency(line.listPrice)}
                      </td>
                      <td className="py-2.5 px-2 text-center border-r border-slate-300">
                        {line.discountPercent > 0 ? (
                          <span className="font-bold text-emerald-700">
                            {line.discountPercent}%
                          </span>
                        ) : (
                          <span className="text-slate-400">0%</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-semibold text-slate-900 border-r border-slate-300">
                        {formatCurrency(line.unitPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-950">
                        {formatCurrency(line.lineTotal)}
                      </td>
                    </tr>
                  ))}
                  {/* Dòng Tổng số lượng mặt hàng (Ảnh 1) */}
                  <tr className="bg-slate-50/80 font-bold border-t border-slate-300 print:bg-slate-100">
                    <td colSpan={4} className="py-2 px-3 text-right text-slate-800 border-r border-slate-300 uppercase">
                      TỔNG SỐ LƯỢNG MẶT HÀNG:
                    </td>
                    <td className="py-2 px-2 text-right text-slate-950 text-sm border-r border-slate-300">
                      {totalQuantity}
                    </td>
                    <td colSpan={4} className="py-2 px-3 text-right text-slate-500 font-normal italic text-xs">
                      (Đã bao gồm chiết khấu áp dụng theo cấp đại lý)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bảng Tổng Hợp Tài Chính & Chiết Khấu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start p-3.5 rounded-xl border border-slate-300 bg-slate-50/80 mb-4 print:bg-white print-no-break">
              <div className="space-y-1.5 overflow-hidden">
                {order.note && (
                  <div className="text-xs sm:text-[13px] leading-relaxed break-words break-all">
                    <span className="font-bold text-slate-800">Ghi chú đơn hàng: </span>
                    <span className="text-slate-700 italic">
                      {order.note}
                    </span>
                  </div>
                )}
                <div className="pt-0.5 text-xs sm:text-[13px] leading-relaxed break-words">
                  <span className="font-bold text-slate-900">Số tiền bằng chữ: </span>
                  <span className="font-bold text-indigo-950 italic">
                    {numberToVietnameseWords(order.grandTotal)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs sm:text-[13px] sm:max-w-xs sm:ml-auto w-full">
                <div className="flex justify-between text-slate-700">
                  <span>Tổng tiền niêm yết:</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(order.subtotal)}</span>
                </div>
                {order.totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Tổng tiền chiết khấu:</span>
                    <span>- {formatCurrency(order.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm sm:text-base font-black text-slate-950 pt-2 border-t border-slate-400">
                  <span>TỔNG THANH TOÁN:</span>
                  <span className="text-[#371cdb] text-base sm:text-lg">{formatCurrency(order.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalElement, document.body);
  }
  return modalElement;
};
