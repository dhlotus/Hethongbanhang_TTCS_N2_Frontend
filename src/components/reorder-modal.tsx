import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  RotateCcw,
  AlertTriangle,
  Calendar,
  MapPin,
  Tag,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from './button';
import { showToast } from './toast';
import { ordersService } from '../services/orders.service';
import type {
  Order,
  ReorderPreviewResponse,
  ReorderPreviewItem,
  DiscontinuedProductItem,
} from '../types/order';


/**
 * [SN-174]: Đại lý đặt lại một đơn đã mua trước đây (1-Click Reorder)
 * - Tự động nạp toàn bộ dòng hàng từ đơn cũ
 * - Loại bỏ và cảnh báo các mặt hàng đã ngừng kinh doanh (Discontinued Items)
 * - Tái áp giá niêm yết và chiết khấu theo bảng giá hiện hành của đại lý
 * - Cho phép chọn/bỏ chọn từng dòng hàng bằng checkbox trước khi xác nhận tạo đơn mới
 */
interface ReorderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newOrder: Order) => void;
}

/** Định dạng tiền tệ VND */
const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

/** Ngày mặc định giao hàng: hôm nay + 3 ngày */
const getDefaultDeliveryDate = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().split('T')[0];
};

/**
 * Modal Đặt Lại Đơn Hàng Cũ Dành Cho Đại Lý (ReorderModal - SN-174):
 * - Hỗ trợ đặt lại toàn bộ hoặc một phần dòng hàng (chọn lọc theo checkbox)
 * - Tự động phát hiện và loại bỏ mặt hàng đã ngừng kinh doanh kèm thông báo rõ ràng
 * - Tái áp giá theo bảng giá hiện hành của đại lý (không kế thừa giá cũ)
 */
