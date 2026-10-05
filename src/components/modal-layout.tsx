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
}

/**
 * ModalLayout - Chuẩn hóa khung popup Modal toàn hệ thống HTBH
 *
 * Cấu trúc:
 * 1. Header cố định: Icon + Title + Subtitle/Badge + Header Actions + Nút đóng X đồng nhất.
 * 2. Banner thông báo (nếu có): Cố định ngay dưới Header (lỗi form, cảnh báo chứng từ...).
 * 3. Body cuộn độc lập: max-h-[calc(100vh-140px)] overflow-y-auto, không gây cuộn kép ở trình duyệt.
 * 4. Footer cố định dưới đáy: Chứa các nút bấm hành động (Hủy bỏ, Lưu...).
 * 5. Animation đồng nhất: Zoom & Fade mượt mà (animate-modal-in / animate-modal-out).
 * 6. Khóa cuộn trang chính (body scroll lock) khi modal đang mở.
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
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs transition-all ${
        isClosing ? "animate-modal-backdrop-out" : "animate-modal-backdrop-in"
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidth} bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] ${
          isClosing ? "animate-modal-out" : "animate-modal-in"
        } ${containerClassName}`}
      >
        {/* 1. Header cố định */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/20 shadow-2xs">
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

        {/* 2. Banner cảnh báo/thông báo cố định dưới Header nếu có */}
        {banner && <div className="shrink-0">{banner}</div>}

        {/* 3. Body cuộn nội dung độc lập */}
        <BodyComponent
          {...(bodyAs === "form" && onFormSubmit ? { onSubmit: onFormSubmit } : {})}
          className={`flex-1 min-h-0 overflow-y-auto max-h-[calc(100vh-140px)] ${
            bodyClassName || "p-4 sm:p-6 space-y-4 sm:space-y-5 text-slate-700 text-xs"
          }`}
        >
          {children}
        </BodyComponent>

        {/* 4. Footer cố định dưới đáy */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 bg-slate-50/60 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
