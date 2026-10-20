import React, { useState, useEffect } from 'react';
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  FileText,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import type { PickingLineItem } from '../../types/order-picking.types';

export interface PickingLineItemCardProps {
  item: PickingLineItem;
  onQuickPickAll: (itemId: string) => void;
  onRequestShortPickReason: (item: PickingLineItem, pickedQty: number) => void;
  onUpdateQuantityDirect: (itemId: string, pickedQty: number) => void;
  onOpenFefoSelector?: (item: PickingLineItem) => void;
}

export const PickingLineItemCard: React.FC<PickingLineItemCardProps> = ({
  item,
  onQuickPickAll,
  onRequestShortPickReason,
  onUpdateQuantityDirect,
  onOpenFefoSelector,
}) => {
  const [showOrderBreakdown, setShowOrderBreakdown] = useState(false);
  const [inputVal, setInputVal] = useState<string>(String(item.totalPickedQuantity));

  // Tự động đồng bộ ô input khi số lượng thực soạn thay đổi từ props
  useEffect(() => {
    setInputVal(String(item.totalPickedQuantity));
  }, [item.totalPickedQuantity]);

  const isCompleted = item.status === 'PICKED';
  const isShortPicked = item.status === 'SHORT_PICKED';
  const isPending = item.status === 'PENDING';

  // Tăng 1 đơn vị
  const handleIncrement = () => {
    const nextVal = item.totalPickedQuantity + 1;
    if (nextVal <= item.totalRequiredQuantity) {
      setInputVal(String(nextVal));
      onUpdateQuantityDirect(item.id, nextVal);
    }
  };

  // Khi ấn nút trừ: Kích hoạt cảnh báo & mở modal nhập lý do soạn thiếu
  const handleDecrement = () => {
    if (item.totalPickedQuantity <= 0) return;
    const nextVal = item.totalPickedQuantity - 1;
    onRequestShortPickReason(item, nextVal);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputVal(val);
  };

  const handleInputBlur = () => {
    const parsed = parseInt(inputVal, 10);
    if (isNaN(parsed) || parsed < 0) {
      setInputVal(String(item.totalPickedQuantity));
      return;
    }

    const clamped = Math.min(parsed, item.totalRequiredQuantity);
    if (clamped < item.totalRequiredQuantity) {
      onRequestShortPickReason(item, clamped);
    } else {
      setInputVal(String(clamped));
      onUpdateQuantityDirect(item.id, clamped);
    }
  };

  return (
    <div
      className={`rounded-xl border transition-all overflow-hidden bg-white shadow-xs ${
        isCompleted
          ? 'border-emerald-200/90 ring-1 ring-emerald-500/10'
          : isShortPicked
          ? 'border-amber-200/90 ring-1 ring-amber-500/10'
          : 'border-slate-200/90 hover:border-slate-300'
      }`}
    >
      {/* 1. Header: VỊ TRÍ (Khu - Dãy - Kệ) & Thứ tự bước nhặt theo đường đi */}
      <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-white font-mono font-bold text-[11px]">
            Bước #{item.stepNumber}
          </span>
          {item.location.isConfigured === false || item.location.formattedCode === 'Chưa cấu hình' ? (
            <div className="flex items-center gap-1.5 font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-md text-xs sm:text-sm shadow-2xs">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Chưa cấu hình vị trí - Cần bổ sung</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 bg-white border border-slate-200/90 px-2.5 py-1 rounded-md text-xs sm:text-sm shadow-2xs">
                <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="tracking-wide">{item.location.formattedCode}</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium hidden md:inline-flex items-center gap-1">
                Khu: <strong className="text-slate-700">{item.location.zone}</strong> • Dãy: <strong className="text-slate-700">{item.location.aisle}</strong> • Kệ: <strong className="text-slate-700">{item.location.rack}</strong> • Tầng: <strong className="text-slate-700">{item.location.shelf}</strong> • Ô: <strong className="text-slate-700">{item.location.bin}</strong>
              </span>
            </>
          )}
        </div>

        {/* Trạng thái dòng */}
        <div>
          {isCompleted && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Đã soạn đủ
            </span>
          )}
          {isShortPicked && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-xs">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Soạn thiếu ({item.totalPickedQuantity}/{item.totalRequiredQuantity})
            </span>
          )}
          {isPending && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold text-xs">
              Chờ soạn
            </span>
          )}
        </div>
      </div>

      {/* 2. Thân thẻ: Vị trí chi tiết (Mobile) -> SKU -> Tên SP -> Số lượng cần lấy */}
      <div className="p-3.5 sm:p-4 space-y-3">
        {/* Vị trí chi tiết trên mobile */}
        <div className="md:hidden flex items-center gap-1 flex-wrap text-[11px] text-slate-500 font-medium bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60">
          <span>Khu: <strong className="text-slate-700">{item.location.zone}</strong></span>
          <span>•</span>
          <span>Dãy: <strong className="text-slate-700">{item.location.aisle}</strong></span>
          <span>•</span>
          <span>Kệ: <strong className="text-slate-700">{item.location.rack}</strong></span>
          <span>•</span>
          <span>Tầng: <strong className="text-slate-700">{item.location.shelf}</strong></span>
          <span>•</span>
          <span>Ô: <strong className="text-slate-700">{item.location.bin}</strong></span>
        </div>

        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              {/* Mã SKU */}
              <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider block">
                SKU: {item.productSku}
              </span>
              {/* Tên sản phẩm */}
              <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug mt-0.5">
                {item.productName}
              </h4>
            </div>
            {item.category && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[11px] font-medium shrink-0 hidden sm:inline-block border border-slate-200/60">
                {item.category}
              </span>
            )}
          </div>

          {/* Hiển thị phân bổ Lô xuất FEFO nếu đã được chọn (SN-187) */}
          {item.selectedBatches && item.selectedBatches.length > 0 && (
            <div className="mt-2.5 p-2 rounded-xl bg-indigo-50/70 border border-indigo-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-indigo-950 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Lô xuất:</span>
                <span className="font-mono text-indigo-800">
                  {item.selectedBatches.map((b) => `${b.batchNumber} (${b.quantity} ${item.unit})`).join(', ')}
                </span>
              </div>
              {item.isOverrideBatch && item.batchOverrideReason && (
                <div className="flex items-start gap-1 text-[11px] text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-200">
                  <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Chọn khác FEFO:</strong> {item.batchOverrideReason}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Số lượng cần lấy */}
          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Số lượng cần lấy:</span>
            <span className="font-mono text-base sm:text-lg font-extrabold text-slate-900">
              {item.totalRequiredQuantity}
            </span>
            <span className="text-xs font-semibold text-slate-600">{item.unit}</span>
            {item.orders.length > 1 && (
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200/80">
                Gộp {item.orders.length} đơn
              </span>
            )}
          </div>
        </div>

        {/* Lý do soạn thiếu và Danh sách các đơn bị ảnh hưởng */}
        {isShortPicked && (
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="font-bold text-amber-900">
                    Soạn thiếu: {item.totalRequiredQuantity - item.totalPickedQuantity} {item.unit}
                  </span>
                  {item.shortPickReasonCode && (
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-amber-200/70 text-amber-800">
                      {item.shortPickReasonCode}
                    </span>
                  )}
                </div>
                {item.shortPickReason && (
                  <p className="text-slate-700 mt-1">
                    <strong>Lý do giải trình:</strong> {item.shortPickReason}
                  </p>
                )}
              </div>
            </div>

            {/* Danh sách các đơn bị ảnh hưởng do thiếu hàng */}
            {(() => {
              const affectedOrders = (item.orders || []).filter(
                (o) => o.pickedQuantity < o.requiredQuantity,
              );
              if (affectedOrders.length === 0) return null;
              return (
                <div className="pt-2 border-t border-amber-200/80">
                  <span className="text-[11px] font-bold text-amber-900 block mb-1">
                    Đơn hàng bị ảnh hưởng ({affectedOrders.length} đơn):
                  </span>
                  <div className="space-y-1">
                    {affectedOrders.map((ord) => (
                      <div
                        key={ord.orderId}
                        className="flex items-center justify-between bg-white/80 p-1.5 rounded-lg border border-amber-200/60 text-[11px]"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono font-bold text-indigo-700">
                            {ord.orderCode}
                          </span>
                          <span className="text-slate-500 truncate max-w-[140px]">
                            ({ord.customerName})
                          </span>
                        </div>
                        <span className="font-semibold text-rose-600 shrink-0">
                          Thiếu {ord.requiredQuantity - ord.pickedQuantity} / {ord.requiredQuantity} {ord.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 3. Khu vực thao tác số lượng thực soạn (Touch-friendly 38px) */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Thông tin số lượng thực soạn */}
          <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
            <span>Đã soạn:</span>
            <span
              className={`font-mono text-sm font-bold ${
                item.totalPickedQuantity === item.totalRequiredQuantity
                  ? 'text-emerald-600'
                  : item.totalPickedQuantity > 0
                  ? 'text-amber-600'
                  : 'text-slate-400'
              }`}
            >
              {item.totalPickedQuantity} / {item.totalRequiredQuantity} {item.unit}
            </span>
          </div>

          {/* Cụm điều khiển: [- Qty +] [Soạn đủ] [Báo thiếu] */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center h-10 border border-slate-300 rounded-xl bg-white shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={item.totalPickedQuantity <= 0}
                className="w-10 h-full flex items-center justify-center text-slate-600 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Giảm 1"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min={0}
                max={item.totalRequiredQuantity}
                value={inputVal}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                className="w-14 h-full text-center font-mono font-bold text-slate-900 text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={handleIncrement}
                disabled={item.totalPickedQuantity >= item.totalRequiredQuantity}
                className="w-10 h-full flex items-center justify-center text-slate-600 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Tăng 1"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Nút 1-chạm Soạn đủ */}
            <button
              type="button"
              onClick={() => {
                setInputVal(String(item.totalRequiredQuantity));
                onQuickPickAll(item.id);
              }}
              className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Soạn đủ</span>
            </button>

            {/* Nút Chọn Lô FEFO (SN-187) */}
            {onOpenFefoSelector && (
              <button
                type="button"
                onClick={() => onOpenFefoSelector(item)}
                className="h-10 px-3.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-900 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                title="Gợi ý và chọn Lô xuất theo nguyên tắc Hạn dùng gần nhất (FEFO)"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Lô FEFO
              </button>
            )}

            {/* Nút Báo thiếu */}
            <button
              type="button"
              onClick={() => onRequestShortPickReason(item, item.totalPickedQuantity)}
              className="h-10 px-3.5 rounded-xl border border-slate-300 hover:border-amber-400 bg-white hover:bg-amber-50 active:bg-amber-100 text-amber-800 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
              title="Ghi nhận lý do soạn thiếu"
            >
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span>Báo thiếu</span>
            </button>
          </div>
        </div>

        {/* 4. Xem phân bổ chi tiết cho từng đơn hàng (Nếu là gộp nhiều đơn) */}
        {item.orders.length > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowOrderBreakdown((prev) => !prev)}
              className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold flex items-center gap-1 cursor-pointer py-1"
            >
              <Layers className="w-3.5 h-3.5" />
              {showOrderBreakdown ? 'Ẩn phân bổ theo đơn' : `Xem phân bổ cho ${item.orders.length} đơn hàng`}
              {showOrderBreakdown ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showOrderBreakdown && (
              <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs animate-in fade-in duration-150">
                <p className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">
                  Phân chia vào giỏ / thùng hàng từng đơn:
                </p>
                <div className="divide-y divide-slate-200/70">
                  {item.orders.map((ord, idx) => (
                    <div key={`${ord.orderId}-${idx}`} className="py-1.5 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-slate-900">{ord.orderCode}</span>
                        <span className="text-slate-500 block text-[11px] truncate max-w-[200px]">
                          {ord.customerName}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-800">
                          {ord.pickedQuantity}/{ord.requiredQuantity} {ord.unit}
                        </span>
                        <span
                          className={`block text-[10px] font-semibold ${
                            ord.pickedQuantity === ord.requiredQuantity
                              ? 'text-emerald-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {ord.pickedQuantity === ord.requiredQuantity ? 'Đã đủ' : 'Chưa đủ'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
