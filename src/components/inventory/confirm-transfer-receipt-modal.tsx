import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Building2,
  ArrowRight,
  Info,
  Calendar,
  User,
} from 'lucide-react';
import { ModalLayout } from '../modal-layout';
import { showToast } from '../toast';
import { internalTransfersService } from '../../services/internal-transfers.service';
import { DiscrepancyCheckTable } from './discrepancy-check-table';
import type { ItemInspectionState } from './discrepancy-check-table';
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

export const ConfirmTransferReceiptModal: React.FC<ConfirmTransferReceiptModalProps> = ({
  isOpen,
  transfer,
  onClose,
  onSuccess,
}) => {
  const [inspections, setInspections] = useState<ItemInspectionState[]>([]);
  const [generalDiscrepancyReason, setGeneralDiscrepancyReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [prevTransferId, setPrevTransferId] = useState<string | null>(null);

  // Đồng bộ dữ liệu khi transfer thay đổi hoặc modal mở ra theo chuẩn React
  if (isOpen && transfer && transfer.id !== prevTransferId) {
    setPrevTransferId(transfer.id);
    setInspections(
      transfer.items.map((item) => ({
        itemId: item.id,
        sku: item.sku,
        productName: item.productName,
        unit: item.unit,
        transferQuantity: item.transferQuantity,
        conversionRate: item.conversionRate,
        baseUnit: item.baseUnit,
        receivedQuantity:
          item.receivedQuantity != null ? item.receivedQuantity : item.transferQuantity,
        discrepancyReason: item.discrepancyReason || '',
      })),
    );
    setGeneralDiscrepancyReason(transfer.discrepancyReason || '');
    setNotes(transfer.notes || '');
  }

  if (!isOpen && prevTransferId !== null) {
    setPrevTransferId(null);
  }

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
      title={`Xác Nhận Nhận Hàng Chuyển Kho #${transfer.code}`}
      subtitle={`Thủ kho nhận hàng kiểm đếm thực tế đối chiếu với số lượng xuất chuyển`}
      icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
      maxWidth="max-w-4xl"
      banner={
        <div className="bg-emerald-50/80 border-b border-emerald-200/70 px-6 py-2.5 flex items-start gap-3 text-xs text-emerald-900">
          <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <div className="leading-relaxed">
            <span className="font-semibold text-emerald-950">Quy tắc nhập tồn:</span> Chỉ số lượng <strong>thực tế nhận được</strong> mới được cộng vào tồn kho của <strong>{transfer.toWarehouseName}</strong>. Mọi chênh lệch thiếu/thừa/hỏng hóc sẽ được lưu vết vào biên bản điều chuyển.
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500">
            {summary.hasDiscrepancy ? (
              <span className="text-rose-600 font-semibold">
                Phát hiện chênh lệch: Gửi {summary.totalTransferred} — Thực nhận {summary.totalReceived}
              </span>
            ) : (
              <span className="text-emerald-700 font-semibold">
                Khớp 100% số lượng gửi ({summary.totalTransferred} mặt hàng)
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
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || summary.missingReasonCount > 0}
              className={`px-5 py-2 text-xs font-bold text-white rounded-lg shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                summary.hasDiscrepancy
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {submitting
                ? 'Đang xử lý...'
                : summary.hasDiscrepancy
                ? 'Xác Nhận Nhập Kho (Có chênh lệch)'
                : 'Xác Nhận Nhận Đủ 100%'}
            </button>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-6">
        {/* KHỐI 1: THÔNG TIN PHIẾU CHUYỂN KHO */}
        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Tuyến điều chuyển
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>{transfer.fromWarehouseName}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[var(--color-primary)]">{transfer.toWarehouseName}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Thời gian xuất & Người tạo
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>
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
        <DiscrepancyCheckTable
          inspections={inspections}
          generalDiscrepancyReason={generalDiscrepancyReason}
          onSetAllFull={handleSetAllFull}
          onQuantityChange={handleQuantityChange}
          onReasonChange={handleReasonChange}
        />

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
