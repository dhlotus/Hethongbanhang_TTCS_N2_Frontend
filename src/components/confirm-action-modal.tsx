import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Download, Printer, FileText, X, Loader2 } from 'lucide-react';

export interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  actionType?: 'download' | 'print' | 'general';
  isLoading?: boolean;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText = 'Hủy bỏ',
  actionType = 'download',
  isLoading = false,
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

  // Khóa cuộn màn hình nền
  useEffect(() => {
    if (isRendered) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isRendered]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    },
    [onClose, isLoading],
  );

  useEffect(() => {
    if (isRendered) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isRendered, handleKeyDown]);

  if (!isRendered) return null;

  const defaultConfirmText =
    confirmText || (actionType === 'download' ? 'Xác nhận tải' : actionType === 'print' ? 'Xác nhận in' : 'Xác nhận');

  const renderIcon = () => {
    if (actionType === 'print') {
      return (
        <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
          <Printer className="w-6 h-6" />
        </div>
      );
    }
    if (actionType === 'download') {
      return (
        <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
          <Download className="w-6 h-6" />
        </div>
      );
    }
    return (
      <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
        <FileText className="w-6 h-6" />
      </div>
    );
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-action-title"
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 transition-opacity duration-150 ${
        isClosing || !isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
      }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isLoading) onClose();
        }}
      />

      {/* Modal Dialog */}
      <div
        className={`relative w-full max-w-md my-auto bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden transition-all duration-150 transform flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] ${
          isClosing || !isOpen ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Nút đóng góc phải */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer z-10"
          title="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto min-h-0 flex-1">
          <div className="flex items-start gap-3 sm:gap-4">
            {renderIcon()}
            <div className="space-y-1 pr-6 min-w-0 flex-1">
              <h3 id="confirm-action-title" className="text-sm sm:text-base font-bold text-slate-900 break-words leading-snug">
                {title}
              </h3>
              {message && <div className="text-xs text-slate-600 leading-relaxed break-words">{message}</div>}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50/80 px-4 sm:px-6 py-3 sm:py-3.5 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{defaultConfirmText}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
