import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Truck,
  Package,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { shipmentsService, type Shipment, type ShipmentLine } from '../services/shipments.service';
import { showToast } from './toast';

interface ConfirmExportModalProps {
  isOpen: boolean;
  shipment: Shipment | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface ExportLineState {
  orderLineId: string;
  productSku: string;
  productName: string;
  unitName: string;
  orderedQuantity: number;
  shippedQuantity: number;
  remainingQuantity: number;
  isShortDelivery: boolean;
  shortDeliveryReason: string;
}

const COMMON_SHORT_REASONS = [
  'Kho tạm hết hàng trong ca xuất',
  'Hàng cận hạn sử dụng không đủ tiêu chuẩn',
  'Bao bì móp méo / lỗi quy cách',
  'Đang chờ nhập bổ sung từ nhà máy',
  'Khác (ghi chú cụ thể)',
];

export const ConfirmExportModal: React.FC<ConfirmExportModalProps> = ({
  isOpen,
  shipment,
  onClose,
  onSuccess,
}) => {
  const [lines, setLines] = useState<ExportLineState[]>([]);
  const [carrierName, setCarrierName] = useState('Giao Hàng Nhanh');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (shipment) {
      setCarrierName(shipment.carrierName || 'Giao Hàng Nhanh');
      setTrackingNumber(shipment.trackingNumber || '');
      setNote(shipment.note || '');
      setErrorMsg(null);

      // Khởi tạo các dòng mặt hàng
      const initialLines: ExportLineState[] = (shipment.lines || []).map((l: ShipmentLine) => ({
        orderLineId: l.orderLineId || l.id,
        productSku: l.productSku,
        productName: l.productName,
        unitName: l.unitName || 'Đơn vị',
        orderedQuantity: l.orderedQuantity,
        shippedQuantity: l.orderedQuantity, // Mặc định xuất đủ 100%
        remainingQuantity: 0,
        isShortDelivery: false,
        shortDeliveryReason: COMMON_SHORT_REASONS[0],
      }));

      // Nếu phiếu chưa có lines (fallback), tạo 1 dòng đại diện
      if (initialLines.length === 0) {
        initialLines.push({
          orderLineId: 'line-default',
          productSku: 'SP-ORDER',
          productName: `Kiện hàng đơn ${shipment.orderCode}`,
          unitName: 'Kiện',
          orderedQuantity: 1,
          shippedQuantity: 1,
          remainingQuantity: 0,
          isShortDelivery: false,
          shortDeliveryReason: COMMON_SHORT_REASONS[0],
        });
      }

      setLines(initialLines);
    }
  }, [shipment, isOpen]);

  if (!isOpen || !shipment) return null;

  // Xử lý thay đổi số lượng thực xuất của từng dòng
  const handleQuantityChange = (index: number, valStr: string) => {
    const val = parseInt(valStr, 10);
    const parsed = isNaN(val) ? 0 : Math.max(0, val);

    setLines((prev) => {
      const next = [...prev];
      const line = { ...next[index] };
      const ordered = line.orderedQuantity;
      const actual = Math.min(parsed, ordered);

      line.shippedQuantity = actual;
      line.remainingQuantity = Math.max(0, ordered - actual);
      line.isShortDelivery = actual < ordered;

      next[index] = line;
      return next;
    });
  };

  // Xử lý thay đổi lý do giao thiếu
  const handleReasonChange = (index: number, reason: string) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], shortDeliveryReason: reason };
      return next;
    });
  };

  const hasAnyShortDelivery = lines.some((l) => l.isShortDelivery);
  const totalOrdered = lines.reduce((acc, l) => acc + l.orderedQuantity, 0);
  const totalShipped = lines.reduce((acc, l) => acc + l.shippedQuantity, 0);
  const totalRemaining = lines.reduce((acc, l) => acc + l.remainingQuantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    for (const l of lines) {
      if (l.shippedQuantity < 0) {
        setErrorMsg(`Số lượng thực xuất của SKU ${l.productSku} không được âm.`);
        return;
      }
      if (l.shippedQuantity > l.orderedQuantity) {
        setErrorMsg(`Số lượng thực xuất của SKU ${l.productSku} không được vượt quá số lượng đặt (${l.orderedQuantity}).`);
        return;
      }
      if (l.isShortDelivery && !l.shortDeliveryReason?.trim()) {
        setErrorMsg(`Vui lòng chọn hoặc nhập lý do giao thiếu cho mặt hàng ${l.productName}.`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await shipmentsService.confirmExport(shipment.id, {
        carrierName,
        trackingNumber: trackingNumber.trim(),
        note: note.trim(),
        lines: lines.map((l) => ({
          orderLineId: l.orderLineId,
          shippedQuantity: l.shippedQuantity,
          shortDeliveryReason: l.isShortDelivery ? l.shortDeliveryReason : undefined,
        })),
      });

      showToast(
        'success',
        hasAnyShortDelivery
          ? `Xác nhận xuất kho thành công! Đã ghi nhận nợ hàng (${totalRemaining} sản phẩm) để xử lý ở lượt sau.`
          : 'Xác nhận xuất kho thành công 100%!',
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErrorMsg(msg || 'Lỗi khi xác nhận xuất kho. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                Xác nhận Xuất kho & Xử lý Giao thiếu
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Phiếu: <strong className="text-white">{shipment.id}</strong> | Đơn hàng:{' '}
                <strong className="text-blue-300">{shipment.orderCode}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Thông tin đại lý & giao hàng */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm">
            <div>
              <span className="text-xs text-slate-500 block">Đại lý nhận hàng:</span>
              <span className="font-semibold text-slate-900">{shipment.customerName}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Địa chỉ nhận hàng:</span>
              <span className="text-slate-700 truncate block" title={shipment.deliveryAddress}>
                {shipment.deliveryAddress || 'Tại kho'}
              </span>
            </div>
          </div>

          {/* Bảng kê thực xuất từng mặt hàng */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                Kiểm tra & Nhập số lượng thực xuất theo mặt hàng:
              </label>
              <span className="text-xs text-slate-500">
                Tổng đặt: <strong>{totalOrdered}</strong> | Thực xuất: <strong>{totalShipped}</strong> | Nợ:{' '}
                <strong className={totalRemaining > 0 ? 'text-amber-600 font-bold' : 'text-slate-600'}>
                  {totalRemaining}
                </strong>
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-100/80 text-xs font-semibold text-slate-600 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Mặt hàng (SKU)</th>
                    <th className="px-3 py-3 text-center">ĐVT</th>
                    <th className="px-3 py-3 text-right">SL Đặt</th>
                    <th className="px-3 py-3 text-center w-36">SL Thực xuất</th>
                    <th className="px-3 py-3 text-right">Nợ hàng</th>
                    <th className="px-4 py-3">Lý do giao thiếu (nếu có)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((line, idx) => (
                    <tr
                      key={line.orderLineId}
                      className={`transition-colors ${
                        line.isShortDelivery ? 'bg-amber-50/60' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900 block">{line.productName}</span>
                        <span className="text-xs font-mono text-slate-500">{line.productSku}</span>
                      </td>
                      <td className="px-3 py-3 text-center text-slate-600 font-medium">
                        {line.unitName}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-slate-900">
                        {line.orderedQuantity}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={line.orderedQuantity}
                          value={line.shippedQuantity}
                          onChange={(e) => handleQuantityChange(idx, e.target.value)}
                          className={`w-28 px-3 py-1.5 text-center font-bold text-base rounded-lg border transition-all ${
                            line.isShortDelivery
                              ? 'border-amber-400 bg-amber-50 text-amber-900 ring-2 ring-amber-400/20'
                              : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                          }`}
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        {line.remainingQuantity > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Thiếu {line.remainingQuantity}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Đủ 100%
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {line.isShortDelivery ? (
                          <select
                            value={line.shortDeliveryReason}
                            onChange={(e) => handleReasonChange(idx, e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          >
                            {COMMON_SHORT_REASONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Không có giao thiếu</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>


          {/* Thông tin giao vận & ghi chú */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Đơn vị vận chuyển:
              </label>
              <div className="relative">
                <Truck className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  placeholder="Ví dụ: Giao Hàng Nhanh, Viettel Post..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Mã vận đơn / Số xe:
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Ví dụ: TRK-2026-999..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Ghi chú xuất kho & bàn giao:
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú thêm cho lái xe hoặc đại lý..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl transition-all shadow-md shadow-blue-500/20"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang ghi sổ xuất kho...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Xác nhận Xuất kho & Giao hàng
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
