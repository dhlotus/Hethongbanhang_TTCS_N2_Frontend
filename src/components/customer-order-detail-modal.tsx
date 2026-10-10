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

/** Cấu hình trạng thái hiển thị cho Đại lý (SN-170) */
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
  CANCELLED: {
    label: 'Đã hủy',
    bgClass: 'bg-rose-50 ring-1 ring-rose-300',
    textClass: 'text-rose-800',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
};

/**
 * Modal Chi Tiết Đơn Hàng Dành Cho Đại Lý (CustomerOrderDetailModal - SN-170):
 * - Theo dõi ngày giao dự kiến, người nhận, địa chỉ nhận hàng, tổng tiền
 * - Chi tiết từng dòng hàng và số lượng thực giao nếu có giao thiếu
 * - Tích hợp nút in/xuất PDF và nút Đặt lại đơn hàng (SN-174)
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

  const steps: Array<{ key: OrderStatus; label: string; desc: string }> = [
    { key: 'PENDING', label: '1. Gửi đơn', desc: 'Chờ xét duyệt' },
    { key: 'APPROVED', label: '2. Đã duyệt', desc: 'Đủ điều kiện xuất' },
    { key: 'PROCESSING', label: '3. Soạn hàng', desc: 'Đóng gói tại kho' },
    { key: 'SHIPPED', label: '4. Đang giao', desc: 'Trên đường vận chuyển' },
    { key: 'DELIVERED', label: '5. Hoàn tất', desc: 'Đại lý đã nhận hàng' },
  ];

  const getStepState = (stepKey: OrderStatus): 'done' | 'current' | 'upcoming' => {
    const orderHierarchy: Record<string, number> = {
      DRAFT: 0,
      PENDING: 1,
      PENDING_APPROVAL: 1,
      APPROVED: 2,
      PROCESSING: 3,
      SHIPPED: 4,
      DELIVERED: 5,
    };
    const currentLevel = orderHierarchy[order.status] ?? 1;
    const stepLevel = orderHierarchy[stepKey] ?? 1;

    if (currentLevel > stepLevel) return 'done';
    if (currentLevel === stepLevel) return 'current';
    return 'upcoming';
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200/90 flex flex-col max-h-[92vh] overflow-hidden">
          {/* =============================================================== */}
          {/* 1. Header Modal                                                  */}
          {/* =============================================================== */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary)]">
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
                  Ngày đặt đơn: {formatDate(order.createdAt)} • Người lập: {order.salesRepName || 'NVKD LOHA'}
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
                      Kho vận và nhân viên giao hàng đã ghi nhận chênh lệch giữa số lượng đặt và số lượng thực giao. Vui lòng kiểm tra chi tiết các dòng hàng bên dưới để đối chiếu số lượng thực nhận và ký biên bản giao nhận.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tiến trình lộ trình giao hàng (Timeline Steps) */}
            {order.status !== 'CANCELLED' && (
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                  Tiến độ vận chuyển & Bàn giao
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {steps.map((st) => {
                    const state = getStepState(st.key);
                    return (
                      <div
                        key={st.key}
                        className={`flex flex-col p-2.5 rounded-lg border transition-colors ${
                          state === 'done'
                            ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900'
                            : state === 'current'
                            ? 'border-[var(--color-primary-subtle)] bg-[var(--color-primary-light)] text-[var(--color-primary)] ring-1 ring-[var(--color-primary-subtle)]'
                            : 'border-slate-100 bg-slate-50/60 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          {state === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                          {state === 'current' && <Truck className="w-3.5 h-3.5 text-[var(--color-primary)] animate-pulse" />}
                          {state === 'upcoming' && <Clock className="w-3.5 h-3.5 text-slate-300" />}
                          <span>{st.label}</span>
                        </div>
                        <span className="text-[11px] opacity-80 mt-1">{st.desc}</span>
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
                  <MapPin className="w-4 h-4 text-[var(--color-primary)]" />
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
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[var(--color-primary)]" />
                  Danh sách sản phẩm trong đơn ({order.lines.length} mặt hàng)
                </h4>
                <span className="text-xs text-slate-500">
                  Tổng SL đặt: {order.lines.reduce((s, l) => s + l.quantity, 0)} sản phẩm
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50/50 text-slate-500 uppercase text-[11px] font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3">STT</th>
                      <th className="py-2.5 px-3">Mã SKU / Tên sản phẩm</th>
                      <th className="py-2.5 px-3 text-center">ĐVT</th>
                      <th className="py-2.5 px-3 text-right">SL Đặt</th>
                      <th className="py-2.5 px-3 text-right">Thực giao</th>
                      <th className="py-2.5 px-3 text-right">Đơn giá</th>
                      <th className="py-2.5 px-3 text-right">Chiết khấu</th>
                      <th className="py-2.5 px-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.lines.map((line: OrderLine, idx: number) => {
                      const isLineShort =
                        line.isShortDelivery ||
                        (line.deliveredQuantity !== undefined &&
                          line.deliveredQuantity < line.quantity);
                      const isLineDeliveredFull =
                        line.deliveredQuantity !== undefined &&
                        line.deliveredQuantity >= line.quantity;

                      return (
                        <tr
                          key={line.id || idx}
                          className={`hover:bg-slate-50/60 transition-colors ${
                            isLineShort ? 'bg-amber-50/30' : ''
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
                              <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                {line.shortDeliveryReason}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-600 font-medium">
                            {line.unit}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            {line.quantity}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {isLineShort ? (
                              <div className="inline-flex flex-col items-end">
                                <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  {line.deliveredQuantity} / {line.quantity}
                                </span>
                                <span className="text-[10px] text-rose-500 font-medium mt-0.5">
                                  Thiếu {line.quantity - (line.deliveredQuantity || 0)} {line.unit}
                                </span>
                              </div>
                            ) : isLineDeliveredFull ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                <CheckCircle2 className="w-3 h-3" />
                                {line.deliveredQuantity} (Đủ)
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs italic">
                                {order.status === 'SHIPPED' ? 'Đang giao' : 'Chờ giao'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600 font-mono">
                            {formatCurrency(line.unitPrice)}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600">
                            {line.discountPercent > 0 ? (
                              <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                                -{line.discountPercent}%
                              </span>
                            ) : (
                              '0%'
                            )}
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

              {/* Phần tổng tiền */}
              <div className="border-t border-slate-100 bg-slate-50/60 p-4 flex flex-col items-end space-y-1.5">
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
                  <span className="text-[var(--color-primary)] font-mono text-base font-extrabold">
                    {formatCurrency(order.grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* =============================================================== */}
          {/* 3. Footer Actions: Đặt lại đơn hàng (SN-174) & Đóng              */}
          {/* =============================================================== */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-white">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsPrintModalOpen(true)}
                leftIcon={<Printer className="w-4 h-4" />}
                className="cursor-pointer"
              >
                In phiếu
              </Button>
            </div>

            <div className="flex items-center gap-2.5">
              <Button variant="ghost" size="sm" onClick={onClose} className="cursor-pointer">
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpenReorder(order)}
                leftIcon={<RotateCcw className="w-4 h-4" />}
                className="shadow-xs cursor-pointer"
              >
                Đặt lại đơn hàng này
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
