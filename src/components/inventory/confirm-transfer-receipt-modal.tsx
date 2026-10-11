import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  PackageCheck,
  Building2,
  ArrowRight,
  Info,
  Calendar,
  User,
  AlertCircle,
} from 'lucide-react';
import { ModalLayout } from '../modal-layout';
import { showToast } from '../toast';
import { internalTransfersService } from '../../services/internal-transfers.service';
import type {
  ConfirmTransferReceiptPayload,
  InternalTransfer,
} from '../../types/internal-transfer.types';

interface ConfirmTransferReceiptModalProps {
  isOpen: boolean;
  transfer: InternalTransfer | null;
  onClose: () => void;
  onSuccess: (updated: InternalTransfer) => void;
}

interface ItemInspectionState {
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

const COMMON_REASONS = [
  'Vỡ hỏng khi vận chuyển',
  'Giao thiếu so với phiếu',
  'Giao thừa so với phiếu',
  'Rách bao bì / Biến dạng hộp',
  'Hàng cận date không đạt chuẩn',
  'Hao hụt tự nhiên trong chuyên chở',
];

export const ConfirmTransferReceiptModal: React.FC<ConfirmTransferReceiptModalProps> = ({
  isOpen,
  transfer,
  onClose,
  onSuccess,
}) => {
  const [inspections, setInspections] = useState<ItemInspectionState[]>(() => {
    if (!transfer) return [];
    return transfer.items.map((item) => ({
      itemId: item.id,
      sku: item.sku,
      productName: item.productName,
      unit: item.unit,
      transferQuantity: item.transferQuantity,
      conversionRate: item.conversionRate,
      baseUnit: item.baseUnit,
      receivedQuantity: item.receivedQuantity !== undefined ? item.receivedQuantity : item.transferQuantity,
      discrepancyReason: item.discrepancyReason || '',
    }));
  });
  const [generalDiscrepancyReason, setGeneralDiscrepancyReason] = useState<string>(
    () => transfer?.discrepancyReason || '',
  );
  const [notes, setNotes] = useState<string>(() => transfer?.notes || '');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Cập nhật số lượng thực nhận
  const handleQuantityChange = (index: number, val: number) => {
    setInspections((prev) => {
      const clone = [...prev];
      clone[index] = {
        ...clone[index],
        receivedQuantity: Math.max(0, val),
      };
      return clone;
    });
  };

  // Cập nhật lý do chênh lệch
  const handleReasonChange = (index: number, reason: string) => {
    setInspections((prev) => {
      const clone = [...prev];
      clone[index] = {
        ...clone[index],
        discrepancyReason: reason,
      };
      return clone;
    });
  };

  // Chọn lý do nhanh từ gợi ý
  const handleSelectQuickReason = (index: number, reason: string) => {
    handleReasonChange(index, reason);
  };

  // Tính toán tổng quan chênh lệch
  const summary = useMemo(() => {
    let hasDiscrepancy = false;
    let totalTransferred = 0;
    let totalReceived = 0;
    let missingReasonCount = 0;

    inspections.forEach((item) => {
      totalTransferred += item.transferQuantity;
      totalReceived += item.receivedQuantity;
      const diff = item.transferQuantity - item.receivedQuantity;
      if (diff !== 0) {
        hasDiscrepancy = true;
        if (!item.discrepancyReason.trim() && !generalDiscrepancyReason.trim()) {
          missingReasonCount++;
        }
      }
    });

    return {
      hasDiscrepancy,
      totalTransferred,
      totalReceived,
      missingReasonCount,
    };
  }, [inspections, generalDiscrepancyReason]);

  // Nút nhận đủ 100% nhanh
  const handleSetAllFull = () => {
    setInspections((prev) =>
      prev.map((i) => ({
        ...i,
        receivedQuantity: i.transferQuantity,
        discrepancyReason: '',
      })),
    );
  };

  // Submit xác nhận nhận hàng
  const handleSubmit = async () => {
    if (!transfer) return;

    if (summary.missingReasonCount > 0) {
      showToast(
        'error',
        'Có mặt hàng chênh lệch chưa nhập lý do. Vui lòng nhập đầy đủ lý do chênh lệch!',
      );
      return;
    }

    try {
      setSubmitting(true);
      const payload: ConfirmTransferReceiptPayload = {
        items: inspections.map((i) => ({
          itemId: i.itemId,
          receivedQuantity: Number(i.receivedQuantity),
          discrepancyReason: i.discrepancyReason.trim(),
        })),
        generalDiscrepancyReason: generalDiscrepancyReason.trim(),
        notes: notes.trim(),
      };

      const updated = await internalTransfersService.confirmReceipt(transfer.id, payload);
      showToast(
        'success',
        summary.hasDiscrepancy
          ? `Đã xác nhận nhập kho phiếu ${updated.code} (Ghi nhận có chênh lệch)`
          : `Đã xác nhận nhận đủ 100% phiếu ${updated.code}. Tồn kho đã được cộng!`,
      );
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi khi xác nhận nhận hàng';
      showToast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!transfer) return null;

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title={`Xác Nhận Nhận Hàng — Phiếu ${transfer.code}`}
      subtitle="Thủ kho kiểm đếm thực nhận và ghi nhận số liệu chính xác vào kho đến"
      icon={<PackageCheck className="w-5 h-5 text-[var(--color-primary)]" />}
      maxWidth="max-w-4xl"
      banner={
        <div className="bg-emerald-50/90 border-b border-emerald-200/80 px-6 py-2.5 flex items-start gap-3 text-xs text-emerald-800">
          <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <div className="leading-relaxed">
            <span className="font-semibold text-emerald-900">Quy tắc cộng tồn kho đến:</span> Khi xác nhận, hệ thống chỉ cộng tồn kho tại kho đến đúng bằng <strong>Số lượng thực nhận</strong>. Nếu có chênh lệch thừa/thiếu, <strong>bắt buộc phải nhập lý do</strong> để lưu vết kế toán &amp; sổ kho.
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs">
            {summary.hasDiscrepancy ? (
              <span className="inline-flex items-center gap-1.5 text-rose-600 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                Phát hiện chênh lệch ({summary.totalReceived} / {summary.totalTransferred})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Kiểm đếm nhận đủ 100% ({summary.totalTransferred} đơn vị)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || summary.missingReasonCount > 0}
              className="px-5 py-2 text-xs font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {submitting ? 'Đang cập nhật tồn...' : 'Xác Nhận & Nhập Kho Đến'}
            </button>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-6">
        {/* KHỐI 1: THÔNG TIN PHIẾU CHUYỂN */}
        <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Tuyến chuyển */}
            <div className="md:col-span-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Tuyến đường điều chuyển
              </div>
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <div className="flex items-center gap-1 text-slate-600">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{transfer.fromWarehouseName}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex items-center gap-1 text-[var(--color-primary)] font-bold">
                  <Building2 className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                  <span>{transfer.toWarehouseName}</span>
                </div>
              </div>
            </div>

            {/* Thông tin xuất */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Thông tin xuất kho
              </div>
              <div className="text-slate-600 space-y-0.5 text-[11px]">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>
                    Xuất lúc:{' '}
                    {transfer.transferredAt
                      ? new Date(transfer.transferredAt).toLocaleString('vi-VN')
                      : new Date(transfer.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>Người xuất: {transfer.createdByName || 'Thủ kho'}</span>
                </div>
              </div>
            </div>
          </div>

          {transfer.notes && (
            <div className="mt-3 pt-3 border-t border-slate-200/70 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Ghi chú xuất kho:</span> {transfer.notes}
            </div>
          )}
        </div>

        {/* KHỐI 2: BẢNG KIỂM ĐẾM THỰC NHẬN TỪNG MẶT HÀNG */}
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
              onClick={handleSetAllFull}
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
                    const isMissingReason = hasDiff && !item.discrepancyReason.trim() && !generalDiscrepancyReason.trim();

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
                            <div className="text-[10px] text-slate-400">
                              (x{item.conversionRate} {item.baseUnit})
                            </div>
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
                                handleQuantityChange(index, Number(e.target.value) || 0)
                              }
                              className={`w-28 text-right text-xs font-bold px-2.5 py-1.5 border rounded-lg outline-none transition-all ${
                                hasDiff
                                  ? 'border-rose-400 bg-white text-rose-700 focus:ring-2 focus:ring-rose-400'
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
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
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
                          <tr className="bg-rose-50/50 border-b border-rose-100">
                            <td colSpan={6} className="py-2.5 px-4">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <label className="text-[11px] font-bold text-rose-800 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                    Lý do chênh lệch cho sản phẩm "{item.productName}" <span className="text-rose-600">*</span>:
                                  </label>
                                  {isMissingReason && (
                                    <span className="text-[11px] text-rose-600 font-semibold animate-pulse">
                                      Bắt buộc phải nhập lý do!
                                    </span>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  value={item.discrepancyReason}
                                  onChange={(e) => handleReasonChange(index, e.target.value)}
                                  placeholder="Ví dụ: Vỡ hỏng 2 chai khi xe chở rung lắc, Giao thiếu 1 thùng từ kho xuất..."
                                  className={`w-full text-xs px-3 py-1.5 bg-white border rounded-lg outline-none transition-all placeholder:text-slate-400 ${
                                    isMissingReason
                                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-400'
                                      : 'border-slate-300 focus:border-[var(--color-primary)]'
                                  }`}
                                />
                                {/* Gợi ý lý do nhanh */}
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                  <span className="text-[10px] text-slate-500 font-semibold self-center">
                                    Gợi ý nhanh:
                                  </span>
                                  {COMMON_REASONS.map((reason) => (
                                    <button
                                      key={reason}
                                      type="button"
                                      onClick={() => handleSelectQuickReason(index, reason)}
                                      className="text-[10px] font-medium px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md transition-colors cursor-pointer"
                                    >
                                      {reason}
                                    </button>
                                  ))}
                                </div>
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

        {/* KHỐI 3: LÝ DO CHÊNH LỆCH CHUNG & GHI CHÚ */}
        {summary.hasDiscrepancy && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lý do chênh lệch chung của cả biên bản (nếu áp dụng chung)
            </label>
            <input
              type="text"
              value={generalDiscrepancyReason}
              onChange={(e) => setGeneralDiscrepancyReason(e.target.value)}
              placeholder="Ví dụ: Sự cố xe tải giao hàng trong chuyến chở hàng ngày 11/10..."
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all placeholder:text-slate-400"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Ghi chú nhận hàng / Biên bản kiểm nghiệm
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Thông tin bàn giao, người vận chuyển hoặc lưu ý lưu kho..."
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all placeholder:text-slate-400"
          />
        </div>
      </div>
    </ModalLayout>
  );
};
