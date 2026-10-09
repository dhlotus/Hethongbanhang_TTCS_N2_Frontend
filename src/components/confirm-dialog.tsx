import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, AlertCircle, HelpCircle, X } from 'lucide-react';
import { Button } from './button';

export type ConfirmDialogType = 'danger' | 'warning' | 'primary';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmDialogType;
  isLoading?: boolean;
  maxWidth?: string;
}

/**
 * Component ConfirmDialog chuẩn LOHA SALES (UI_GUIDELINES Section 36)
 * - Xác nhận trước hành động quan trọng/nguy hiểm
 * - Nút hành động mang tên cụ thể, không dùng 'OK' mơ hồ
 * - Nút Hủy nhẹ nhàng, không lấn át
 * - Khóa thao tác và hiển thị spinner khi đang xử lý
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận thực hiện',
  cancelText = 'Hủy bỏ',
  type = 'danger',
  isLoading = false,
  maxWidth = 'max-w-md',
}) => {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsClosing(false);
    } else if (isRendered && !isClosing) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsRendered(false);
        setIsClosing(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isRendered, isClosing]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isRendered) return null;

  const typeConfig = {
    danger: {
      icon: <AlertCircle className="w-5 h-5 text-rose-600" />,
      iconBg: 'bg-rose-100',
      confirmVariant: 'danger' as const,
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      iconBg: 'bg-amber-100',
      confirmVariant: 'primary' as const,
    },
    primary: {
      icon: <HelpCircle className="w-5 h-5 text-[var(--color-primary)]" />,
      iconBg: 'bg-[var(--color-primary-light)]',
      confirmVariant: 'primary' as const,
    },
  }[type];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-150 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={() => !isLoading && onCancel()}
      />

      {/* Dialog box */}
      <div
        className={`relative w-full ${maxWidth} rounded-xl bg-white border border-slate-200/80 shadow-xl overflow-hidden transition-all duration-150 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${typeConfig.iconBg}`}
            >
              {typeConfig.icon}
            </div>
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="text-base font-bold text-slate-900 leading-snug">{title}</h3>
              <div className="mt-1.5 text-xs text-slate-600 leading-relaxed">{message}</div>
            </div>
            {!isLoading && (
              <button
                type="button"
                onClick={onCancel}
                className="p-1 -mr-1 -mt-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/60">
          <Button
            variant="outline"
            size="sm"
            fullWidth={false}
            disabled={isLoading}
            onClick={onCancel}
          >
            {cancelText}
          </Button>
          <Button
            variant={typeConfig.confirmVariant}
            size="sm"
            fullWidth={false}
            isLoading={isLoading}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
