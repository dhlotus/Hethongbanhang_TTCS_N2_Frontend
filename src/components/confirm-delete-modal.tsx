import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message?: React.ReactNode;
  itemName?: string;
  itemCode?: string;
  warningText?: string;
  confirmText?: string;
  cancelText?: string;
  isDeleting?: boolean;
  isLoading?: boolean;
  maxWidth?: string;
  icon?: 'trash' | 'warning';
}

/**
 * ConfirmDeleteModal - Modal xác nhận hành động nguy hiểm (Destructive Action)
 * Chuẩn hóa 100% thiết kế cho toàn bộ hệ thống HTBH.
 *
 * Đặc điểm kỹ thuật:
 * - Khóa cuộn trang (Body Scroll Lock) ngăn hiện tượng cuộn kép
 * - Phím tắt Escape & click backdrop để hủy an toàn
 * - Hiệu ứng chuyển động mượt mà (Fade + Zoom)
 * - Vị trí nút bấm chuẩn: [Hủy bỏ] bên trái, [Xác nhận xóa] màu đỏ bên phải
 * - Hiển thị trạng thái đang xử lý (Loading state) chống bấm đúp
 */
export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  title = 'Xác nhận xóa dữ liệu',
  message,
  itemName,
  itemCode,
  warningText = 'Thao tác này mang tính vĩnh viễn và không thể hoàn tác sau khi xác nhận.',
  confirmText = 'Xác nhận xóa',
  cancelText = 'Hủy bỏ',
  isDeleting = false,
  isLoading = false,
  maxWidth = 'max-w-md',
  icon = 'trash',
}) => {
  const deleting = isDeleting || isLoading;
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  // Đồng bộ mở / đóng kèm hiệu ứng chuyển cảnh
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsClosing(false);
    } else if (isRendered && !isClosing) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsClosing(false);
        setIsRendered(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isRendered, isClosing]);

  const handleClose = useCallback(() => {
    if (deleting || isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setIsRendered(false);
      onCancel();
    }, 200);
  }, [deleting, isClosing, onCancel]);

  // Khóa cuộn body trình duyệt khi modal đang mở
  useEffect(() => {
    if (isRendered) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isRendered]);

  // Phím tắt Escape để hủy bỏ an toàn
  useEffect(() => {
    if (!isRendered || isClosing || deleting) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRendered, isClosing, deleting, handleClose]);

  if (!isRendered || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      onClick={(e) => {
        if (!deleting && e.target === e.currentTarget) {
          handleClose();
        }
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs transition-all ${
        isClosing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop-in'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidth} bg-white rounded-xl border border-slate-200/90 shadow-lg overflow-hidden flex flex-col text-slate-800 ${
          isClosing ? 'animate-modal-out' : 'animate-modal-in'
        }`}
      >
        {/* Nút đóng góc phải */}
        <button
          type="button"
          onClick={handleClose}
          disabled={deleting}
          aria-label="Đóng popup"
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer disabled:opacity-40"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header với Icon cảnh báo/thùng rác nổi bật */}
        <div className="p-5 sm:p-6 pb-0 flex items-start gap-3.5">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-600 ring-1 ring-rose-500/20">
            {icon === 'warning' ? (
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              <Trash2 className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.2]" />
            )}
          </div>
          <div className="min-w-0 pr-6">
            <h3
              id="confirm-delete-title"
              className="text-base sm:text-lg font-bold text-slate-900 tracking-tight"
            >
              {title}
            </h3>
            {itemCode && (
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Mã định danh: <span className="font-bold text-slate-800">{itemCode}</span>
              </p>
            )}
          </div>
        </div>

        {/* Nội dung chi tiết & Cảnh báo */}
        <div className="p-5 sm:p-6 space-y-3.5 text-xs">
          {message ? (
            <div className="text-slate-600 leading-relaxed text-xs">{message}</div>
          ) : itemName ? (
            <div className="rounded-md bg-slate-50 p-3.5 border border-slate-100 text-xs text-slate-700 space-y-1">
              <p>
                Bạn có chắc chắn muốn xóa{' '}
                <strong className="text-slate-900 font-bold">&quot;{itemName}&quot;</strong> khỏi hệ
                thống?
              </p>
            </div>
          ) : null}

          {warningText && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-rose-50/70 border border-rose-100 text-rose-700">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              <p className="text-[11px] font-medium leading-relaxed">{warningText}</p>
            </div>
          )}
        </div>

        {/* Footer: Nút bấm đồng nhất vị trí */}
        <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={handleClose}
            disabled={deleting}
            className="px-4 py-2.5 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="px-5 py-2.5 rounded-md bg-rose-600 hover:bg-rose-700 active:scale-95 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{deleting ? 'Đang xóa...' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
