/**
 * SN-198: Modal Xác nhận Giao hàng thành công hoặc Báo giao không thành công
 * - Giao thành công: ghi nhận người nhận, thời điểm giao, tải ảnh biên bản chữ ký
 * - Giao không thành công: chọn lý do, hàng quay về kho (trạng thái PACKED)
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  ImagePlus,
  X,
  Loader2,
  AlertCircle,
  User,
  Clock,
  FileImage,
  TriangleAlert,
} from 'lucide-react';
import {
  shipmentsService,
  type Shipment,
  type ConfirmDeliveryPayload,
  type ReportFailedDeliveryPayload,
} from '../services/shipments.service';
import { showToast } from './toast';

const FAILURE_REASONS = [
  'Không có người nhận hàng tại địa chỉ giao',
  'Địa chỉ giao hàng không chính xác / không tìm được',
  'Khách hàng / Đại lý từ chối nhận hàng',
  'Hàng bị hư hỏng trong quá trình vận chuyển',
  'Điều kiện giao hàng không đảm bảo (thời tiết, đường xá)',
  'Lý do khác',
];

interface Props {
  shipment: Shipment;
  onClose: () => void;
  onDone: (updated: Shipment) => void;
}

type Mode = 'SUCCESS' | 'FAILED';

export const ConfirmDeliveryModal: React.FC<Props> = ({ shipment, onClose, onDone }) => {
  const [mode, setMode] = useState<Mode>('SUCCESS');
  const [submitting, setSubmitting] = useState(false);

  // --- Success form state ---
  const [receiverName, setReceiverName] = useState(shipment.receiverName ?? '');
  const [deliveredAt, setDeliveredAt] = useState(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now.toISOString().slice(0, 16);
  });
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofBase64, setProofBase64] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState('');

  // --- Failed form state ---
  const [failureReason, setFailureReason] = useState('');
  const [failureNote, setFailureNote] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Ảnh không được vượt quá 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Vui lòng chọn file ảnh (JPG, PNG, WEBP...)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setProofPreview(dataUrl);
      setProofBase64(dataUrl);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveImage = useCallback(() => {
    setProofPreview(null);
    setProofBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'SUCCESS') {
      if (!receiverName.trim()) {
        showToast('error', 'Vui lòng nhập tên người nhận hàng');
        return;
      }
      if (!deliveredAt) {
        showToast('error', 'Vui lòng chọn thời điểm giao hàng');
        return;
      }
      try {
        setSubmitting(true);
        const payload: ConfirmDeliveryPayload = {
          receiverName: receiverName.trim(),
          deliveredAt: new Date(deliveredAt).toISOString(),
          proofOfDeliveryUrl: proofBase64 ?? undefined,
          note: successNote.trim() || undefined,
        };
        const updated = await shipmentsService.confirmDelivery(shipment.id, payload);
        showToast('success', `Đã xác nhận giao hàng thành công cho phiếu ${shipment.id}`);
        onDone(updated);
      } catch (err) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        showToast('error', msg ?? 'Lỗi khi xác nhận giao hàng');
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!failureReason) {
        showToast('error', 'Vui lòng chọn lý do giao hàng không thành công');
        return;
      }
      try {
        setSubmitting(true);
        const payload: ReportFailedDeliveryPayload = {
          failureReason,
          note: failureNote.trim() || undefined,
        };
        const updated = await shipmentsService.reportFailedDelivery(shipment.id, payload);
        showToast('success', 'Đã ghi nhận giao không thành công — hàng quay về kho');
        onDone(updated);
      } catch (err) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        showToast('error', msg ?? 'Lỗi khi báo giao không thành công');
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900">Xác nhận Kết quả Giao hàng</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Phiếu{' '}
              <span className="font-mono font-semibold text-indigo-700">{shipment.id}</span>
              {' — '}
              Đơn{' '}
              <span className="font-mono font-semibold text-slate-700">{shipment.orderCode}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="px-5 pt-4 shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('SUCCESS')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 h-[38px] px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                mode === 'SUCCESS'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              Giao thành công
            </button>
            <button
              type="button"
              onClick={() => setMode('FAILED')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 h-[38px] px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                mode === 'FAILED'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <XCircle className="w-3.5 h-3.5 shrink-0" />
              Giao không thành công
            </button>
          </div>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {mode === 'SUCCESS' ? (
            <>
              {/* Receiver Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1 h-5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Tên người nhận hàng
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="Người ký biên nhận tại đại lý..."
                  className="w-full h-[38px] px-3 text-xs border border-slate-200 rounded-lg bg-slate-50/60 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Delivered At */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1 h-5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Thời điểm giao hàng
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={deliveredAt}
                  onChange={(e) => setDeliveredAt(e.target.value)}
                  max={new Date().toISOString().slice(0, 16)}
                  className="w-full h-[38px] px-3 text-xs border border-slate-200 rounded-lg bg-slate-50/60 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Proof Image */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1 h-5">
                  <FileImage className="w-3.5 h-3.5 text-slate-400" />
                  Ảnh biên bản có chữ ký
                </label>

                {proofPreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                    <img
                      src={proofPreview}
                      alt="Ảnh biên bản giao hàng"
                      className="w-full max-h-48 object-contain"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 p-1 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors cursor-pointer"
                      title="Xóa ảnh"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 border-2 border-dashed border-slate-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
                  >
                    <ImagePlus className="w-6 h-6 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    <span className="text-xs text-slate-400 group-hover:text-indigo-600 transition-colors">
                      Bấm để tải ảnh biên bản / chữ ký (tối đa 5MB)
                    </span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 h-5 flex items-center">
                  Ghi chú thêm
                </label>
                <textarea
                  value={successNote}
                  onChange={(e) => setSuccessNote(e.target.value)}
                  rows={2}
                  placeholder="Ghi chú về quá trình giao hàng (tuỳ chọn)..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/60 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none"
                />
              </div>

              {/* Info banner */}
              <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-800">
                  Xác nhận giao thành công sẽ chuyển phiếu sang{' '}
                  <strong>Giao thành công (DELIVERED)</strong> và kích hoạt phát hành hoá đơn.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Failure Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1 h-5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  Lý do giao không thành công
                  <span className="text-rose-500">*</span>
                </label>
                <select
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  className="w-full h-[38px] px-3 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-2xs"
                >
                  <option value="">— Chọn lý do —</option>
                  {FAILURE_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Failure Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 h-5 flex items-center">
                  Mô tả chi tiết
                </label>
                <textarea
                  value={failureNote}
                  onChange={(e) => setFailureNote(e.target.value)}
                  rows={3}
                  placeholder="Mô tả tình huống thực tế khi giao hàng..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/60 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none"
                />
              </div>

              {/* Warning banner */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                <TriangleAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Báo giao không thành công sẽ chuyển phiếu về{' '}
                  <strong>Đã đóng gói (PACKED)</strong> — hàng được ghi nhận quay về kho để xử lý lại.
                </p>
              </div>
            </>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-1.5 h-[38px] px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit as unknown as React.MouseEventHandler<HTMLButtonElement>}
            disabled={submitting}
            className={`inline-flex items-center justify-center gap-1.5 h-[38px] px-4 text-xs font-semibold text-white rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] ${
              mode === 'SUCCESS'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : mode === 'SUCCESS' ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 shrink-0" />
            )}
            {mode === 'SUCCESS' ? 'Xác nhận Giao thành công' : 'Báo Giao không thành công'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ViewDeliveryProofModal: React.FC<{
  shipment: Shipment;
  onClose: () => void;
}> = ({ shipment, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileImage className="w-4 h-4 text-emerald-600" />
              Biên bản Giao hàng & Chứng từ (POD)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Phiếu <span className="font-mono font-semibold text-indigo-700">{shipment.id}</span>
              {' — '}
              Đơn <span className="font-mono font-semibold text-slate-700">{shipment.orderCode}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-100">
            <div>
              <span className="text-slate-400 block mb-0.5">Người nhận hàng:</span>
              <span className="font-semibold text-slate-800">{shipment.receiverName || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Thời điểm giao:</span>
              <span className="font-semibold text-slate-800">
                {shipment.deliveredAt ? new Date(shipment.deliveredAt).toLocaleString('vi-VN') : '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Đơn vị vận chuyển:</span>
              <span className="font-medium text-slate-700">{shipment.carrierName || 'Tự vận chuyển'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Mã vận đơn:</span>
              <span className="font-mono font-medium text-slate-700">{shipment.trackingNumber || '—'}</span>
            </div>
            {shipment.deliveryAddress && (
              <div className="col-span-2">
                <span className="text-slate-400 block mb-0.5">Địa chỉ giao:</span>
                <span className="text-slate-700">{shipment.deliveryAddress}</span>
              </div>
            )}
            {shipment.deliveryNote && (
              <div className="col-span-2">
                <span className="text-slate-400 block mb-0.5">Ghi chú giao hàng:</span>
                <span className="text-slate-700 italic">{shipment.deliveryNote}</span>
              </div>
            )}
          </div>

          {/* Ảnh chứng từ */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">Ảnh biên bản giao nhận có chữ ký</label>
            {shipment.proofOfDeliveryUrl ? (
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-900/5 flex items-center justify-center p-2">
                <img
                  src={shipment.proofOfDeliveryUrl}
                  alt="Ảnh biên bản chữ ký"
                  className="max-h-72 object-contain rounded"
                />
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                Chưa có ảnh chứng từ đính kèm
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center h-[38px] px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all shadow-2xs cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
