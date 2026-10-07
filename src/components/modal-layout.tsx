import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

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
  bodyAs?: "div" | "form";
  onFormSubmit?: (e: React.FormEvent) => void;
  fullScreenOnMobile?: boolean; // Mặc định true: chuyển thành Page Sheet / Full-screen Drawer trên màn hình < 768px
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
  maxWidth = "max-w-2xl",
  children,
  footer,
  banner,
  closeOnEsc = true,
  closeOnOverlayClick = true,
  bodyClassName,
  containerClassName = "",
  ariaLabelledBy = "modal-title",
  bodyAs = "div",
  onFormSubmit,
  fullScreenOnMobile = true,
}) => {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  // Đồng bộ trạng thái mở/đóng và xử lý animation mượt mà
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsClosing(false);
    } else if (isRendered && !isClosing) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsClosing(false);
        setIsRendered(false);
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isRendered, isClosing]);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setIsRendered(false);
      onClose();
    }, 220);
  }, [isClosing, onClose]);

  // Khóa cuộn body trình duyệt để tránh cuộn kép
  useEffect(() => {
    if (isRendered) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isRendered]);

  // Phím tắt Escape để đóng
  useEffect(() => {
    if (!isRendered || isClosing || !closeOnEsc) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRendered, isClosing, closeOnEsc, handleClose]);

  if (!isRendered || typeof document === "undefined") return null;

  const BodyComponent = bodyAs === "form" ? "form" : "div";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      onClick={(e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
          handleClose();
        }
      }}
      className={`fixed inset-0 z-50 flex ${
        fullScreenOnMobile
          ? "items-end md:items-center justify-center p-0 md:p-4"
          : "items-center justify-center p-3 sm:p-4"
      } bg-slate-900/40 backdrop-blur-xs transition-all ${
        isClosing ? "animate-modal-backdrop-out" : "animate-modal-backdrop-in"
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidth} bg-white ${
          fullScreenOnMobile
            ? "h-[100dvh] md:h-auto max-h-[100dvh] md:max-h-[calc(100dvh-3.5rem)] rounded-none md:rounded-3xl border-0 md:border border-slate-200/90 shadow-2xl flex flex-col"
            : "rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]"
        } ${
          fullScreenOnMobile
            ? isClosing
              ? "animate-sheet-out md:animate-modal-out"
              : "animate-sheet-in md:animate-modal-in"
            : isClosing
            ? "animate-modal-out"
            : "animate-modal-in"
        } ${containerClassName}`}
      >
        {/* 1. Header cố định */}
        <div className="sticky top-0 z-20 flex flex-col px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/95 backdrop-blur-xs shrink-0 rounded-t-none md:rounded-t-3xl">
          {fullScreenOnMobile && (
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto md:hidden mb-2 -mt-0.5 shrink-0" />
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/20 shadow-2xs">
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
                {subtitle && (
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {headerExtra}
              <button
                type="button"
                onClick={handleClose}
                aria-label="Đóng popup"
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors focus:outline-none cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 2. Banner cảnh báo/thông báo cố định dưới Header nếu có */}
        {banner && <div className="shrink-0">{banner}</div>}

        {/* 3. Body cuộn nội dung độc lập - Tự động co giãn theo viewport bàn phím ảo */}
        <BodyComponent
          {...(bodyAs === "form" && onFormSubmit ? { onSubmit: onFormSubmit } : {})}
          className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${
            bodyClassName || "p-4 sm:p-6 space-y-4 sm:space-y-5 text-slate-700 text-xs"
          }`}
        >
          {children}
        </BodyComponent>

        {/* 4. Footer Action bar ghim cố định ở đáy với safe-area-inset-bottom */}
        {footer && (
          <div className="sticky bottom-0 z-20 flex items-center justify-end gap-2.5 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-slate-50/95 backdrop-blur-xs shrink-0 rounded-b-none md:rounded-b-3xl pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:pb-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
