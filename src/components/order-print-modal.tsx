import React, { useRef } from 'react';
import {
  Printer,
  Download,
  X,
  Building2,
  MapPin,
  Calendar,
  User,
  FileText,
  CheckCircle2,
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

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    // Kích hoạt hộp thoại in hệ thống (cho phép lưu trực tiếp thành PDF sắc nét)
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:max-h-none print:shadow-none print:w-full print:rounded-none">
        {/* Thanh công cụ Modal (Nền trắng sáng sủa, sạch sẽ, chuẩn UI Guidelines) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-slate-200 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#371cdb]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 tracking-wide">
                Xem Trước & Xuất Mẫu In Đơn Hàng (SN-47)
              </h2>
              <p className="text-xs text-slate-500">
                Mã đơn: <span className="font-mono font-bold text-[#371cdb] bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{order.orderCode}</span> · Đưa đại lý xác nhận tại chỗ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#371cdb] text-white hover:bg-[#2d16b5] shadow-xs transition-colors cursor-pointer"
              title="In trực tiếp ra máy in A4 / máy in nhiệt"
            >
              <Printer className="w-3.5 h-3.5" />
              In đơn hàng
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
              title="Xuất file PDF để lưu trữ hoặc gửi Zalo cho đại lý"
            >
              <Download className="w-3.5 h-3.5" />
              Xuất PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ml-1"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nội dung Mẫu in chuẩn A4 (Có thể cuộn trên màn hình & In thực tế) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 print:bg-white print:p-0 print:overflow-visible">
          <div
            ref={printContentRef}
            id="order-print-document"
            className="bg-white max-w-[210mm] mx-auto p-6 sm:p-8 rounded-xl shadow-xs border border-slate-200 text-slate-900 print:shadow-none print:border-none print:p-0 print:max-w-none text-xs sm:text-sm"
          >
            {/* Header Mẫu in: Logo công ty & Mã vạch tra cứu */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b-2 border-slate-900">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-1 bg-[#371cdb] text-white font-extrabold text-sm sm:text-base rounded-md tracking-wider">
                    LOHA SALES
                  </div>
                  <span className="font-bold text-slate-800 text-xs sm:text-sm uppercase tracking-wide">
                    Hệ Thống Phân Phối B2B
                  </span>
                </div>
                <h1 className="font-bold text-slate-900 text-xs sm:text-sm uppercase pt-1">
                  CÔNG TY CỔ PHẦN PHÂN PHỐI & THỰC PHẨM DINH DƯỠNG LOHA VIỆT NAM
                </h1>
                <p className="text-[11px] text-slate-600">
                  Địa chỉ: 123 Nguyễn Trọng Tuyển, Phường 8, Quận Phú Nhuận, TP. Hồ Chí Minh
                </p>
                <p className="text-[11px] text-slate-600">
                  Hotline: <span className="font-semibold text-slate-800">1900 6868</span> · Email: <span className="font-semibold text-slate-800">sales@loha.vn</span> · MST: <span className="font-semibold text-slate-800">0312456789</span>
                </p>
              </div>

              {/* Mã vạch Barcode SVG (SN-47: Có mã đơn và mã vạch để kho tra cứu nhanh) */}
              <div className="flex flex-col items-center sm:items-end justify-center bg-slate-50 p-2 sm:p-2.5 rounded-lg border border-slate-200 self-stretch sm:self-auto shrink-0 print:bg-transparent print:border-none">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                  MÃ TRA CỨU KHO (BARCODE)
                </div>
                <BarcodeSvg
                  value={order.orderCode || 'DH-UNKNOWN'}
                  height={46}
                  showText={true}
                  className="max-w-[190px]"
                />
              </div>
            </div>

            {/* Tiêu đề Phiếu Đặt Hàng */}
            <div className="text-center my-4 sm:my-5">
              <h2 className="text-base sm:text-xl font-extrabold uppercase text-slate-900 tracking-tight">
                PHIẾU XÁC NHẬN ĐƠN ĐẶT HÀNG
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                (Dành cho Đại lý kiểm tra & xác nhận tại chỗ trước khi rời đi)
              </p>
            </div>

            {/* Khối Thông tin Đại lý & Điểm giao hàng */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
              {/* Cột 1: Thông tin Đại lý */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5 print:bg-white print:border-slate-300">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-[#371cdb] border-b border-slate-200 pb-1 mb-1.5">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Thông Tin Đại Lý</span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-500">Tên đại lý: </span>
                  <span className="font-bold text-slate-900">{order.customerName}</span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-500">Mã đại lý: </span>
                  <span className="font-mono font-semibold text-slate-800">{order.customerCode}</span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-500">Phân cấp: </span>
                  <span className="font-medium text-slate-700">{getCustomerGroupLabel(order.customerGroup)}</span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-500">Số điện thoại: </span>
                  <span className="font-medium text-slate-800">{order.deliveryPoint?.phone || '—'}</span>
                </div>
              </div>

              {/* Cột 2: Thông tin Giao nhận */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5 print:bg-white print:border-slate-300">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-[#371cdb] border-b border-slate-200 pb-1 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>Điểm Giao Hàng & Nhận Hàng</span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-500">Điểm giao: </span>
                  <span className="font-semibold text-slate-800">
                    {order.deliveryPoint?.name || 'Giao tại địa chỉ đại lý'}
                  </span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-500">Người nhận: </span>
                  <span className="font-medium text-slate-800">
                    {order.deliveryPoint?.receiverName || order.customerName}
                  </span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-500">Địa chỉ giao: </span>
                  <span className="font-medium text-slate-800">
                    {order.deliveryPoint?.address || 'Theo địa chỉ đăng ký đại lý'}
                  </span>
                </div>
                {order.deliveryPoint?.roadNote && (
                  <div className="text-xs text-amber-900 bg-amber-50/70 px-2 py-1 rounded border border-amber-200">
                    <span className="font-semibold">Ghi chú đường: </span>
                    {order.deliveryPoint.roadNote}
                  </div>
                )}
              </div>
            </div>

            {/* Thông tin đơn hàng (Ngày hẹn giao, NV kinh doanh) */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-100 rounded-lg text-xs mb-4 print:bg-slate-50 print:border print:border-slate-300">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-600">Ngày đặt:</span>
                <span className="font-semibold text-slate-800">{formatDate(order.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-600">Ngày hẹn giao:</span>
                <span className="font-bold text-indigo-700">{formatDate(order.deliveryDate)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-600">Nhân viên phụ trách:</span>
                <span className="font-semibold text-slate-800">{order.salesRepName || 'NVKD Loha'}</span>
              </div>
            </div>

            {/* Bảng Chi Tiết Dòng Hàng (SN-47) */}
            <div className="border border-slate-300 rounded-lg overflow-hidden mb-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-semibold print:bg-slate-200">
                    <th className="py-2.5 px-2 text-center w-8 border-r border-slate-300">STT</th>
                    <th className="py-2.5 px-2.5 border-r border-slate-300">Mã SKU</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">Tên Mặt Hàng</th>
                    <th className="py-2.5 px-2 text-center border-r border-slate-300 w-16">ĐVT</th>
                    <th className="py-2.5 px-2 text-right border-r border-slate-300 w-14">SL</th>
                    <th className="py-2.5 px-2.5 text-right border-r border-slate-300 w-24">Đơn Giá Gốc</th>
                    <th className="py-2.5 px-2 text-center border-r border-slate-300 w-14">CK (%)</th>
                    <th className="py-2.5 px-2.5 text-right border-r border-slate-300 w-24">Đơn Giá CK</th>
                    <th className="py-2.5 px-3 text-right w-28">Thành Tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {order.lines.map((line, index) => (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="py-2 px-2 text-center font-medium text-slate-500 border-r border-slate-200">
                        {index + 1}
                      </td>
                      <td className="py-2 px-2.5 font-mono text-[11px] text-slate-600 border-r border-slate-200">
                        {line.productSku}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900 border-r border-slate-200">
                        {line.productName}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-600 border-r border-slate-200">
                        {line.unit}
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-slate-900 border-r border-slate-200">
                        {line.quantity}
                      </td>
                      <td className="py-2 px-2.5 text-right text-slate-600 border-r border-slate-200">
                        {formatCurrency(line.listPrice)}
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-200">
                        {line.discountPercent > 0 ? (
                          <span className="font-bold text-emerald-700">
                            {line.discountPercent}%
                          </span>
                        ) : (
                          <span className="text-slate-400">0%</span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-right text-slate-800 border-r border-slate-200">
                        {formatCurrency(line.unitPrice)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(line.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bảng Tổng Hợp Tài Chính & Chiết Khấu */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 p-3.5 rounded-xl border border-slate-300 bg-slate-50/60 mb-4 print:bg-white">
              <div className="w-full sm:w-1/2 space-y-1.5">
                {order.note && (
                  <div className="text-xs">
                    <span className="font-bold text-slate-700">Ghi chú đơn hàng: </span>
                    <span className="text-slate-600 italic">{order.note}</span>
                  </div>
                )}
                <div className="pt-1 text-xs">
                  <span className="font-bold text-slate-800">Số tiền bằng chữ: </span>
                  <span className="font-semibold text-indigo-900 italic">
                    {numberToVietnameseWords(order.grandTotal)}
                  </span>
                </div>
              </div>

              <div className="w-full sm:w-1/2 sm:max-w-xs space-y-1 text-xs self-end">
                <div className="flex justify-between text-slate-600">
                  <span>Tổng tiền niêm yết:</span>
                  <span className="font-medium text-slate-800">{formatCurrency(order.subtotal)}</span>
                </div>
                {order.totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Tổng tiền chiết khấu:</span>
                    <span>- {formatCurrency(order.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1.5 border-t border-slate-300">
                  <span>TỔNG THANH TOÁN:</span>
                  <span className="text-[#371cdb] text-base">{formatCurrency(order.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Chữ Ký Xác Nhận 3 Bên Tại Chỗ */}
            <div className="pt-3 pb-8 grid grid-cols-3 gap-3 text-center text-xs border-t border-dashed border-slate-300">
              <div className="space-y-12">
                <div>
                  <p className="font-bold uppercase text-slate-900">ĐẠI DIỆN ĐẠI LÝ</p>
                  <p className="text-[11px] text-slate-500 italic">(Ký, ghi rõ họ tên)</p>
                </div>
                <div className="text-[11px] text-slate-400 italic">
                  ................................................
                </div>
              </div>

              <div className="space-y-12">
                <div>
                  <p className="font-bold uppercase text-slate-900">NHÂN VIÊN KINH DOANH</p>
                  <p className="text-[11px] text-slate-500 italic">(Ký, ghi rõ họ tên)</p>
                </div>
                <div className="text-xs font-semibold text-slate-800">
                  {order.salesRepName || 'NVKD Loha'}
                </div>
              </div>

              <div className="space-y-12">
                <div>
                  <p className="font-bold uppercase text-slate-900">THỦ KHO TRA CỨU</p>
                  <p className="text-[11px] text-slate-500 italic">(Xác nhận xuất kho)</p>
                </div>
                <div className="text-[11px] text-slate-400 italic">
                  ................................................
                </div>
              </div>
            </div>

            {/* Footer bản in */}
            <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-slate-200">
              Phiếu in được khởi tạo tự động từ Hệ thống Quản lý Bán hàng & Kho LOHA SALES B2B · Ngày in: {new Date().toLocaleString('vi-VN')}
            </div>
          </div>
        </div>

        {/* Footer modal (chỉ hiện trên màn hình) */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0 print:hidden">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Mẫu in đã sẵn sàng theo khổ giấy chuẩn A4 với mã vạch kho</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#371cdb] text-white hover:bg-[#2d16b5] shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              In đơn ngay
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
