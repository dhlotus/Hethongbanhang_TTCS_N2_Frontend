import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export interface ItemInspectionState {
  itemId: string;
  sku: string;
  productName: string;
  unit: string;
  transferQuantity: number;
  conversionRate: number;
  baseUnit: string;
  receivedQuantity: number;
  discrepancyReason: string;
}


interface DiscrepancyCheckTableProps {
  inspections: ItemInspectionState[];
  generalDiscrepancyReason: string;
  onSetAllFull: () => void;
  onQuantityChange: (index: number, val: number) => void;
  onReasonChange: (index: number, reason: string) => void;
}

/**
 * Component bảng kiểm đếm thực nhận và ghi nhận lý do chênh lệch (SN-181)
 */
export const DiscrepancyCheckTable: React.FC<DiscrepancyCheckTableProps> = ({
  inspections,
  generalDiscrepancyReason,
  onSetAllFull,
  onQuantityChange,
  onReasonChange,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Kiểm đếm hàng hóa thực nhận
          </h4>
          <p className="text-[11px] text-slate-500">
            Nhập số lượng thực nhận tại kho đến — Nếu có chênh lệch, bắt buộc nhập lý do
          </p>
        </div>
        <button
          type="button"
          onClick={onSetAllFull}
          className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Điền nhận đủ tất cả
        </button>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-10 text-center">STT</th>
                <th className="py-2.5 px-3 min-w-[200px]">Sản phẩm & SKU</th>
                <th className="py-2.5 px-3 w-28 text-center">Đơn vị</th>
                <th className="py-2.5 px-3 w-28 text-right">SL gửi</th>
                <th className="py-2.5 px-3 w-36 text-right">SL thực nhận</th>
                <th className="py-2.5 px-3 w-32 text-center">Chênh lệch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {inspections.map((item, index) => {
                const diff = item.transferQuantity - item.receivedQuantity;
                const hasDiff = diff !== 0;
                const isMissingReason =
                  hasDiff &&
                  !item.discrepancyReason.trim() &&
                  !generalDiscrepancyReason.trim();

                return (
                  <React.Fragment key={item.itemId}>
                    <tr className={`hover:bg-slate-50/60 ${hasDiff ? 'bg-amber-50/30' : ''}`}>
                      <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {index + 1}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{item.productName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          SKU: {item.sku}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600 font-medium">
                        {item.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-700">
                        {item.transferQuantity}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <input
                          type="number"
                          min={0}
                          value={item.receivedQuantity}
                          onChange={(e) =>
                            onQuantityChange(index, Number(e.target.value) || 0)
                          }
                          className={`w-28 text-right text-xs font-bold px-2.5 py-1.5 border rounded-lg outline-none transition-all ${
                            hasDiff
                              ? 'border-amber-400 bg-white text-amber-800 focus:ring-2 focus:ring-amber-400'
                              : 'border-slate-300 bg-white text-slate-800 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]'
                          }`}
                        />
                      </td>
                      <td className="py-3 px-3 text-center">
                        {diff === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Nhận đủ
                          </span>
                        ) : diff > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3 h-3" /> Thiếu {diff} {item.unit}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3 h-3" /> Thừa {Math.abs(diff)} {item.unit}
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* HÀNG NHẬP LÝ DO CHÊNH LỆCH KHI CÓ SAI LỆCH */}
                    {hasDiff && (
                      <tr className="bg-amber-50/50 border-b border-amber-200/70">
                        <td colSpan={6} className="py-2.5 px-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Lý do</span>
                                <span className="text-rose-600 font-bold">*</span>:
                              </label>
                            </div>
                            <textarea
                              rows={2}
                              value={item.discrepancyReason}
                              onChange={(e) => onReasonChange(index, e.target.value)}
                              placeholder="Ví dụ: Vỡ hỏng 2 chai khi xe chở rung lắc, Giao thiếu 1 thùng từ kho xuất..."
                              className={`w-full text-xs px-3 py-2 bg-white border rounded-lg outline-none transition-all placeholder:text-slate-400 resize-none ${
                                isMissingReason
                                  ? 'border-amber-400 focus:ring-2 focus:ring-amber-400'
                                  : 'border-slate-300 focus:border-[var(--color-primary)]'
                              }`}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
