import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { ConfirmDialog } from './confirm-dialog';

export interface ModalLayoutProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  headerExtra?: React.ReactNode;
  maxWidth?: string; // e.g. "max-w-md", "max-w-lg", "max-w-2xl", "max-w-4xl", "max-w-5xl"
  children: React.ReactNode;
  footer?: React.ReactNode;
  banner?: React.ReactNode;
  closeOnEsc?: boolean;
  closeOnOverlayClick?: boolean;
  bodyClassName?: string;
  containerClassName?: string;
  ariaLabelledBy?: string;
  bodyAs?: 'div' | 'form';
  onFormSubmit?: (e: React.FormEvent) => void;
  fullScreenOnMobile?: boolean; // Mặc định true: chuyển thành Page Sheet / Full-screen Drawer trên màn hình < 768px
  isDirty?: boolean; // Khi biểu mẫu có dữ liệu chưa lưu, cảnh báo trước khi thoát
  dirtyPromptMessage?: string;
}

/**
 * ModalLayout - Chuẩn hóa khung popup Modal toàn hệ thống HTBH
 *
 * Cấu trúc:
 * 1. Mobile Drawer / Sheet: Chiếm 100dvh toàn màn hình trên < 768px, thích ứng hoàn hảo với bàn phím ảo (Virtual Keyboard).
 * 2. Header cố định: Icon + Title + Subtitle/Badge + Header Actions + Nút đóng X + Handle bar cho mobile.
 * 3. Banner thông báo (nếu có): Cố định ngay dưới Header (lỗi form, cảnh báo chứng từ...).
 * 4. Body cuộn độc lập: flex-1 min-h-0 overflow-y-auto overscroll-contain, loại bỏ bẫy viewport, không gây cuộn kép.
 * 5. Footer Action bar cố định: Ghim cố định ở đáy kèm safe-area-inset-bottom cho thao tác một tay trên mobile.
 * 6. Animation mượt mà: Slide-up Sheet trên mobile, Zoom & Fade trên desktop.
 * 7. Khóa cuộn trang chính (body scroll lock) khi modal đang mở.
 */
export const ModalLayout: React.FC<ModalLayoutProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  badge,
  headerExtra,
  maxWidth = 'max-w-2xl',
  children,
  footer,
  banner,
  closeOnEsc = true,
  closeOnOverlayClick,
  bodyClassName,
  containerClassName = '',
  ariaLabelledBy = 'modal-title',
  bodyAs = 'div',
  onFormSubmit,
  fullScreenOnMobile = true,
  isDirty = false,
  dirtyPromptMessage = 'Biểu mẫu đang có dữ liệu thay đổi chưa lưu. Bạn có chắc chắn muốn thoát mà không lưu?',
}) => {
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Mặc định không đóng khi click ngoài backdrop đối với modal form để chống mất dữ liệu
  const shouldCloseOnOverlay =
    closeOnOverlayClick !== undefined ? closeOnOverlayClick : bodyAs !== 'form';

  // Kiểm tra isDirty trước khi cho phép đóng
  const requestClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }, [isDirty, onClose]);

  // Khóa cuộn body trình duyệt để tránh cuộn kép
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Phím tắt Escape để đóng
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        requestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, requestClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      onClick={(e) => {
        if (shouldCloseOnOverlay && e.target === e.currentTarget) {
          requestClose();
        }
      }}
      className={`fixed inset-0 z-50 flex ${
        fullScreenOnMobile
          ? 'items-end md:items-center justify-center p-0 md:p-4'
          : 'items-center justify-center p-3 sm:p-4'
      } bg-slate-900/40 backdrop-blur-xs transition-all animate-modal-backdrop-in`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidth} bg-white overflow-hidden ${
          fullScreenOnMobile
            ? 'h-[100dvh] md:h-auto max-h-[100dvh] md:max-h-[calc(100dvh-3.5rem)] rounded-none md:rounded-xl border-0 md:border border-slate-200/90 shadow-lg flex flex-col'
            : 'rounded-xl border border-slate-200/90 shadow-lg flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]'
        } ${
          fullScreenOnMobile ? 'animate-sheet-in md:animate-modal-in' : 'animate-modal-in'
        } ${containerClassName}`}
      >
        {/* 1. Header cố định */}
        <div className="sticky top-0 z-20 flex flex-col px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/95 backdrop-blur-xs shrink-0 rounded-t-none md:rounded-t-xl">
          {fullScreenOnMobile && (
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto md:hidden mb-2 -mt-0.5 shrink-0" />
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 ring-1 ring-blue-500/20">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2
                    id={ariaLabelledBy}
                    className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate"
                  >
                    {title}
                  </h2>
                  {badge}
                </div>
                {subtitle && <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {headerExtra}
              <button
                type="button"
                onClick={requestClose}
                aria-label="Đóng popup"
                className="w-9 h-9 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors focus:outline-none cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 2. Banner cảnh báo/thông báo cố định dưới Header nếu có */}
        {banner && <div className="shrink-0">{banner}</div>}

        {/* 3. Body cuộn nội dung độc lập - Tự động co giãn theo viewport bàn phím ảo */}
        {bodyAs === 'form' ? (
          <form
            onSubmit={onFormSubmit}
            className="flex-1 min-h-0 flex flex-col overflow-hidden"
          >
            <div
              className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${
                bodyClassName || 'p-4 sm:p-6 space-y-4 sm:space-y-5 text-slate-700 text-xs'
              }`}
            >
              {children}
            </div>
            {footer && (
              <div className="sticky bottom-0 z-20 flex items-center justify-end gap-2.5 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-slate-50/95 backdrop-blur-xs shrink-0 rounded-b-none md:rounded-b-xl pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:pb-4">
                {footer}
              </div>
            )}
          </form>
        ) : (
          <>
            <div
              className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${
                bodyClassName || 'p-4 sm:p-6 space-y-4 sm:space-y-5 text-slate-700 text-xs'
              }`}
            >
              {children}
            </div>
            {footer && (
              <div className="sticky bottom-0 z-20 flex items-center justify-end gap-2.5 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-slate-50/95 backdrop-blur-xs shrink-0 rounded-b-none md:rounded-b-xl pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:pb-4">
                {footer}
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={showDiscardConfirm}
        onCancel={() => setShowDiscardConfirm(false)}
        onConfirm={() => {
          setShowDiscardConfirm(false);
          onClose();
        }}
        title="Bỏ thay đổi chưa lưu?"
        message={dirtyPromptMessage}
        confirmText="Rời khỏi & Bỏ thay đổi"
        cancelText="Tiếp tục chỉnh sửa"
        type="warning"
      />
    </div>,
    document.body
  );
};
