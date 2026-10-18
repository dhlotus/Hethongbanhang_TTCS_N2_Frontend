import React, { useState } from 'react';
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
} from 'lucide-react';
import type { PickingLineItem } from '../../types/order-picking.types';

export interface PickingLineItemCardProps {
  item: PickingLineItem;
  onQuickPickAll: (itemId: string) => void;
  onRequestShortPickReason: (item: PickingLineItem, pickedQty: number) => void;
  onUpdateQuantityDirect: (itemId: string, pickedQty: number) => void;
}

export const PickingLineItemCard: React.FC<PickingLineItemCardProps> = ({
  item,
  onQuickPickAll,
  onRequestShortPickReason,
  onUpdateQuantityDirect,
}) => {
  const [showOrderBreakdown, setShowOrderBreakdown] = useState(false);
  const [inputVal, setInputVal] = useState<string>(String(item.totalPickedQuantity));

  const isCompleted = item.status === 'PICKED';
  const isShortPicked = item.status === 'SHORT_PICKED';
  const isPending = item.status === 'PENDING';

  const handleIncrement = () => {
    const nextVal = item.totalPickedQuantity + 1;
    if (nextVal <= item.totalRequiredQuantity) {
      setInputVal(String(nextVal));
      onUpdateQuantityDirect(item.id, nextVal);
    }
  };

  const handleDecrement = () => {
    const nextVal = Math.max(0, item.totalPickedQuantity - 1);
    setInputVal(String(nextVal));
    if (nextVal < item.totalRequiredQuantity) {
      onRequestShortPickReason(item, nextVal);
    } else {
      onUpdateQuantityDirect(item.id, nextVal);
    }
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

    if (parsed >= item.totalRequiredQuantity) {
      setInputVal(String(item.totalRequiredQuantity));
      onUpdateQuantityDirect(item.id, item.totalRequiredQuantity);
    } else {
      onRequestShortPickReason(item, parsed);
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
          <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 bg-white border border-slate-200/90 px-2.5 py-1 rounded-md text-xs sm:text-sm shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="tracking-wide">{item.location.formattedCode}</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium hidden md:inline-flex items-center gap-1">
            Khu: <strong className="text-slate-700">{item.location.zone}</strong> • Dãy: <strong className="text-slate-700">{item.location.aisle}</strong> • Kệ: <strong className="text-slate-700">{item.location.rack}</strong> • Tầng: <strong className="text-slate-700">{item.location.shelf}</strong> • Ô: <strong className="text-slate-700">{item.location.bin}</strong>
          </span>
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
      <div className="p-4 space-y-3">
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

        {/* Lý do soạn thiếu (Vùng viền mờ dịu mắt, không dùng box vàng chói) */}
        {isShortPicked && item.shortPickReason && (
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-slate-800">Lý do soạn thiếu: </strong>
              <span className="text-slate-600">{item.shortPickReason}</span>
            </div>
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
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center h-[38px] border border-slate-200 rounded-lg bg-white shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={handleDecrement}
                className="w-10 h-full flex items-center justify-center text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
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
              className="h-[38px] px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Soạn đủ</span>
            </button>

            {/* Nút Báo thiếu */}
            <button
              type="button"
              onClick={() => onRequestShortPickReason(item, item.totalPickedQuantity)}
              className="h-[38px] px-3 rounded-lg border border-slate-200 hover:border-amber-300 bg-white hover:bg-amber-50 text-amber-700 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
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