export const ReorderModal: React.FC<ReorderModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<ReorderPreviewResponse | null>(null);

  // Danh sách ID dòng hàng được chọn
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());
  // Map số lượng điều chỉnh theo SKU: { [productSku]: quantity }
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  // Ngày giao hàng mới
  const [deliveryDate, setDeliveryDate] = useState<string>(getDefaultDeliveryDate);
  // Ghi chú đơn mới
  const [note, setNote] = useState<string>('');

  // Nạp dữ liệu preview và kiểm tra mặt hàng ngừng kinh doanh / bảng giá hiện hành (SN-174)
  useEffect(() => {
    if (!isOpen || !order?.id) return;

    let isMounted = true;
    setIsLoading(true);

    const loadPreview = async () => {
      try {
        const preview = await ordersService.getReorderPreview(order.id!);
        if (!isMounted) return;

        setPreviewData(preview);

        // Mặc định chọn toàn bộ các mặt hàng khả dụng (còn kinh doanh)
        const initialSelected = new Set<string>(preview.availableItems.map((item: ReorderPreviewItem) => item.lineId));
        setSelectedLineIds(initialSelected);

        // Mặc định lấy số lượng từ đơn cũ
        const initialQty: Record<string, number> = {};
        for (const item of preview.availableItems) {
          initialQty[item.productSku] = item.quantity;
        }
        setQuantities(initialQty);

        // Đặt ngày hẹn giao mới mặc định
        setDeliveryDate(getDefaultDeliveryDate());
        setNote(`Đặt lại định kỳ từ đơn cũ ${order.orderCode || order.id}`);
      } catch (error) {
        if (!isMounted) return;
        showToast(
          'error',
          error instanceof Error
            ? error.message
            : 'Không thể nạp thông tin đặt lại đơn hàng'
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadPreview();

    return () => {
      isMounted = false;
    };
  }, [isOpen, order]);

  // Xử lý chọn / bỏ chọn một dòng hàng
  const handleToggleLine = (lineId: string) => {
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) {
        next.delete(lineId);
      } else {
        next.add(lineId);
      }
      return next;
    });
  };

  // Xử lý chọn tất cả / bỏ chọn tất cả
  const handleToggleSelectAll = () => {
    if (!previewData) return;
    if (selectedLineIds.size === previewData.availableItems.length) {
      setSelectedLineIds(new Set());
    } else {
      setSelectedLineIds(new Set<string>(previewData.availableItems.map((item: ReorderPreviewItem) => item.lineId)));
    }
  };

  // Xử lý thay đổi số lượng đặt lại của một mặt hàng
  const handleChangeQuantity = (productSku: string, rawVal: string) => {
    const cleaned = rawVal.replace(/\D/g, '');
    const num = parseInt(cleaned, 10);
    setQuantities((prev) => ({
      ...prev,
      [productSku]: isNaN(num) || num <= 0 ? 1 : num,
    }));
  };

  // Tăng/giảm nhanh số lượng bằng nút bấm
  const handleStepQuantity = (productSku: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[productSku] ?? 1;
      const next = Math.max(1, current + delta);
      return {
        ...prev,
        [productSku]: next,
      };
    });
  };

  // Tính toán tổng tiền theo thời gian thực dựa trên các dòng đã chọn và GIÁ HIỆN HÀNH (SN-174)
  const calculationSummary = useMemo(() => {
    if (!previewData) {
      return { subtotal: 0, totalDiscount: 0, grandTotal: 0, selectedCount: 0 };
    }

    let subtotal = 0;
    let grandTotal = 0;
    let selectedCount = 0;

    for (const item of previewData.availableItems) {
      if (!selectedLineIds.has(item.lineId)) continue;
      selectedCount += 1;
      const qty = quantities[item.productSku] ?? item.quantity;
      const lineListTotal = qty * item.currentListPrice;
      const lineTotal = qty * item.currentUnitPrice;

      subtotal += lineListTotal;
      grandTotal += lineTotal;
    }

    const totalDiscount = Math.max(0, subtotal - grandTotal);
    return { subtotal, totalDiscount, grandTotal, selectedCount };
  }, [previewData, selectedLineIds, quantities]);

  // Xử lý gửi đơn đặt lại
  const handleSubmitReorder = async () => {
    if (!order?.id || !previewData) return;

    if (selectedLineIds.size === 0) {
      showToast('warning', 'Vui lòng chọn ít nhất một mặt hàng để đặt lại đơn hàng!');
      return;
    }

    if (!deliveryDate) {
      showToast('warning', 'Vui lòng chọn ngày giao hàng mong muốn!');
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsPayload = previewData.availableItems
        .filter((item: ReorderPreviewItem) => selectedLineIds.has(item.lineId))
        .map((item: ReorderPreviewItem) => ({
          productSku: item.productSku,
          productId: item.productId,
          quantity: quantities[item.productSku] ?? item.quantity,
          unit: item.unit,
        }));

      const res = await ordersService.reorder(order.id, {
        selectedLineIds: Array.from(selectedLineIds),
        items: itemsPayload,
        deliveryDate,
        deliveryPoint: previewData.deliveryPoint,
        note: note.trim() || undefined,
      });

      showToast('success', res.message);
      onSuccess(res.newOrder);
      onClose();
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Không thể thực hiện đặt lại đơn hàng'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200/90 flex flex-col max-h-[92vh] overflow-hidden">
        {/* ================================================================= */}
        {/* 1. Header Modal                                                  */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary)]">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Đặt lại đơn hàng {order.orderCode || order.id}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tự động áp lại bảng giá hiện hành & loại bỏ mặt hàng đã ngừng kinh doanh (SN-174)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* 2. Nội dung cuộn                                                 */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
              <p className="text-sm font-medium">Đang kiểm tra bảng giá hiện hành & danh mục sản phẩm...</p>
            </div>
          ) : (
            <>
              {/* CẢNH BÁO: Mặt hàng đã ngừng kinh doanh được loại khỏi đơn mới kèm thông báo (SN-174) */}
              {previewData?.discontinuedItems && previewData.discontinuedItems.length > 0 && (
                <div className="rounded-xl border border-rose-300 bg-rose-50/90 p-4 shadow-2xs animate-in fade-in">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-200 text-rose-900 font-bold">
                      <AlertTriangle className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-rose-950">
                          Thông báo: Đã tự động loại bỏ {previewData.discontinuedItems.length} mặt hàng ngừng kinh doanh
                        </h4>
                        <span className="text-[11px] font-semibold bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded-full">
                          Loại trừ tự động
                        </span>
                      </div>
                      <p className="text-xs text-rose-900 mt-1 leading-relaxed">
                        Các sản phẩm dưới đây từ đơn cũ hiện đã ngừng kinh doanh hoặc thay thế mẫu mới, hệ thống tự động loại bỏ khỏi đơn đặt lại để tránh sai sót:
                      </p>
                      <div className="mt-2 space-y-1.5 divide-y divide-rose-200/60 text-xs">
                        {previewData.discontinuedItems.map((it: DiscontinuedProductItem, idx: number) => (
                          <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between text-rose-900">
                            <div>
                              <span className="font-bold text-rose-950">{it.productName}</span>{' '}
                              <span className="font-mono text-rose-700">({it.productSku})</span>
                            </div>
                            <span className="text-[11px] italic text-rose-800 font-medium bg-white/70 px-2 py-0.5 rounded border border-rose-200">
                              {it.reason}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Thông báo áp bảng giá hiện hành */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 flex items-center gap-3 text-xs text-blue-900 shadow-2xs">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="leading-relaxed">
                  <span className="font-bold text-blue-950">Chính sách giá hiện hành: </span>
                  Đơn hàng đặt lại được áp dụng theo bảng giá niêm yết và chiết khấu mới nhất của đại lý tại thời điểm hiện tại. Đơn giá và chiết khấu cũ từ đơn trước không được kế thừa.
                </div>
              </div>

              {/* Bảng chọn dòng hàng đặt lại (Toàn bộ hoặc một phần - SN-174) */}
              <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="select-all-lines"
                      checked={
                        previewData?.availableItems &&
                        previewData.availableItems.length > 0 &&
                        selectedLineIds.size === previewData.availableItems.length
                      }
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary-ring)] cursor-pointer"
                    />
                    <label
                      htmlFor="select-all-lines"
                      className="text-xs font-bold uppercase tracking-wider text-slate-700 cursor-pointer select-none"
                    >
                      Chọn dòng hàng muốn đặt lại ({selectedLineIds.size} / {previewData?.availableItems.length || 0})
                    </label>
                  </div>
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    Tick chọn để đặt lại toàn bộ hoặc một phần dòng hàng
                  </span>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs text-slate-700 min-w-[620px]">
                    <thead className="bg-slate-50/50 text-slate-500 uppercase text-[11px] font-semibold border-b border-slate-100">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">Chọn</th>
                        <th className="py-2.5 px-3">Sản phẩm / SKU</th>
                        <th className="py-2.5 px-3 text-center">ĐVT</th>
                        <th className="py-2.5 px-3 text-center w-32">SL đặt lại</th>
                        <th className="py-2.5 px-3 text-right">Đơn giá cũ</th>
                        <th className="py-2.5 px-3 text-right">Giá hiện hành</th>
                        <th className="py-2.5 px-3 text-right">Thành tiền mới</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData?.availableItems.map((item: ReorderPreviewItem) => {
                        const isSelected = selectedLineIds.has(item.lineId);
                        const currentQty = quantities[item.productSku] ?? item.quantity;
                        const lineTotal = currentQty * item.currentUnitPrice;

                        return (
                          <tr
                            key={item.lineId}
                            className={`transition-colors ${
                              isSelected ? 'bg-white hover:bg-slate-50/60' : 'bg-slate-50/50 opacity-60'
                            }`}
                          >
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleLine(item.lineId)}
                                className="w-4 h-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary-ring)] cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-900">{item.productName}</div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                {item.productSku}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center text-slate-600 font-medium">
                              {item.unit}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="inline-flex items-center justify-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs">
                                <button
                                  type="button"
                                  disabled={!isSelected || currentQty <= 1}
                                  onClick={() => handleStepQuantity(item.productSku, -1)}
                                  className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer text-xs font-bold transition-colors select-none"
                                  title="Giảm 1"
                                >
                                  -
                                </button>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  disabled={!isSelected}
                                  value={currentQty}
                                  onChange={(e) => handleChangeQuantity(item.productSku, e.target.value)}
                                  className={`w-12 h-7 text-center font-bold text-xs border-x border-slate-200 focus:outline-none ${
                                    isSelected ? 'text-slate-900 bg-white' : 'text-slate-400 bg-slate-50'
                                  }`}
                                />
                                <button
                                  type="button"
                                  disabled={!isSelected}
                                  onClick={() => handleStepQuantity(item.productSku, 1)}
                                  className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer text-xs font-bold transition-colors select-none"
                                  title="Tăng 1"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-400 line-through">
                              {formatCurrency(item.oldUnitPrice)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono">
                              <div className="font-bold text-slate-900">
                                {formatCurrency(item.currentUnitPrice)}
                              </div>
                              {item.isPriceChanged && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--color-primary)] font-semibold bg-[var(--color-primary-light)] px-1.5 py-0.2 rounded mt-0.5">
                                  <Tag className="w-2.5 h-2.5" />
                                  Giá mới
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                              {isSelected ? formatCurrency(lineTotal) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Tổng kết tiền đơn đặt lại */}
                <div className="border-t border-slate-100 bg-slate-50/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    Đã chọn <span className="font-bold text-slate-800">{calculationSummary.selectedCount}</span> mặt hàng
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <div className="flex items-center gap-4 text-xs text-slate-600">
                      <span>Tiền hàng niêm yết:</span>
                      <span className="font-mono">{formatCurrency(calculationSummary.subtotal)}</span>
                    </div>
                    {calculationSummary.totalDiscount > 0 && (
                      <div className="flex items-center gap-4 text-xs text-emerald-700 font-medium">
                        <span>Chiết khấu đại lý:</span>
                        <span className="font-mono">-{formatCurrency(calculationSummary.totalDiscount)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-200">
                      <span>Tổng thanh toán mới:</span>
                      <span className="text-[var(--color-primary)] font-mono text-base font-extrabold">
                        {formatCurrency(calculationSummary.grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tùy chọn giao hàng & Ghi chú */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Ngày giao hàng mới */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Ngày hẹn giao hàng mới *
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                  <p className="text-[11px] text-slate-400">
                    Kho sẽ xử lý đóng gói và giao đúng ngày mong muốn
                  </p>
                </div>

                {/* Điểm nhận hàng */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    Điểm nhận hàng
                  </label>
                  <div className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 leading-snug">
                    <span className="font-semibold block text-slate-900">
                      {previewData?.deliveryPoint?.name || 'Kho Tổng Phú Nhuận'}
                    </span>
                    <span className="text-slate-500 truncate block">
                      {previewData?.deliveryPoint?.address || '123 Nguyễn Trọng Tuyển, P.8, Q.Phú Nhuận, TP.HCM'}
                    </span>
                  </div>
                </div>

                {/* Ghi chú thêm cho đơn */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Ghi chú đơn hàng (nếu có)
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ví dụ: Đặt lại hàng định kỳ tuần này, giao buổi sáng trước 11h..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* ================================================================= */}
        {/* 3. Footer Actions                                                */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-white">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting} className="cursor-pointer">
            Hủy bỏ
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmitReorder}
            isLoading={isSubmitting}
            loadingText="Đang tạo đơn đặt lại..."
            disabled={isLoading || isSubmitting || selectedLineIds.size === 0}
            leftIcon={<RotateCcw className="w-4 h-4" />}
            className="shadow-xs cursor-pointer"
          >
            Xác nhận đặt lại ({selectedLineIds.size} mặt hàng)
          </Button>
        </div>
      </div>
    </div>
  );
};
