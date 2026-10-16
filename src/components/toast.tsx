import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  id?: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface ToastProps {
  type?: ToastType;
  title?: string;
  message?: string;
  onClose?: () => void;
  duration?: number;
}

// Chuẩn hóa nghiêm ngặt chỉ 2 trạng thái: Xanh lá (Success) và Đỏ (Error)
const normalizeType = (type?: ToastType): 'success' | 'error' => {
  if (type === 'success' || type === 'info') return 'success';
  return 'error'; // "error" | "warning" hoặc các trường hợp khác đều quy về Đỏ (Error)
};

const STYLES = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
    containerBg: 'bg-emerald-50/95 text-slate-800 border-emerald-200/90',
    borderLeft: 'border-l-4 border-l-emerald-600',
    progressBar: 'bg-emerald-600',
    defaultTitle: 'Thao tác thành công',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-rose-600',
    containerBg: 'bg-rose-50/95 text-slate-800 border-rose-200/90',
    borderLeft: 'border-l-4 border-l-rose-600',
    progressBar: 'bg-rose-600',
    defaultTitle: 'Thao tác thất bại',
  },
};

/**
 * Từng Toast đơn lẻ với bộ đếm thời gian và thanh Progress bar độc lập hoàn toàn
 */
interface ToastItemProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration: number;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ id, type, title, message, duration, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);

  const remainingRef = useRef(duration);
  const normalized = normalizeType(type);
  const style = STYLES[normalized];
  const IconComponent = style.icon;
  const displayTitle = title || style.defaultTitle;

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose(id);
    }, 200);
  }, [id, isClosing, onClose]);

  // Hiệu ứng trượt nhanh từ bên phải vào
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 20);
    return () => clearTimeout(timer);
  }, []);

  // Bộ đếm thời gian độc lập cho từng Toast kèm Progress bar
  useEffect(() => {
    if (duration <= 0) return;

    const tick = 25; // Cập nhật mỗi 25ms cho chuyển động mượt mà
    const interval = setInterval(() => {
      if (!isPaused && !isClosing) {
        remainingRef.current -= tick;
        const pct = Math.max(0, (remainingRef.current / duration) * 100);
        setProgress(pct);

        if (remainingRef.current <= 0) {
          clearInterval(interval);
          handleClose();
        }
      }
    }, tick);

    return () => clearInterval(interval);
  }, [duration, isPaused, isClosing, handleClose]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto relative flex items-start gap-3 w-[420px] sm:w-[500px] max-w-[calc(100vw-2rem)] min-h-[52px] rounded-md px-4 py-3.5 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.15),0_8px_10px_-6px_rgba(0,0,0,0.1)] border overflow-hidden transition-all duration-200 ease-out transform ${
        style.containerBg
      } ${style.borderLeft} ${
        isClosing || !isVisible ? 'translate-x-[110%] opacity-0' : 'translate-x-0 opacity-100'
      }`}
    >
      {/* Icon trạng thái đặt bên trái tiêu đề, kích thước rõ ràng, nổi bật */}
      <IconComponent className={`w-5 h-5 shrink-0 mt-0.5 ${style.iconColor}`} />

      {/* Tiêu đề & Nội dung mô tả chi tiết */}
      <div className="flex-1 pr-1 min-w-0">
        <div
          className="text-[13px] sm:text-[14px] font-semibold text-slate-800 break-words leading-snug select-none"
          title={displayTitle}
        >
          {displayTitle}
        </div>
        {message && message.trim() && message.trim() !== displayTitle && (
          <div className="text-[12px] text-slate-600 mt-1 leading-normal break-words font-normal">
            {message}
          </div>
        )}
      </div>

      {/* Nút X đóng nhỏ, đơn giản, dễ bấm ở góc phải */}
      <button
        type="button"
        onClick={handleClose}
        aria-label="Đóng thông báo"
        className="text-slate-400 hover:text-slate-700 hover:bg-black/5 w-6 h-6 rounded-sm transition-colors cursor-pointer shrink-0 flex items-center justify-center -mr-1 -mt-0.5"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress bar đếm ngược rất mảnh 2.5px ở cạnh dưới Toast */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-black/5">
          <div
            className={`h-full transition-all duration-75 ease-linear ${style.progressBar}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

// =============================================================================
// QUẢN LÝ TOAST SYSTEM TOÀN HỆ THỐNG (CONCURRENT MULTI-TOAST STACK)
// =============================================================================
class ToastManager {
  private toasts: ToastOptions[] = [];
  private listeners: Array<() => void> = [];

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  getToasts(): ToastOptions[] {
    return this.toasts;
  }

  show(options: ToastOptions) {
    const text = (options.title || '').trim();
    if (!text && !options.message) return;

    // Không hiển thị thông báo trùng lặp hoàn toàn đang hiển thị trên màn hình
    const isDuplicate = this.toasts.some(
      (t) =>
        t.title.toLowerCase() === text.toLowerCase() &&
        t.type === options.type &&
        (t.message || '') === (options.message || '')
    );
    if (isDuplicate) return;

    const item: ToastOptions = {
      ...options,
      title: text || options.message || '',
      message: options.message,
      id: options.id || `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };

    // Toast mới luôn được đưa lên VỊ TRÍ TRÊN CÙNG, các toast cũ tự động đẩy xuống dưới
    this.toasts = [item, ...this.toasts.slice(0, 4)];
    this.notify();
  }

  remove(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }
}

export const toastManager = new ToastManager();

/**
 * Hàm gọi Toast toàn cục tiện lợi (Hỗ trợ gọi từ bất kỳ đâu trong phần mềm)
 */
export const showToast = (
  type: ToastType,
  title?: string,
  message?: string,
  duration: number = 4000
) => {
  const t = (title || (type === 'success' ? 'Thao tác thành công' : 'Thao tác thất bại')).trim();
  const m = message?.trim();
  toastManager.show({ type, title: t, message: m, duration });
};

export const toast = {
  success: (title: string, message?: string, duration?: number) =>
    showToast('success', title, message, duration),
  error: (title: string, message?: string, duration?: number) =>
    showToast('error', title, message, duration),
};

/**
 * Container hiển thị Toast toàn hệ thống:
 * - Vị trí cố định trượt từ bên phải vào (top-5)
 * - Z-index: z-[99999] (Luôn hiển thị NỔI TRÊN TẤT CẢ các modal, popup, backdrop)
 */
export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastOptions[]>(() => toastManager.getToasts());

  useEffect(() => {
    return toastManager.subscribe(() => {
      setToasts([...toastManager.getToasts()]);
    });
  }, []);

  if (toasts.length === 0) return null;

  const content = (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-2.5 pointer-events-none w-auto items-end"
    >
      {toasts.map((item) => (
        <ToastItem
          key={item.id}
          id={item.id!}
          type={item.type}
          title={item.title}
          message={item.message}
          duration={item.duration || 4000}
          onClose={(id) => toastManager.remove(id)}
        />
      ))}
    </div>
  );

  if (typeof document === 'undefined') {
    return content;
  }

  return createPortal(content, document.body);
};

/**
 * Component Toast tương thích ngược cho các màn hình vẫn dùng <Toast ... /> trực tiếp
 */
export const Toast: React.FC<ToastProps> = ({
  type = 'error',
  title,
  message,
  onClose,
  duration = 3500,
}) => {
  const text = (title || message || '').trim();
  return (
    <ToastItem
      id="standalone-toast"
      type={type}
      title={text}
      duration={duration}
      onClose={() => onClose?.()}
    />
  );
};
