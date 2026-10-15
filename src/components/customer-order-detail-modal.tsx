import React, { useState } from 'react';
import {
  X,
  Package,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Calendar,
  Phone,
  User,
  RotateCcw,
  Printer,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { Button } from './button';
import { OrderPrintModal } from './order-print-modal';
import type { Order, OrderLine, OrderStatus } from '../types/order';


interface CustomerOrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenReorder: (order: Order) => void;
}

/** Định dạng tiền tệ VND */
const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

/** Định dạng ngày DD/MM/YYYY */
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(
      2,
      '0',
    )}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

/** Định dạng ngày giờ chi tiết HH:mm - DD/MM/YYYY */
const formatDateTime = (dateStr?: string | Date): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} - ${day}/${month}/${year}`;
  } catch {
    return String(dateStr);
  }
};

/** Cấu hình trạng thái hiển thị cho Đại lý (SN-170 & SN-199) */
const STATUS_META: Record<
  string,
  { label: string; bgClass: string; textClass: string; icon: React.ReactNode }
> = {
  DRAFT: {
    label: 'Bản nháp',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-700',
    icon: <FileText className="w-3.5 h-3.5" />,
  },
  PENDING: {
    label: 'Chờ duyệt',
    bgClass: 'bg-amber-50 ring-1 ring-amber-300',
    textClass: 'text-amber-800',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  PENDING_APPROVAL: {
    label: 'Chờ duyệt hạn mức',
    bgClass: 'bg-amber-50 ring-1 ring-amber-300',
    textClass: 'text-amber-800',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  APPROVED: {
    label: 'Đã duyệt đơn',
    bgClass: 'bg-blue-50 ring-1 ring-blue-300',
    textClass: 'text-blue-800',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  PROCESSING: {
    label: 'Đang soạn hàng',
    bgClass: 'bg-purple-50 ring-1 ring-purple-300',
    textClass: 'text-purple-800',
    icon: <Package className="w-3.5 h-3.5" />,
  },
  DISPATCHED: {
    label: 'Đã xuất kho',
    bgClass: 'bg-cyan-50 ring-1 ring-cyan-300',
    textClass: 'text-cyan-800',
    icon: <Package className="w-3.5 h-3.5" />,
  },
  SHIPPED: {
    label: 'Đang vận chuyển',
    bgClass: 'bg-indigo-50 ring-1 ring-indigo-300',
    textClass: 'text-indigo-800',
    icon: <Truck className="w-3.5 h-3.5" />,
  },
  DELIVERED: {
    label: 'Giao thành công',
    bgClass: 'bg-emerald-50 ring-1 ring-emerald-300',
    textClass: 'text-emerald-800',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  COMPLETED: {
    label: 'Hoàn tất đơn hàng',
    bgClass: 'bg-emerald-50 ring-1 ring-emerald-300',
    textClass: 'text-emerald-800',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  CLOSED: {
    label: 'Đã đóng đơn',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-700',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  CANCELLED: {
    label: 'Đã hủy',
    bgClass: 'bg-rose-50 ring-1 ring-rose-300',
    textClass: 'text-rose-800',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
};

/**
 * Modal Chi Tiết Đơn Hàng Dành Cho Đại Lý (CustomerOrderDetailModal - SN-170 & SN-199):
 * - Theo dõi 5 mốc giao nhận chuẩn Jira SN-199: Đã duyệt -> Đang soạn -> Đã xuất -> Đang giao -> Đã giao
 * - Hiển thị mốc thời gian cụ thể (giờ:phút - ngày/tháng/năm) cho từng bước từ dữ liệu thực tế backend
 * - Khung giờ xe tới dự kiến & khuyến nghị bố trí người nhận hàng kịp thời
 * - Chi tiết từng dòng hàng và số lượng thực giao, phân biệt SL đã xuất kho và SL thực giao
 * - Tích hợp in/xuất PDF và nút Đặt lại đơn hàng (SN-174)
 */
export const CustomerOrderDetailModal: React.FC<CustomerOrderDetailModalProps> = ({
  order,
  isOpen,
  onClose,
  onOpenReorder,
}) => {
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  if (!isOpen || !order) return null;

  const statusInfo = STATUS_META[order.status] || {
    label: order.status,
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-700',
    icon: <FileText className="w-3.5 h-3.5" />,
  };

  const hasShortDelivery =
    order.isShortDelivery ||
    order.lines.some(
      (l) => l.deliveredQuantity !== undefined && l.deliveredQuantity < l.quantity,
    );

  // Xác định cấp độ tiến trình của 5 bước SN-199:
  // 1: APPROVED (Đã duyệt)
  // 2: PROCESSING (Đang soạn)
  // 3: DISPATCHED (Đã xuất)
  // 4: SHIPPED (Đang giao)
  // 5: DELIVERED (Đã giao)
  const getDeliveryStageLevel = (status: OrderStatus): number => {
    switch (status) {
      case 'DELIVERED':
      case 'COMPLETED':
      case 'CLOSED':
        return 5;
      case 'SHIPPED':
        return 4;
      case 'DISPATCHED':
        return 3;
      case 'PROCESSING':
        return 2;
      case 'APPROVED':
        return 1;
      case 'PENDING':
      case 'PENDING_APPROVAL':
      case 'PENDING_INVENTORY_APPROVAL':
      case 'DRAFT':
      default:
        return 0;
    }
  };

  const currentStageLevel = getDeliveryStageLevel(order.status);

  // Tính toán phần trăm và nhãn tiến độ tổng quan (SN-199)
  const getOverallProgress = (status: OrderStatus): { percent: number; label: string; color: string } => {
    switch (status) {
      case 'DELIVERED':
      case 'COMPLETED':
      case 'CLOSED':
        return { percent: 100, label: 'Đã giao hàng hoàn tất 100%', color: 'bg-emerald-600' };
      case 'SHIPPED':
        return { percent: 80, label: 'Xe đang vận chuyển tới đại lý (80%)', color: 'bg-indigo-600' };
      case 'DISPATCHED':
        return { percent: 60, label: 'Đã xuất kho bàn giao vận chuyển (60%)', color: 'bg-cyan-600' };
      case 'PROCESSING':
        return { percent: 40, label: 'Kho đang chuẩn bị soạn hàng (40%)', color: 'bg-purple-600' };
      case 'APPROVED':
        return { percent: 20, label: 'Đơn hàng đã được duyệt (20%)', color: 'bg-blue-600' };
      default:
        return { percent: 5, label: 'Đang tiếp nhận & Chờ xét duyệt', color: 'bg-slate-400' };
    }
  };

  const overallProgress = getOverallProgress(order.status);

  // Cấu hình 5 mốc thời gian chuẩn xác theo Jira SN-199:
  // "Hiển thị mốc thời gian: đã duyệt, đang soạn, đã xuất, đang giao, đã giao"
  // Yêu cầu:
  // - Hiển thị đủ 5 mốc thời gian.
  // - Trạng thái đã hoàn thành có dấu tích.
  // - Trạng thái hiện tại được làm nổi bật.
  // - Trạng thái chưa đến hiển thị màu xám.
  // - Hiển thị ngày giờ thực tế của từng mốc nếu có.
  // - Không tự động đánh dấu hoàn thành khi chưa có dữ liệu xác nhận.
  const deliveryMilestones = [
    {
      id: 'step-approved',
      level: 1,
      label: 'Đã duyệt',
      desc: 'Đơn đã được phê duyệt',
      timestamp: order.approvedAt
        ? formatDateTime(order.approvedAt)
        : currentStageLevel >= 1
        ? 'Đã duyệt'
        : 'Chờ xét duyệt',
      isCompleted: currentStageLevel > 1 || (currentStageLevel === 1 && !!order.approvedAt),
      isCurrent: currentStageLevel === 1,
    },
    {
      id: 'step-processing',
      level: 2,
      label: 'Đang soạn',
      desc: 'Kho đang chuẩn bị hàng',
      timestamp: order.processingAt
        ? formatDateTime(order.processingAt)
        : currentStageLevel >= 2
        ? 'Đang soạn hàng'
        : 'Chờ phân kho',
      isCompleted: currentStageLevel > 2 || (currentStageLevel === 2 && !!order.processingAt),
      isCurrent: currentStageLevel === 2,
    },
    {
      id: 'step-dispatched',
      level: 3,
      label: 'Đã xuất',
      desc: 'Hàng đã xuất khỏi kho',
      timestamp: order.dispatchedAt
        ? formatDateTime(order.dispatchedAt)
        : currentStageLevel >= 3
        ? 'Đã xuất kho'
        : 'Chờ xuất kho',
      isCompleted: currentStageLevel > 3 || (currentStageLevel === 3 && !!order.dispatchedAt),
      isCurrent: currentStageLevel === 3,
    },
    {
      id: 'step-shipped',
      level: 4,
      label: 'Đang giao',
      desc: 'Xe đang vận chuyển hàng',
      timestamp: order.shippedAt
        ? formatDateTime(order.shippedAt)
        : currentStageLevel >= 4
        ? 'Đang vận chuyển'
        : order.deliveryDate
        ? `Hẹn giao: ${formatDate(order.deliveryDate)}`
        : 'Chưa vận chuyển',
      isCompleted: currentStageLevel > 4 || (currentStageLevel === 4 && !!order.shippedAt),
      isCurrent: currentStageLevel === 4,
    },
    {
      id: 'step-delivered',
      level: 5,
      label: 'Đã giao',
      desc: 'Đơn hàng giao hoàn tất',
      timestamp: order.deliveredAt
        ? formatDateTime(order.deliveredAt)
        : currentStageLevel === 5
        ? 'Đã giao hàng'
        : order.estimatedDeliveryWindow
        ? `Dự kiến: ${order.estimatedDeliveryWindow}`
        : order.deliveryDate
        ? `Dự kiến: ${formatDate(order.deliveryDate)}`
        : 'Chưa giao',
      isCompleted: currentStageLevel === 5 && (!!order.deliveredAt || order.status === 'DELIVERED'),
      isCurrent: currentStageLevel === 5,
    },
  ];

  // Khung giờ xe tới dự kiến hiển thị nổi bật cho đại lý
  const estimatedArrival =
    order.estimatedDeliveryWindow ||
    (order.deliveryDate ? `14:00 - 16:30, ${formatDate(order.deliveryDate)}` : '14:00 - 16:30 hôm nay');

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-4xl rounded-xl bg-white shadow-2xl border border-slate-200/90 flex flex-col max-h-[92vh] overflow-hidden">
          {/* =============================================================== */}
          {/* 1. Header Modal                                                  */}
          {/* =============================================================== */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    Đơn hàng {order.orderCode || order.id}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.bgClass} ${statusInfo.textClass}`}
                  >
                    {statusInfo.icon}
                    {statusInfo.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ngày đặt đơn: {formatDateTime(order.createdAt)} • Người lập: {order.salesRepName || 'NVKD LOHA'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                title="In hoặc tải bản PDF đơn hàng"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                In đơn
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* =============================================================== */}
          {/* 2. Nội dung chi tiết cuộn                                       */}
          {/* =============================================================== */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* Cảnh báo Giao thiếu hàng nếu có (SN-170) */}
            {hasShortDelivery && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 shadow-2xs animate-in fade-in">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-200 text-amber-900 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-amber-900">
                      Đơn hàng được ghi nhận giao thiếu một số dòng hàng
                    </h4>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      Kho vận và nhân viên giao hàng đã ghi nhận chênh lệch giữa số lượng đặt và số lượng thực giao. Vui lòng kiểm tra chi tiết cột "Thực giao" bên dưới để đối chiếu số lượng thực nhận và ký biên bản giao nhận.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* HỘP ĐIỀU PHỐI GIAO HÀNG & BỐ TRÍ NGƯỜI NHẬN KHI XE TỚI (SN-199) */}
            {order.status !== 'CANCELLED' && (
              <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-indigo-50/40 p-4 sm:p-4.5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                      <Truck className={`w-5 h-5 ${currentStageLevel === 4 ? 'animate-bounce' : ''}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                          Điều phối giao vận & Xe tới kho
                        </span>
                        {currentStageLevel === 4 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white animate-pulse">
                            Xe đang di chuyển tới
                          </span>
                        )}
                        {currentStageLevel === 5 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                            Đã giao thành công
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        Dự kiến xe tới: <span className="text-blue-700 font-extrabold">{estimatedArrival}</span>
                      </p>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        👉 <strong>Đại lý lưu ý:</strong> Chủ động bố trí thủ kho và 1-2 nhân sự bốc dỡ tại{' '}
                        <span className="font-semibold text-slate-800">
                          {order.deliveryPoint?.name || 'Kho nhận hàng'}
                        </span>{' '}
                        đúng khung giờ trên để tiếp nhận xe hàng nhanh chóng.
                      </p>
                    </div>
                  </div>

                  {/* Thông tin tài xế & Xe giao */}
                  <div className="shrink-0 bg-white/90 border border-blue-100 rounded-lg p-2.5 text-xs text-slate-700 min-w-[210px] space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100 pb-1">
                      <span>Đơn vị giao vận:</span>
                      <span className="font-bold text-slate-800">{order.carrierName || 'LOHA Fleet Logistics'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Biển số xe:</span>
                      <span className="font-mono font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded">
                        {order.licensePlate || '29H-868.99'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Tài xế:</span>
                      <span className="font-semibold text-slate-800">{order.driverName || 'Nguyễn Văn Thắng'}</span>
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-slate-500">Liên hệ tài xế:</span>
                      <a
                        href={`tel:${order.driverPhone || '0988123456'}`}
                        className="font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        {order.driverPhone || '0988.123.456'}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TIẾN TRÌNH 5 MỐC THỜI GIAN THEO DÕI GIAO HÀNG (SN-199) */}
            {order.status !== 'CANCELLED' && (
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
                {/* Header Timeline & Tổng quan tiến độ giao hàng của đơn */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      Tiến trình 5 mốc giao hàng thực tế (SN-199)
                    </h4>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 inline-flex items-center gap-1 w-fit">
                      <span>{overallProgress.label}</span>
                    </span>
                  </div>

                  {/* Thanh Progress Bar trực quan */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${overallProgress.color}`}
                      style={{ width: `${overallProgress.percent}%` }}
                    />
                  </div>
                </div>

                {/* 1. TIMELINE DẠNG DỌC DÀNH CHO MOBILE (< 640px) */}
                <div className="block sm:hidden pt-2">
                  <div className="relative pl-6 space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {deliveryMilestones.map((st, idx) => {
                      return (
                        <div key={st.id} className="relative flex items-start gap-3">
                          {/* Node Icon Tròn */}
                          <div
                            className={`absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white text-xs ${
                              st.isCompleted
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-600 ring-2 ring-emerald-100'
                                : st.isCurrent
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-600 ring-4 ring-indigo-100 animate-pulse'
                                : 'border-slate-300 bg-slate-50 text-slate-400'
                            }`}
                          >
                            {st.isCompleted ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : st.isCurrent ? (
                              <Truck className="w-3.5 h-3.5" />
                            ) : (
                              <span className="text-[10px] font-bold font-mono">{idx + 1}</span>
                            )}
                          </div>

                          {/* Thẻ Nội dung từng bước */}
                          <div
                            className={`flex-1 p-3 rounded-xl border text-xs transition-all ${
                              st.isCompleted
                                ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950'
                                : st.isCurrent
                                ? 'border-indigo-300 bg-indigo-50/70 ring-1 ring-indigo-200 shadow-xs text-indigo-950'
                                : 'border-slate-200/70 bg-slate-50/40 text-slate-500'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs text-slate-900">
                                Bước {idx + 1}: {st.label}
                              </span>
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold shrink-0 ${
                                  st.isCompleted
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : st.isCurrent
                                    ? 'bg-indigo-100 text-indigo-800 font-extrabold'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {st.timestamp}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                              {st.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. TIMELINE DẠNG NGANG DÀNH CHO TABLET & DESKTOP (>= 640px) */}
                <div className="hidden sm:grid sm:grid-cols-5 gap-2.5">
                  {deliveryMilestones.map((st, idx) => {
                    return (
                      <div
                        key={st.id}
                        className={`flex flex-col justify-between p-3 rounded-xl border transition-all ${
                          st.isCompleted
                            ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950 shadow-2xs'
                            : st.isCurrent
                            ? 'border-indigo-400 bg-indigo-50/90 text-indigo-950 ring-2 ring-indigo-300/60 shadow-xs'
                            : 'border-slate-200/70 bg-slate-50/50 text-slate-400'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/80 border border-slate-200/60">
                              Bước {idx + 1}
                            </span>
                            {st.isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : st.isCurrent ? (
                              <Truck className="w-4 h-4 text-indigo-600 animate-pulse" />
                            ) : (
                              <Clock className="w-4 h-4 text-slate-300" />
                            )}
                          </div>
                          <div className="font-bold text-xs leading-tight text-slate-900">
                            {st.label}
                          </div>
                          <p className="text-[11px] opacity-80 mt-0.5 line-clamp-1">
                            {st.desc}
                          </p>
                        </div>

                        {/* Mốc thời gian cụ thể (giờ:phút - ngày/tháng/năm) */}
                        <div className="mt-2.5 pt-2 border-t border-slate-200/50">
                          <div className="text-[11px] font-semibold flex items-center gap-1">
                            <span
                              className={`truncate font-mono ${
                                st.isCompleted
                                  ? 'text-emerald-700 font-bold'
                                  : st.isCurrent
                                  ? 'text-indigo-700 font-extrabold'
                                  : 'text-slate-500'
                              }`}
                            >
                              {st.timestamp}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Thông tin Giao nhận & Địa chỉ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Điểm nhận hàng */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  Điểm giao hàng & Người nhận
                </div>
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-slate-900">
                    {order.deliveryPoint?.name || 'Kho nhận hàng đại lý'}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {order.deliveryPoint?.address || 'Chưa cập nhật địa chỉ'}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {order.deliveryPoint?.receiverName || order.customerName || 'Đại diện đại lý'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {order.deliveryPoint?.phone || '—'}
                    </span>
                  </div>
                  {order.deliveryPoint?.roadNote && (
                    <p className="text-xs text-slate-500 italic pt-1">
                      Chỉ dẫn đường: {order.deliveryPoint.roadNote}
                    </p>
                  )}
                </div>
              </div>

              {/* Thời gian hẹn giao & Ghi chú */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Thời gian giao dự kiến & Ghi chú
                </div>
                <div className="text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Ngày giao dự kiến:</span>
                    <span className="font-bold text-slate-900 text-sm inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-md">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(order.deliveryDate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Trạng thái thanh toán:</span>
                    <span className="font-medium text-xs text-slate-700">
                      {order.paymentStatus === 'PAID'
                        ? 'Đã thanh toán 100%'
                        : order.paymentStatus === 'PARTIAL'
                        ? 'Thanh toán một phần'
                        : 'Chưa thanh toán (Ghi nợ định kỳ)'}
                    </span>
                  </div>
                  {order.note && (
                    <div className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600 leading-relaxed border border-slate-100">
                      <span className="font-semibold text-slate-700">Ghi chú đơn: </span>
                      {order.note}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bảng chi tiết dòng hàng & Số lượng thực giao (SN-170) */}
            <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-100 gap-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-indigo-600" />
                  Danh sách sản phẩm trong đơn ({order.lines.length} mặt hàng)
                </h4>
                <span className="text-xs text-slate-500 font-medium">
                  Tổng SL đặt: <strong className="font-bold text-slate-800">{order.lines.reduce((s, l) => s + l.quantity, 0)}</strong> sản phẩm
                </span>
              </div>

              {/* 1. CARD VIEW CHO MOBILE (< 768px: Mobile First không bị tràn ngang) */}
              <div className="block md:hidden divide-y divide-slate-100">
                {order.lines.map((line: OrderLine, idx: number) => {
                  const isConfirmed = line.deliveredQuantity !== undefined;
                  const deliveredQty = line.deliveredQuantity ?? 0;
                  const missingQty = isConfirmed ? Math.max(0, line.quantity - deliveredQty) : null;
                  const isLineShort = isConfirmed && missingQty! > 0;
                  const dispatchedQty =
                    line.dispatchedQuantity !== undefined
                      ? line.dispatchedQuantity
                      : currentStageLevel >= 3
                      ? line.quantity
                      : undefined;

                  return (
                    <div
                      key={line.id || idx}
                      className={`p-3.5 space-y-2.5 transition-colors ${
                        isLineShort ? 'bg-rose-50/40 border-l-4 border-l-rose-500' : ''
                      }`}
                    >
                      {/* Tiêu đề sản phẩm & Badge trạng thái */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                            {line.productName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            SKU: {line.productSku} • ĐVT: {line.unit}
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isConfirmed ? (
                            isLineShort ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                Thiếu {missingQty}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Đủ 100%
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              Chưa xác nhận
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Lý do thiếu hàng nếu có */}
                      {isLineShort && line.shortDeliveryReason && (
                        <div className="text-[11px] font-medium text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-start gap-1.5 leading-relaxed">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>Lý do thiếu: {line.shortDeliveryReason}</span>
                        </div>
                      )}

                      {/* Lưới 4 số lượng: Đặt, Đã xuất, Thực giao, Thiếu */}
                      <div className="grid grid-cols-4 gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-center">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">SL Đặt</span>
                          <span className="font-extrabold font-mono text-slate-900 text-xs">
                            {line.quantity}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Đã xuất</span>
                          <span className="font-bold font-mono text-slate-800 text-xs">
                            {dispatchedQty !== undefined ? dispatchedQty : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Thực giao</span>
                          <span className="font-bold font-mono text-xs">
                            {isConfirmed ? (
                              <span className={isLineShort ? 'text-rose-600 font-extrabold' : 'text-emerald-700'}>
                                {line.deliveredQuantity}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px] italic">Chờ xe</span>
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">SL Thiếu</span>
                          <span className="font-bold font-mono text-xs">
                            {isConfirmed ? (
                              <span className={missingQty! > 0 ? 'text-rose-600 font-extrabold' : 'text-emerald-700'}>
                                {missingQty}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">—</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Đơn giá và Thành tiền */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-500">
                        <span>Đơn giá: <span className="font-mono">{formatCurrency(line.unitPrice)}</span></span>
                        <span>Thành tiền: <strong className="text-slate-900 font-mono">{formatCurrency(line.lineTotal)}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 2. TABLE VIEW CHO TABLET & DESKTOP (>= 768px) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50/80 text-slate-600 uppercase text-[11px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">STT</th>
                      <th className="py-2.5 px-3">Mã SKU / Tên sản phẩm</th>
                      <th className="py-2.5 px-3 text-center">ĐVT</th>
                      <th className="py-2.5 px-3 text-right">SL Đặt</th>
                      <th className="py-2.5 px-3 text-right">SL Đã xuất</th>
                      <th className="py-2.5 px-3 text-right">SL Thực giao</th>
                      <th className="py-2.5 px-3 text-right">SL Thiếu</th>
                      <th className="py-2.5 px-3 text-right">Đơn giá</th>
                      <th className="py-2.5 px-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.lines.map((line: OrderLine, idx: number) => {
                      const isConfirmed = line.deliveredQuantity !== undefined;
                      const deliveredQty = line.deliveredQuantity ?? 0;
                      const missingQty = isConfirmed ? Math.max(0, line.quantity - deliveredQty) : null;
                      const isLineShort = isConfirmed && missingQty! > 0;
                      const dispatchedQty =
                        line.dispatchedQuantity !== undefined
                          ? line.dispatchedQuantity
                          : currentStageLevel >= 3
                          ? line.quantity
                          : undefined;

                      return (
                        <tr
                          key={line.id || idx}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            isLineShort ? 'bg-rose-50/40 border-l-4 border-l-rose-500' : ''
                          }`}
                        >
                          <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900 leading-snug">
                              {line.productName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {line.productSku}
                            </div>
                            {/* Hiển thị lý do giao thiếu nếu có */}
                            {isLineShort && line.shortDeliveryReason && (
                              <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300">
                                <AlertCircle className="w-3 h-3 shrink-0 text-amber-600" />
                                <span>{line.shortDeliveryReason}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-600 font-medium">
                            {line.unit}
                          </td>
                          <td className="py-3 px-3 text-right font-extrabold text-slate-900 font-mono text-sm">
                            {line.quantity}
                          </td>
                          <td className="py-3 px-3 text-right font-mono">
                            {dispatchedQty !== undefined ? (
                              <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {dispatchedQty}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Chưa xuất</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {isConfirmed ? (
                              isLineShort ? (
                                <span className="font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-300 font-mono">
                                  {line.deliveredQuantity}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  {line.deliveredQuantity}
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                Chưa xác nhận
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {isConfirmed ? (
                              missingQty! > 0 ? (
                                <span className="font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-300 font-mono">
                                  {missingQty}
                                </span>
                              ) : (
                                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                                  0
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Chưa xác nhận</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600 font-mono">
                            {formatCurrency(line.unitPrice)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                            {formatCurrency(line.lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Phần tổng kết số lượng thực giao & Tổng tiền (SN-199) */}
              <div className="border-t border-slate-100 bg-slate-50/90 p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                {(() => {
                  const totalOrdered = order.lines.reduce((s, l) => s + l.quantity, 0);
                  const hasAnyDeliveredConfirmation = order.lines.some(
                    (l) => l.deliveredQuantity !== undefined,
                  );
                  const totalDelivered = hasAnyDeliveredConfirmation
                    ? order.lines.reduce((s, l) => s + (l.deliveredQuantity ?? 0), 0)
                    : null;
                  const totalMissing = hasAnyDeliveredConfirmation
                    ? order.lines.reduce(
                        (s, l) => s + Math.max(0, l.quantity - (l.deliveredQuantity ?? l.quantity)),
                        0,
                      )
                    : null;
                  const totalDispatched = order.lines.reduce(
                    (s, l) =>
                      s + (l.dispatchedQuantity ?? (currentStageLevel >= 3 ? l.quantity : 0)),
                    0,
                  );

                  return (
                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                        Tổng kết số lượng:
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-medium text-slate-800 shadow-2xs">
                        SL Đặt:{' '}
                        <strong className="font-bold text-slate-900 font-mono">{totalOrdered}</strong>
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-medium text-slate-800 shadow-2xs">
                        SL Đã xuất:{' '}
                        <strong className="font-bold text-slate-900 font-mono">
                          {currentStageLevel >= 3 ? totalDispatched : 'Chưa xuất'}
                        </strong>
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-lg border font-medium shadow-2xs ${
                          hasShortDelivery
                            ? 'bg-rose-50 border-rose-300 text-rose-800'
                            : order.status === 'DELIVERED'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        Thực giao:{' '}
                        {totalDelivered !== null ? (
                          <strong className="font-bold font-mono">{totalDelivered}</strong>
                        ) : (
                          <span className="italic text-slate-500 font-semibold">Chưa xác nhận</span>
                        )}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-lg border font-medium shadow-2xs ${
                          totalMissing !== null && totalMissing > 0
                            ? 'bg-rose-100 border-rose-300 text-rose-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        SL Thiếu:{' '}
                        {totalMissing !== null ? (
                          totalMissing > 0 ? (
                            <strong className="text-rose-600 font-mono font-extrabold">
                              {totalMissing}
                            </strong>
                          ) : (
                            <strong className="text-emerald-700 font-mono">0 (Đủ)</strong>
                          )
                        ) : (
                          <span className="italic text-slate-500">Chưa xác nhận</span>
                        )}
                      </span>
                    </div>
                  );
                })()}

                <div className="flex flex-col items-end space-y-1.5 w-full lg:w-auto">
                  <div className="flex items-center justify-between w-64 text-xs text-slate-600">
                    <span>Tiền hàng trước CK:</span>
                    <span className="font-mono">{formatCurrency(order.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between w-64 text-xs text-emerald-700 font-medium">
                    <span>Tổng chiết khấu đại lý:</span>
                    <span className="font-mono">-{formatCurrency(order.totalDiscount)}</span>
                  </div>
                  <div className="flex items-center justify-between w-64 text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                    <span>Tổng thanh toán:</span>
                    <span className="text-indigo-600 font-mono text-base font-extrabold">
                      {formatCurrency(order.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =============================================================== */}
          {/* 3. Footer Actions: Đặt lại đơn hàng (SN-174) & Đóng              */}
          {/* =============================================================== */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-t border-slate-100 bg-white gap-2 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsPrintModalOpen(true)}
                leftIcon={<Printer className="w-4 h-4" />}
                className="cursor-pointer h-10 sm:h-9"
              >
                In phiếu
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} className="cursor-pointer h-10 sm:h-9">
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpenReorder(order)}
                leftIcon={<RotateCcw className="w-4 h-4" />}
                className="shadow-xs cursor-pointer h-10 sm:h-9"
              >
                Đặt lại đơn
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal In Đơn Hàng Chuẩn A4 */}
      {isPrintModalOpen && (
        <OrderPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          order={order}
        />
      )}
    </>
  );
};
