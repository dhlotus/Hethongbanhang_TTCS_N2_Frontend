import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Copy, GitBranch, CheckCircle2 } from 'lucide-react';
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
      const baseCode = priceList.code.replace(/-V\d+$/i, '');
      setNewCode(`${baseCode}-V${nextVer}`);
    }
  }, [priceList, isOpen]);

  // Khóa cuộn trang nền khi modal đang mở
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

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

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200"
    >
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden rounded-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header - XÓA HOÀN TOÀN nút X */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/95 backdrop-blur-xs shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-500/20">
              <Copy className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 tracking-tight truncate">
                Tạo Phiên bản Bảng giá Mới
              </h2>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                Kế thừa danh sách sản phẩm từ bảng giá gốc đã phát sinh đơn hàng
              </p>
            </div>
          </div>
        </div>

        {/* Body biểu mẫu */}
        <div className="p-5 overflow-y-auto">
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
                Phiên bản mới sẽ tự động tăng lên <strong>v{(priceList.version || 1) + 1}.0</strong>
                , chuyển sang trạng thái <strong>Bản nháp</strong> và{' '}
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
                placeholder="VD: BG-C1-0001-V2"
                className="w-full px-3.5 py-2 text-xs font-mono font-medium rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </form>
        </div>

        {/* Footer cố định - Nút Hủy là lối thoát duy nhất */}
        <div className="sticky bottom-0 z-20 flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-100 bg-slate-50/95 backdrop-blur-xs shrink-0 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Hủy bỏ
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
                <span>Xác nhận nhân bản</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
