import React, { useState } from 'react';
import { AlertTriangle, X, Check, FileText } from 'lucide-react';
import {
  SHORT_PICK_REASONS,
  type PickingLineItem,
  type ShortPickReasonCode,
} from '../../types/order-picking.types';

export interface ShortPickReasonModalProps {
  isOpen: boolean;
  item: PickingLineItem | null;
  currentPickedQuantity: number;
  onClose: () => void;
  onConfirm: (
    pickedQuantity: number,
    reasonText: string,
    reasonCode: ShortPickReasonCode,
    notes?: string,
  ) => void;
}

export const ShortPickReasonModal: React.FC<ShortPickReasonModalProps> = ({
  isOpen,
  item,
  currentPickedQuantity,
  onClose,
  onConfirm,
}) => {
  const [selectedReasonCode, setSelectedReasonCode] = useState<ShortPickReasonCode>('INSUFFICIENT_STOCK');
  const [customReasonText, setCustomReasonText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const missingQuantity = Math.max(0, item.totalRequiredQuantity - currentPickedQuantity);

  const handleSelectReason = (code: ShortPickReasonCode) => {
    setSelectedReasonCode(code);
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedOption = SHORT_PICK_REASONS.find((r) => r.code === selectedReasonCode);
    let finalReasonText = selectedOption?.label || '';

    if (selectedReasonCode === 'OTHER') {
      if (!customReasonText.trim()) {
        setErrorMessage('Vui lòng nhập chi tiết lý do khi chọn "Lý do khác"');
        return;
      }
      finalReasonText = customReasonText.trim();
    } else if (customReasonText.trim()) {
      finalReasonText = `${finalReasonText}: ${customReasonText.trim()}`;
    }

    onConfirm(currentPickedQuantity, finalReasonText, selectedReasonCode);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in slide-in-from-bottom duration-200">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 bg-amber-500 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/20 text-white">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">Xác nhận lý do soạn thiếu</h3>
              <p className="text-xs text-amber-100 font-medium">Bắt buộc giải trình theo quy định kho</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung thông tin món hàng */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs sm:text-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span>Mã SKU: <strong className="text-slate-800">{item.productSku}</strong></span>
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-xs">
                Thiếu {missingQuantity} {item.unit}
              </span>
            </div>
            <p className="font-semibold text-slate-800 line-clamp-2">{item.productName}</p>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 text-xs">
              <span className="text-slate-600">
                Yêu cầu: <strong>{item.totalRequiredQuantity} {item.unit}</strong>
              </span>
              <span className="text-amber-700 font-bold">
                Thực soạn: {currentPickedQuantity} {item.unit}
              </span>
            </div>

            {/* Danh sách các đơn hàng thành phần bị ảnh hưởng */}
            {item.orders && item.orders.length > 0 && (
              <div className="pt-2 border-t border-slate-200/80 space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Đơn hàng bị ảnh hưởng ({item.orders.length} đơn):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {item.orders.map((ord) => (
                    <span
                      key={ord.orderId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] shadow-2xs"
                    >
                      <strong className="font-mono text-indigo-700">{ord.orderCode}</strong>
                      <span className="text-slate-500">({ord.requiredQuantity} {ord.unit})</span>
                      <span className="text-slate-400">• {ord.customerName}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Danh sách chọn lý do */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Chọn lý do soạn thiếu <span className="text-rose-500">*</span>
            </label>
            <div className="space-y-2">
              {SHORT_PICK_REASONS.map((reason) => {
                const isSelected = selectedReasonCode === reason.code;
                return (
                  <button
                    key={reason.code}
                    type="button"
                    onClick={() => handleSelectReason(reason.code)}
                    className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-400 text-amber-950 ring-2 ring-amber-400/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{reason.label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{reason.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ghi chú chi tiết thêm */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {selectedReasonCode === 'OTHER' ? (
                <span>Nhập chi tiết lý do khác <span className="text-rose-500">*</span></span>
              ) : (
                <span>Mô tả thêm / Số lô / Hiện trạng thực tế:</span>
              )}
            </label>
            <textarea
              rows={2}
              value={customReasonText}
              onChange={(e) => {
                setCustomReasonText(e.target.value);
                setErrorMessage(null);
              }}
              placeholder={
                selectedReasonCode === 'OTHER'
                  ? 'Ví dụ: Hàng chưa về kho phụ trách, lệch số liệu kiểm kê tuần trước...'
                  : 'Ghi chú thêm thông tin cho quản lý kho (không bắt buộc)...'
              }
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 resize-none"
            />
            {errorMessage && (
              <p className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {errorMessage}
              </p>
            )}
          </div>

          {/* Footer nút bấm (Tối ưu cho mobile dễ bấm ngón tay cái) */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              Lưu lý do thiếu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
