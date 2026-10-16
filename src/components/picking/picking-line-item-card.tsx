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
      className={`rounded-2xl border transition-all overflow-hidden ${
        isCompleted
          ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-500/20 shadow-xs'
          : isShortPicked
          ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-500/20 shadow-xs'
          : 'bg-white border-slate-200/90 shadow-sm hover:border-slate-300'
      }`}
    >
      {/* 1. Header vị trí & thứ tự bước nhặt theo đường đi */}
      <div className="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-white font-mono font-bold text-[11px]">
            Bước #{item.stepNumber}
          </span>
          <div className="flex items-center gap-1.5 font-bold text-indigo-900 bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 rounded-lg">
            <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="font-mono text-xs sm:text-sm tracking-wide">
              {item.location.formattedCode}
            </span>
          </div>
        </div>

        {/* Trạng thái dòng */}
        {isCompleted && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Đã soạn đủ
          </span>
        )}
        {isShortPicked && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Soạn thiếu ({item.totalPickedQuantity}/{item.totalRequiredQuantity})
          </span>
        )}
        {isPending && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 font-semibold text-xs">
            Chờ soạn
          </span>
        )}
      </div>

      {/* 2. Thân thẻ thông tin sản phẩm */}
      <div className="p-4 space-y-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                SKU: {item.productSku}
              </span>
              <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug mt-0.5">
                {item.productName}
              </h4>
            </div>
            {item.category && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium shrink-0 hidden sm:inline-block">
                {item.category}
              </span>
            )}
          </div>

          {/* Vị trí chi tiết kho: Khu vực - Dãy - Kệ - Tầng - Ô */}
          <div className="mt-2 flex items-center gap-1.5 flex-wrap text-[11px] text-slate-600 font-medium">
            <span className="bg-slate-100 px-2 py-0.5 rounded">Khu: <strong>{item.location.zone}</strong></span>
            <span className="bg-slate-100 px-2 py-0.5 rounded">Dãy: <strong>{item.location.aisle}</strong></span>
            <span className="bg-slate-100 px-2 py-0.5 rounded">Kệ: <strong>{item.location.rack}</strong></span>
            <span className="bg-slate-100 px-2 py-0.5 rounded">Tầng: <strong>{item.location.shelf}</strong></span>
            <span className="bg-slate-100 px-2 py-0.5 rounded">Ô: <strong>{item.location.bin}</strong></span>
          </div>
        </div>

        {/* Cảnh báo lý do soạn thiếu nếu có */}
        {isShortPicked && item.shortPickReason && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/90 text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block">Lý do soạn thiếu:</strong>
              <span className="text-amber-800">{item.shortPickReason}</span>
            </div>
          </div>
        )}

        {/* 3. Khu vực thao tác số lượng thực soạn (Tối ưu cảm ứng mobile) */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Thông tin số lượng yêu cầu */}
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <span>Yêu cầu lấy:</span>
            <span className="font-mono text-base font-extrabold text-slate-900">
              {item.totalRequiredQuantity}
            </span>
            <span className="font-medium text-slate-500">{item.unit}</span>
            {item.orders.length > 1 && (
              <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                Gộp {item.orders.length} đơn
              </span>
            )}
          </div>

          {/* Bộ điều khiển số lượng thực soạn */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-slate-300 rounded-xl bg-white shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={handleDecrement}
                className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
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
                className="w-14 h-10 text-center font-mono font-bold text-slate-900 text-sm focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleIncrement}
                disabled={item.totalPickedQuantity >= item.totalRequiredQuantity}
                className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
              className="h-10 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              Soạn đủ
            </button>

            {/* Nút Báo thiếu */}
            <button
              type="button"
              onClick={() => onRequestShortPickReason(item, item.totalPickedQuantity)}
              className="h-10 px-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-800 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
              title="Ghi nhận lý do soạn thiếu"
            >
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              Báo thiếu
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
              <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs animate-in fade-in duration-150">
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
