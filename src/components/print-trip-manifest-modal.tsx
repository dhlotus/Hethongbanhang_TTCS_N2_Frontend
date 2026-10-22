import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, RefreshCw, X } from 'lucide-react';
import type { DeliveryTrip } from '../types/delivery-trip';
import { deliveryTripsService } from '../services/delivery-trips.service';

interface Props {
  trip: DeliveryTrip;
  onClose: () => void;
}

export const PrintTripManifestModal: React.FC<Props> = ({ trip: initialTrip, onClose }) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [trip, setTrip] = useState<DeliveryTrip>(initialTrip);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    if (initialTrip?.id) {
      setIsLoading(true);
      deliveryTripsService
        .getTripManifest(initialTrip.id)
        .then((manifest) => {
          if (isMounted && manifest?.trip) {
            setTrip({
              ...manifest.trip,
              stops: manifest.stops || manifest.trip.stops || [],
            });
          }
        })
        .catch((err) => {
          console.warn('[PrintTripManifestModal] Không thể nạp manifest live từ server:', err);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [initialTrip]);

  /**
   * In độc lập qua Hidden Iframe:
   * Loại bỏ 100% trang trắng rác, chỉ in DUY NHẤT Lệnh điều xe chuẩn A4 Full trang
   */
  const executeIframePrint = () => {
    const contentElement = printAreaRef.current;
    if (!contentElement) {
      window.print();
      return;
    }

    // Dọn dẹp iframe cũ nếu có
    const oldIframe = document.getElementById('manifest-print-engine-iframe');
    if (oldIframe) {
      oldIframe.remove();
    }

    // Tạo hidden iframe chuyên dụng
    const iframe = document.createElement('iframe');
    iframe.id = 'manifest-print-engine-iframe';
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

    const documentTitle = `Lenh_Dieu_Xe_${trip.tripCode || 'TRIP'}`;

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
            font-family: 'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
            font-size: 11px !important;
            line-height: 1.45 !important;
            width: 100% !important;
            height: auto !important;
          }

          .manifest-sheet {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 0 !important;
          }

          th, td {
            border: 1px solid #94a3b8 !important;
            padding: 6px 8px !important;
            vertical-align: top !important;
          }

          th {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
            font-weight: 700 !important;
          }

          thead {
            display: table-header-group !important;
          }

          tr {
            page-break-inside: avoid !important;
          }

          .print-no-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        </style>
      </head>
      <body>
        <div class="manifest-sheet">
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
      } catch (err) {
        console.error('Lỗi in iframe, fallback sang window.print:', err);
        window.print();
      }
    }, 300);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        executeIframePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      const oldIframe = document.getElementById('manifest-print-engine-iframe');
      if (oldIframe) oldIframe.remove();
    };
  }, [onClose]);

  const formatCurrency = (val?: number) => {
    return (val || 0).toLocaleString('vi-VN') + ' đ';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      {/* Container modal - không in khi in trang web */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Modal Header (Ẩn khi in) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0 print:hidden">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Printer className="w-4 h-4 text-indigo-600" />
              Xem trước Bản in Lệnh điều xe & Bảng kê điểm giao
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <span>
                Mã chuyến: <span className="font-mono font-semibold text-indigo-700">{trip.tripCode}</span>
                {' — '}
                Tuyến: <span className="font-medium text-slate-700">{trip.routeArea}</span>
              </span>
              {isLoading && (
                <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Đang đồng bộ...
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={executeIframePrint}
              className="inline-flex items-center justify-center gap-1.5 h-[38px] px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span>In ngay (Print)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Nội dung bảng in tiêu chuẩn A4 */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-100/60 print:bg-white print:p-0">
          <div
            ref={printAreaRef}
            className="manifest-sheet bg-white p-8 rounded-lg shadow-sm border border-slate-200 mx-auto max-w-3xl text-slate-900 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none text-xs leading-relaxed"
          >
            {/* Header Doanh nghiệp */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-5">
              <div>
                <h1 className="text-sm font-extrabold tracking-wider text-slate-900 uppercase">
                  CÔNG TY CỔ PHẦN PHÂN PHỐI & THƯƠNG MẠI LOHA SALES
                </h1>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Kho hàng: {trip.warehouseName || 'Tổng kho Phân phối'}
                </p>
                <p className="text-[11px] text-slate-600">
                  Hotline điều vận: 1900 6868 — Email: logistics@loha.vn
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded border border-slate-300 inline-block">
                  {trip.tripCode}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  In lúc: {formatDate(new Date().toISOString())}
                </p>
              </div>
            </div>

            {/* Tiêu đề biểu mẫu */}
            <div className="text-center my-4">
              <h2 className="text-lg font-black uppercase tracking-wide text-slate-900">
                LỆNH ĐIỀU XE & BẢNG KÊ ĐIỂM GIAO HÀNG
              </h2>
              <p className="text-xs italic text-slate-600 mt-0.5">
                (Phân tuyến vận chuyển & Giao nhận hàng hóa nhiều điểm — SN-196)
              </p>
            </div>

            {/* Thông tin chuyến xe & Tài xế */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 p-3.5 bg-slate-50 rounded-lg border border-slate-200 my-4 text-xs">
              <div>
                <span className="text-slate-500 inline-block w-28">Tên chuyến giao:</span>
                <span className="font-bold text-slate-900">{trip.name}</span>
              </div>
              <div>
                <span className="text-slate-500 inline-block w-28">Tài xế phụ trách:</span>
                <span className="font-bold text-indigo-900 text-sm">{trip.driverName || 'Chưa gán'}</span>
              </div>
              <div>
                <span className="text-slate-500 inline-block w-28">Tuyến / Khu vực:</span>
                <span className="font-semibold text-slate-800">{trip.routeArea}</span>
              </div>
              <div>
                <span className="text-slate-500 inline-block w-28">SĐT tài xế:</span>
                <span className="font-bold font-mono text-slate-900">{trip.driverPhone || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 inline-block w-28">Thời gian xuất phát:</span>
                <span className="font-medium text-slate-800">{formatDate(trip.departureDate)}</span>
              </div>
              <div>
                <span className="text-slate-500 inline-block w-28">Phương tiện / Xe:</span>
                <span className="font-bold font-mono text-slate-900">
                  {trip.vehicleNumber || '—'} {trip.vehicleType ? `(${trip.vehicleType})` : ''}
                </span>
              </div>
              {trip.note && (
                <div className="col-span-2 pt-1 border-t border-slate-200/80">
                  <span className="text-slate-500 inline-block w-28">Ghi chú chuyến:</span>
                  <span className="italic text-slate-700">{trip.note}</span>
                </div>
              )}
            </div>

            {/* Bảng kê chi tiết các điểm giao */}
            <div className="my-5 overflow-hidden border border-slate-300 rounded">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-2 text-center w-8 border-r border-slate-300">STT</th>
                    <th className="py-2.5 px-2 border-r border-slate-300 w-24">Mã phiếu / Đơn</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">Tên Đại lý / Khách hàng</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 w-36">Người nhận & SĐT</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">Địa chỉ giao hàng chi tiết</th>
                    <th className="py-2.5 px-2 text-right border-r border-slate-300 w-20">Tiền thu hộ (COD)</th>
                    <th className="py-2.5 px-3 text-center w-28">Ký nhận của khách</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {trip.stops.map((stop, idx) => (
                    <tr key={stop.id} className="align-top">
                      <td className="py-3 px-2 text-center font-bold text-slate-700 border-r border-slate-200">
                        {stop.stopOrder || idx + 1}
                      </td>
                      <td className="py-3 px-2 font-mono border-r border-slate-200">
                        <div className="font-semibold text-slate-900">{stop.shipmentId}</div>
                        <div className="text-[10px] text-slate-500">{stop.orderCode}</div>
                      </td>
                      <td className="py-3 px-3 border-r border-slate-200 font-medium text-slate-800">
                        {stop.customerName}
                      </td>
                      <td className="py-3 px-3 border-r border-slate-200">
                        <div className="font-bold text-slate-900 text-xs">{stop.receiverName}</div>
                        <div className="font-mono font-semibold text-indigo-700 text-xs mt-0.5">
                          {stop.receiverPhone || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-3 border-r border-slate-200 text-slate-700">
                        {stop.deliveryAddress}
                        {stop.note && (
                          <div className="text-[10px] text-amber-700 italic mt-0.5">
                            * {stop.note}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right border-r border-slate-200 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(stop.codAmount)}
                      </td>
                      <td className="py-3 px-2 text-center border-slate-200 text-slate-400">
                        <div className="h-9 border border-dashed border-slate-300 rounded flex items-center justify-center text-[10px]">
                          Ký & Ghi họ tên
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-900">
                    <td colSpan={5} className="py-2.5 px-3 text-right uppercase border-r border-slate-300">
                      Tổng cộng ({trip.totalStops} điểm giao):
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-extrabold text-sm border-r border-slate-300 text-indigo-900">
                      {formatCurrency(trip.totalCodAmount)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Chú thích trách nhiệm vận chuyển */}
            <div className="text-[10px] text-slate-500 italic mb-8 border-l-2 border-slate-300 pl-2">
              Lưu ý đối với tài xế: Kiểm tra nguyên vẹn niêm phong và chứng từ giao hàng. Khi đại lý nhận hàng, bắt buộc ký biên bản giao nhận có đầy đủ họ tên (hoặc chụp ảnh xác nhận POD theo quy định SN-198). Hàng không giao được phải liên hệ quản lý kho ngay trong ca chạy.
            </div>

            {/* Khu vực ký xác nhận 3 bên */}
            <div className="grid grid-cols-3 gap-4 text-center mt-6 pt-2 text-xs">
              <div>
                <p className="font-bold uppercase text-slate-800">Quản lý kho điều xe</p>
                <p className="text-[10px] text-slate-400 italic">(Ký và ghi rõ họ tên)</p>
                <div className="h-20 flex items-end justify-center font-semibold text-slate-800">
                  {trip.createdBy || 'Vũ Thành Long'}
                </div>
              </div>
              <div>
                <p className="font-bold uppercase text-slate-800">Thủ kho xuất hàng</p>
                <p className="text-[10px] text-slate-400 italic">(Ký xác nhận bàn giao xe)</p>
                <div className="h-20 flex items-end justify-center font-semibold text-slate-800">
                  Hoàng Minh Tuấn
                </div>
              </div>
              <div>
                <p className="font-bold uppercase text-slate-800">Tài xế nhận hàng</p>
                <p className="text-[10px] text-slate-400 italic">(Ký xác nhận đủ hàng)</p>
                <div className="h-20 flex items-end justify-center font-semibold text-slate-800">
                  {trip.driverName || '................................'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer (Ẩn khi in) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50 shrink-0 print:hidden">
          <p className="text-xs text-slate-500">
            Hỗ trợ in ấn khổ giấy A4 dọc. Bấm <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded">Ctrl+P</kbd> hoặc nút In ngay phía trên.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center h-[38px] px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all shadow-2xs cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
