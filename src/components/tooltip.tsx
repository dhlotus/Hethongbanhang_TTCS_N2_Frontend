import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: TooltipPosition;
  side?: TooltipPosition; // Hỗ trợ alias side="top" | "bottom"
  delay?: number;
  className?: string;
  usePortal?: boolean;
  sideOffset?: number;
}

/**
 * Component Tooltip chuẩn LOHA SALES (UI_GUIDELINES Section 31)
 * - Tự động hiển thị khi Hover hoặc Focus bằng bàn phím
 * - Hỗ trợ usePortal={true} đưa Tooltip ra ngoài DOM root (document.body) chống tràn viền và che khuất
 * - Tự động phát hiện va chạm (Collision Detection) để quay đầu (flip) khi mép trên hẹp (< 200px)
 * - Z-index: z-[9999] đảm bảo nổi lên trên tất cả theader và bộ lọc
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position,
  side,
  delay = 150,
  className = '',
  usePortal = true,
  sideOffset = 6,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const initialPosition = side || position || 'top';
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    effectivePosition: TooltipPosition;
  }>({
    top: 0,
    left: 0,
    effectivePosition: initialPosition,
  });
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    // Auto Collision Detection: nếu không đủ chỗ ở trên (< 200px), quay đầu xuống dưới
    let effectivePos: TooltipPosition = initialPosition;
    if (initialPosition === 'top' && rect.top < 200) {
      effectivePos = 'bottom';
    } else if (initialPosition === 'bottom' && window.innerHeight - rect.bottom < 200) {
      effectivePos = 'top';
    }

    let top = 0;
    let left = 0;

    if (effectivePos === 'top') {
      top = rect.top - sideOffset;
      left = rect.left + rect.width / 2;
    } else if (effectivePos === 'bottom') {
      top = rect.bottom + sideOffset;
      left = rect.left + rect.width / 2;
    } else if (effectivePos === 'left') {
      top = rect.top + rect.height / 2;
      left = rect.left - sideOffset;
    } else if (effectivePos === 'right') {
      top = rect.top + rect.height / 2;
      left = rect.right + sideOffset;
    }

    setCoords({ top, left, effectivePosition: effectivePos });
  };

  const showTooltip = () => {
    updatePosition();
    timeoutRef.current = setTimeout(() => {
      updatePosition();
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  // Cập nhật vị trí khi scroll hoặc resize nếu đang hiển thị
  useEffect(() => {
    if (!isVisible) return;
    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isVisible]);

  if (!content) return <>{children}</>;

  const positionClasses = {
    top: '-translate-y-full -translate-x-1/2',
    bottom: '-translate-x-1/2',
    left: '-translate-x-full -translate-y-1/2',
    right: '-translate-y-1/2',
  }[coords.effectivePosition];

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 border-x-transparent border-b-transparent',
    bottom:
      'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-900 border-y-transparent border-r-transparent',
    right:
      'right-full top-1/2 -translate-y-1/2 border-r-slate-900 border-y-transparent border-l-transparent',
  }[coords.effectivePosition];

  const tooltipElement = (
    <div
      role="tooltip"
      style={
        usePortal
          ? {
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }
          : undefined
      }
      className={`${
        usePortal
          ? `fixed z-[9999] pointer-events-none ${positionClasses}`
          : `absolute z-[9999] pointer-events-none ${positionClasses}`
      } whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-medium tracking-tight shadow-2xl border border-slate-700/60 transition-opacity duration-150 animate-in fade-in zoom-in-95`}
    >
      {content}
      {/* Mũi tên chỉ hướng */}
      <div className={`absolute w-0 h-0 border-4 ${arrowClasses}`} aria-hidden="true" />
    </div>
  );

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible &&
        (usePortal && typeof document !== 'undefined'
          ? createPortal(tooltipElement, document.body)
          : tooltipElement)}
    </div>
  );
};
