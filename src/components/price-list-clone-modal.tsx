import React, { useState, useEffect } from 'react';
import { Copy, GitBranch, CheckCircle2 } from 'lucide-react';
import { ModalLayout } from './modal-layout';
import type { PriceList } from '../types/price-list';

interface PriceListCloneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (sourcePriceList: PriceList, newName: string, newCode: string) => Promise<void>;
  priceList: PriceList | null;
}

export const PriceListCloneModal: React.FC<PriceListCloneModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  priceList,
}) => {
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (priceList) {
      const nextVer = (priceList.version || 1) + 1;
      setNewName(`${priceList.name} (Bản sao v${nextVer}.0)`);
      setNewCode(`${priceList.code}-V${nextVer}`);
    }
  }, [priceList, isOpen]);

  if (!isOpen || !priceList) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setSubmitting(true);
      await onConfirm(priceList, newName.trim(), newCode.trim());
      onClose();
    } catch {
      // Toast được hiển thị ở component cha
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title="Tạo Phiên bản Bảng giá Mới (Clone)"
      subtitle="Kế thừa danh sách sản phẩm từ bảng giá gốc đã phát sinh đơn hàng"
      icon={<Copy className="w-5 h-5 text-amber-600" />}
      maxWidth="max-w-lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !newName.trim()}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white shadow-xs transition-all cursor-pointer"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang nhân bản...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Xác nhận Clone Version</span>
              </>
            )}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-600">
            <span>Bảng giá gốc:</span>
            <strong className="text-slate-900 font-semibold">{priceList.name}</strong>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Mã gốc:</span>
            <span className="font-mono text-blue-600">{priceList.code}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Phiên bản gốc:</span>
            <span className="font-mono font-semibold text-slate-800">
              v{priceList.version}.0 (Đã có đơn hàng)
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/60 text-xs text-blue-900 flex items-start gap-2.5">
          <GitBranch className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            Phiên bản mới sẽ tự động tăng lên <strong>v{(priceList.version || 1) + 1}.0</strong>,
            chuyển sang trạng thái <strong>Bản nháp (Draft)</strong> và{' '}
            <strong>mở khóa toàn bộ quyền chỉnh sửa</strong> mặt hàng và giá bán.
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">
            Tên phiên bản mới <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nhập tên bảng giá phiên bản mới..."
            className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">
            Mã bảng giá mới <span className="text-slate-400 font-normal">(tùy chọn)</span>
          </label>
          <input
            type="text"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value.toUpperCase())}
            placeholder="BG-AGENT1-Q4-2026-V2"
            className="w-full px-3.5 py-2 text-xs font-mono font-medium rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </form>
    </ModalLayout>
  );
};
