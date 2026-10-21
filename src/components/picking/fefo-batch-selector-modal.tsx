import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Sparkles,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Plus,
  Minus,
  HelpCircle,
} from 'lucide-react';
import {
  FEFO_OVERRIDE_REASONS,
  type FefoBatchItem,
  type SelectedBatchAllocation,
  type FefoOverrideReasonCode,
  type BatchExpiryStatus,
} from '../../types/fefo-picking.types';
import { fefoPickingService } from '../../services/fefo-picking.service';
import { showToast } from '../toast';

export interface FefoBatchSelectorModalProps {
  isOpen: boolean;
  warehouseId: string;
  productId: string;
  productName: string;
  productSku: string;
  unit?: string;
  requiredQuantity: number;
  currentAllocations?: SelectedBatchAllocation[];
  onClose: () => void;
  onConfirm: (
    selectedBatches: SelectedBatchAllocation[],
    isOverride: boolean,
    overrideReason?: string,
    overrideReasonCode?: string,
  ) => void;
}

export const FefoBatchSelectorModal: React.FC<FefoBatchSelectorModalProps> = ({
  isOpen,
  warehouseId,
  productId,
  productName,
  productSku,
  unit = 'hộp',
  requiredQuantity,
  currentAllocations = [],
  onClose,
  onConfirm,
}) => {
  const [batches, setBatches] = useState<FefoBatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  // Quản lý lý do ghi đè nếu chọn khác FEFO (Tiêu chí 2)
  const [overrideReasonCode, setOverrideReasonCode] = useState<FefoOverrideReasonCode | ''>('');
  const [customReasonNote, setCustomReasonNote] = useState<string>('');

  // Tải danh sách lô và tính gợi ý FEFO từ service
  const loadBatchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fefoPickingService.getFefoRecommendations(
        warehouseId,
        productId,
        requiredQuantity,
        productName,
      );

      setBatches(res.batches);

      // Nếu đã có phân bổ trước đó từ dòng hàng, nạp lại
      if (currentAllocations && currentAllocations.length > 0) {
        const initialMap: Record<string, number> = {};
        for (const item of currentAllocations) {
          initialMap[item.batchId] = item.quantity;
        }
        setAllocations(initialMap);
      } else {
        // Tự động áp dụng phân bổ theo đề xuất FEFO mặc định (Tiêu chí 1)
        const defaultMap: Record<string, number> = {};
        for (const b of res.batches) {
          if (b.suggestedQuantity > 0) {
            defaultMap[b.id] = b.suggestedQuantity;
          }
        }
        setAllocations(defaultMap);
      }
    } catch {
      showToast('error', 'Không thể nạp dữ liệu lô hàng FEFO');
    } finally {
      setLoading(false);
    }
  }, [warehouseId, productId, requiredQuantity, productName, currentAllocations]);

  useEffect(() => {
    if (isOpen) {
      loadBatchData();
    }
  }, [isOpen, loadBatchData]);

  // Tổng số lượng đã phân bổ hiện tại
  const totalAllocated = useMemo(() => {
    return Object.values(allocations).reduce((sum, qty) => sum + (qty || 0), 0);
  }, [allocations]);

  // Kiểm tra vi phạm FEFO (Override Detection - Tiêu chí 2)
  const isOverride = useMemo(() => {
    if (batches.length === 0) return false;
    const selectedList: SelectedBatchAllocation[] = batches.map((b) => ({
      batchId: b.id,
      batchNumber: b.batchNumber,
      quantity: allocations[b.id] || 0,
      expiryDate: b.expiryDate,
      daysUntilExpiry: b.daysUntilExpiry,
    }));
    return fefoPickingService.detectFefoOverride(batches, selectedList);
  }, [batches, allocations]);

  // 1-Chạm: Tự động phân bổ theo đề xuất FEFO chuẩn
  const handleApplyFefoOptimal = () => {
    const nextMap: Record<string, number> = {};
    let remaining = requiredQuantity;

    // Duyệt qua các lô đã sắp xếp theo expiry_date ASC
    for (const b of batches) {
      if (remaining > 0 && b.availableQuantity > 0) {
        const take = Math.min(b.availableQuantity, remaining);
        nextMap[b.id] = take;
        remaining -= take;
      } else {
        nextMap[b.id] = 0;
      }
    }

    setAllocations(nextMap);
    setOverrideReasonCode('');
    setCustomReasonNote('');
    showToast('success', 'Đã áp dụng tối ưu phân bổ theo nguyên tắc FEFO (Hạn dùng gần nhất)!');
  };

  // Điều chỉnh số lượng phân bổ cho từng lô
  const handleQuantityChange = (batchId: string, value: number, maxAvailable: number) => {
    const clamped = Math.max(0, Math.min(value, maxAvailable));
    setAllocations((prev) => ({
      ...prev,
      [batchId]: clamped,
    }));
  };

  // Badge màu sắc cho trạng thái hạn sử dụng
  const renderExpiryBadge = (status: BatchExpiryStatus, days: number) => {
    if (status === 'EXPIRED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 text-red-800 text-[11px] font-bold border border-red-200">
          <Clock className="w-3 h-3 text-red-600" /> Đã hết hạn ({days} ngày)
        </span>
      );
    }
    if (status === 'CRITICAL') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-200">
          <Clock className="w-3 h-3 text-rose-600" /> Cận date nguy cấp ({days} ngày)
        </span>
      );
    }
    if (status === 'WARNING') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" /> Cần ưu tiên xuất ({days} ngày)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-medium border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hạn xa an toàn ({days} ngày)
      </span>
    );
  };

  // Xác nhận phân bổ lô
  const handleConfirm = () => {
    // Tiêu chí 2: Bắt buộc lý do nếu chọn khác FEFO
    if (isOverride) {
      if (!overrideReasonCode) {
        showToast('error', 'Vui lòng chọn lý do giải trình khi xuất lô khác với đề xuất FEFO!');
        return;
      }
      if (overrideReasonCode === 'OTHER' && !customReasonNote.trim()) {
        showToast('error', 'Vui lòng nhập cụ thể lý do giải trình khi chọn "Lý do khác"!');
        return;
      }
    }

    if (totalAllocated === 0) {
      showToast('error', 'Vui lòng phân bổ số lượng ít nhất cho một lô hàng!');
      return;
    }

    const selectedList: SelectedBatchAllocation[] = [];
    for (const b of batches) {
      const qty = allocations[b.id] || 0;
      if (qty > 0) {
        selectedList.push({
          batchId: b.id,
          batchNumber: b.batchNumber,
          quantity: qty,
          expiryDate: b.expiryDate,
          daysUntilExpiry: b.daysUntilExpiry,
        });
      }
    }

    const reasonObj = FEFO_OVERRIDE_REASONS.find((r) => r.code === overrideReasonCode);
    const finalReasonText = reasonObj
      ? overrideReasonCode === 'OTHER'
        ? customReasonNote.trim()
        : customReasonNote.trim()
        ? `${reasonObj.label} (${customReasonNote.trim()})`
        : reasonObj.label
      : undefined;

    onConfirm(selectedList, isOverride, finalReasonText, overrideReasonCode || undefined);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-2xs">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {productSku}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                  Gợi ý FEFO (Hạn dùng gần nhất)
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug line-clamp-1">
                {productName}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thanh tóm tắt tiến độ phân bổ & Nút 1-chạm FEFO */}
        <div className="px-5 py-3 bg-indigo-50/50 border-b border-indigo-100/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-4 text-xs sm:text-sm">
            <div>
              <span className="text-slate-500 block text-[11px]">Yêu cầu soạn:</span>
              <span className="font-bold text-slate-800 text-sm sm:text-base">
                {requiredQuantity} <span className="text-xs font-normal text-slate-600">{unit}</span>
              </span>
            </div>
            <div className="h-7 w-px bg-slate-300 hidden sm:block" />
            <div>
              <span className="text-slate-500 block text-[11px]">Đã chọn theo lô:</span>
              <span
                className={`font-bold text-sm sm:text-base ${
                  totalAllocated === requiredQuantity
                    ? 'text-emerald-600'
                    : totalAllocated > requiredQuantity
                    ? 'text-rose-600'
                    : 'text-amber-600'
                }`}
              >
                {totalAllocated} / {requiredQuantity} {unit}
              </span>
            </div>
          </div>

          {/* Nút 1-chạm áp dụng đề xuất FEFO */}
          <button
            type="button"
            onClick={handleApplyFefoOptimal}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/30 transition-all cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
            Áp dụng đề xuất FEFO tối ưu
          </button>
        </div>

        {/* Nội dung danh sách lô hàng */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Đang phân tích hạn dùng và tính toán gợi ý FEFO...
            </div>
          ) : batches.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-sm">
              Không tìm thấy lô hàng nào còn tồn cho sản phẩm này trong kho.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                <span>DANH SÁCH LÔ HÀNG (SẮP XẾP HẠN DÙNG TĂNG DẦN - CẬN DATE LÊN TRƯỚC)</span>
                <span>Số lượng xuất ({unit})</span>
              </div>

              {batches.map((batch) => {
                const currentQty = allocations[batch.id] || 0;
                const isPartiallyPicked = currentQty > 0;
                const isRecommended = batch.isFefoRecommended;

                return (
                  <div
                    key={batch.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isPartiallyPicked
                        ? 'bg-indigo-50/40 border-indigo-300 ring-1 ring-indigo-400/20'
                        : isRecommended
                        ? 'bg-amber-50/30 border-amber-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Cột trái: Thông tin lô & Hạn dùng */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-extrabold text-slate-900 text-sm">
                            {batch.batchNumber}
                          </span>
                          {renderExpiryBadge(batch.expiryStatus, batch.daysUntilExpiry)}
                          {isRecommended && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold">
                              <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                              Gợi ý FEFO: {batch.suggestedQuantity} {unit}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            HSD: <strong className="text-slate-800">{batch.expiryDate}</strong> (NSX:{' '}
                            {batch.mfgDate})
                          </span>
                          {batch.locationCode && (
                            <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono">
                              <MapPin className="w-3 h-3 text-indigo-600" />
                              {batch.locationCode}
                            </span>
                          )}
                          <span>
                            Tồn khả dụng:{' '}
                            <strong className="text-slate-900 font-mono">
                              {batch.availableQuantity}
                            </strong>{' '}
                            {unit}
                          </span>
                        </div>
                      </div>

                      {/* Cột phải: Bộ chọn số lượng xuất cho lô */}
                      <div className="flex items-center justify-end gap-2">
                        <div className="flex items-center border border-slate-300 rounded-xl bg-white shadow-2xs overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityChange(batch.id, currentQty - 1, batch.availableQuantity)
                            }
                            disabled={currentQty <= 0}
                            className="w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={batch.availableQuantity}
                            value={currentQty}
                            onChange={(e) =>
                              handleQuantityChange(
                                batch.id,
                                parseInt(e.target.value, 10) || 0,
                                batch.availableQuantity,
                              )
                            }
                            className="w-14 h-9 text-center font-mono font-bold text-slate-900 text-sm focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityChange(batch.id, currentQty + 1, batch.availableQuantity)
                            }
                            disabled={currentQty >= batch.availableQuantity}
                            className="w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Nút nhặt toàn bộ số lượng có thể từ lô này */}
                        <button
                          type="button"
                          onClick={() => {
                            const needed = Math.max(0, requiredQuantity - totalAllocated + currentQty);
                            const fillQty = Math.min(batch.availableQuantity, needed > 0 ? needed : batch.availableQuantity);
                            handleQuantityChange(batch.id, fillQty, batch.availableQuantity);
                          }}
                          className="px-2.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                          title="Lấy tối đa"
                        >
                          Lấy hết
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TIÊU CHÍ 2: CẢNH BÁO BẮT BUỘC GIẢI TRÌNH NẾU CHỌN LÔ KHÁC VỚI GỢI Ý FEFO */}
          {isOverride && (
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-400 space-y-3 animate-in fade-in duration-200 shadow-xs">
              <div className="flex items-start gap-2.5 text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-amber-950">
                    Cảnh báo: Bạn đang chọn xuất lô khác với nguyên tắc FEFO (Hạn gần nhất)
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                    Theo quy chuẩn vận hành kho, các lô có hạn dùng gần hơn phải được xuất trước để tránh tồn đọng
                    hết hạn. <strong>Bắt buộc phải chọn lý do giải trình</strong> để hoàn tất xuất kho.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-amber-950">
                  Lý do không xuất theo đề xuất FEFO <span className="text-rose-600">*</span>
                </label>
                <select
                  value={overrideReasonCode}
                  onChange={(e) => setOverrideReasonCode(e.target.value as FefoOverrideReasonCode)}
                  className="w-full text-xs sm:text-sm bg-white border border-amber-300 rounded-xl px-3 py-2.5 text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                >
                  <option value="">-- Chọn lý do giải trình chuẩn hóa --</option>
                  {FEFO_OVERRIDE_REASONS.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.label}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <textarea
                    rows={2}
                    placeholder={
                      overrideReasonCode === 'OTHER'
                        ? 'Bắt buộc ghi rõ lý do chi tiết để chuyển bộ phận kiểm soát chất lượng...'
                        : 'Ghi chú bổ sung (tùy chọn)...'
                    }
                    value={customReasonNote}
                    onChange={(e) => setCustomReasonNote(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                  {overrideReasonCode === 'OTHER' && !customReasonNote.trim() && (
                    <span className="text-[11px] text-rose-600 font-semibold block mt-0.5">
                      * Cần ghi rõ lý do khi chọn trường hợp Khác
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer hành động */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Nguyên tắc FEFO: Lô có hạn dùng gần hơn ưu tiên xuất trước</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={
                totalAllocated === 0 ||
                (isOverride && !overrideReasonCode) ||
                (isOverride && overrideReasonCode === 'OTHER' && !customReasonNote.trim())
              }
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Xác nhận xuất lô ({totalAllocated} {unit})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
