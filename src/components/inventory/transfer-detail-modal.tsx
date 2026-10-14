import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  XCircle,
  FileText,
  Truck,
} from 'lucide-react';
import { ModalLayout } from '../modal-layout';
import { TransferPrintModal } from './transfer-print-modal';
import type { InternalTransfer } from '../../types/internal-transfer.types';

interface TransferDetailModalProps {
  isOpen: boolean;
  transfer: InternalTransfer | null;
  onClose: () => void;
  onConfirmReceipt?: (transfer: InternalTransfer) => void;
}

export const TransferDetailModal: React.FC<TransferDetailModalProps> = ({
  isOpen,
  transfer,
  onClose,
  onConfirmReceipt,
}) => {
  const [printModalOpen, setPrintModalOpen] = useState(false);

  if (!transfer) return null;

  const getStatusBadge = () => {
    switch (transfer.status) {
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Truck className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            Đang trên đường (Chưa cộng kho đến)
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Đã nhận đủ 100% (Đã cộng kho đến)
          </span>
        );
      case 'PARTIALLY_RECEIVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Nhận có chênh lệch
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Bản nháp
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-300">
            <XCircle className="w-3.5 h-3.5 text-slate-400" />
            Đã hủy
          </span>
        );
      default:
        return null;
    }
  };

  const handlePrint = () => {
    setPrintModalOpen(true);
  };

  return (
    <>
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title={`Chi Tiết Phiếu Chuyển Kho — ${transfer.code}`}
      subtitle="Biên bản điều chuyển hàng hóa nội bộ hệ thống phân phối LOHA SALES"
      icon={<FileText className="w-5 h-5 text-[var(--color-primary)]" />}
      badge={getStatusBadge()}
      maxWidth="max-w-4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            In phiếu điều chuyển
          </button>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Đóng
            </button>
            {transfer.status === 'IN_TRANSIT' && onConfirmReceipt && (
              <button
                type="button"
                onClick={() => onConfirmReceipt(transfer)}
                className="px-5 py-2 text-xs font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Xác nhận nhận hàng tại kho đến
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-6">
        {/* LỘ TRÌNH ĐIỀU CHUYỂN */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Kho xuất hàng (Kho đi)
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {transfer.fromWarehouseName}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <User className="w-3 h-3 text-slate-400" /> {transfer.createdByName || 'Thủ kho'}
                  <span className="mx-1">•</span>
                  <Calendar className="w-3 h-3 text-slate-400" />{' '}
                  {new Date(transfer.createdAt).toLocaleString('vi-VN')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-light)] border border-[var(--color-primary-subtle)] flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Kho nhận hàng (Kho đến)
                </div>
                <div className="text-sm font-bold text-[var(--color-primary)]">
                  {transfer.toWarehouseName}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                  {transfer.receivedAt ? (
                    <>
                      <User className="w-3 h-3 text-slate-400" /> {transfer.receivedByName || 'Thủ kho nhận'}
                      <span className="mx-1">•</span>
                      <Calendar className="w-3 h-3 text-slate-400" />{' '}
                      {new Date(transfer.receivedAt).toLocaleString('vi-VN')}
                    </>
                  ) : (
                    <span className="text-amber-600 font-semibold italic">
                      Đang chờ kho đến kiểm đếm và nhận hàng
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {transfer.notes && (
            <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600">
              <strong className="text-slate-700">Mục đích / Ghi chú:</strong> {transfer.notes}
            </div>
          )}

          {transfer.discrepancyReason && (
            <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
              <strong className="text-rose-900 flex items-center gap-1.5 mb-0.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Lý do chênh lệch khi nhận hàng:
              </strong>
              {transfer.discrepancyReason}
            </div>
          )}
        </div>

        {/* BẢNG CHI TIẾT HÀNG HÓA */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
            Chi tiết mặt hàng ({transfer.items.length})
          </h4>
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-10 text-center">STT</th>
                  <th className="py-2.5 px-3">Sản phẩm & SKU</th>
                  <th className="py-2.5 px-3 text-center">ĐVT</th>
                  <th className="py-2.5 px-3 text-right">SL chuyển</th>
                  <th className="py-2.5 px-3 text-right">Quy đổi cơ sở</th>
                  <th className="py-2.5 px-3 text-right">SL thực nhận</th>
                  <th className="py-2.5 px-3 text-center">Chênh lệch</th>
                  <th className="py-2.5 px-3">Lý do chênh lệch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {transfer.items.map((item, idx) => {
                  const hasDiscrepancy = (item.discrepancyQuantity ?? 0) !== 0;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/60 ${hasDiscrepancy ? 'bg-rose-50/20' : ''}`}
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{item.productName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{item.sku}</div>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600 font-medium">
                        {item.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800">
                        {item.transferQuantity}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        <span className="font-semibold">{item.baseTransferQuantity}</span>{' '}
                        <span className="text-[11px] text-slate-400">{item.baseUnit}</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {item.receivedQuantity != null ? (
                          <span
                            className={`font-bold ${
                              hasDiscrepancy ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            {item.receivedQuantity}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Chưa nhận</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.discrepancyQuantity == null ? (
                          <span className="text-slate-400">—</span>
                        ) : item.discrepancyQuantity === 0 ? (
                          <span className="text-emerald-600 font-semibold">Khớp 100%</span>
                        ) : item.discrepancyQuantity > 0 ? (
                          <span className="text-rose-600 font-bold">
                            Thiếu {item.discrepancyQuantity} {item.unit}
                          </span>
                        ) : (
                          <span className="text-amber-600 font-bold">
                            Thừa {Math.abs(item.discrepancyQuantity)} {item.unit}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {item.discrepancyReason ? (
                          <span className="text-rose-700 font-medium text-[11px] bg-rose-50 px-2 py-0.5 rounded border border-rose-200 block">
                            {item.discrepancyReason}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ModalLayout>

    <TransferPrintModal
      isOpen={printModalOpen}
      transfer={transfer}
      onClose={() => setPrintModalOpen(false)}
    />
    </>
  );
};
