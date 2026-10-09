import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

export type PopoverPlacement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

export interface PopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  title?: React.ReactNode;
  showClose?: boolean;
  placement?: PopoverPlacement;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/**
 * Component Popover chuẩn LOHA SALES (UI_GUIDELINES Section 32)
 * - Mở theo hành động click, cho phép tương tác bên trong
 * - Đóng tự động khi click ra ngoài hoặc nhấn phím Escape
 * - Bo góc chuẩn radius-lg (12px), bóng đổ shadow-lg
 */
export const Popover: React.FC<PopoverProps> = ({
  trigger,
  children,
  title,
  showClose = false,
  placement = "bottom-start",
  isOpen: controlledIsOpen,
  onOpenChange,
  className = "",
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledIsOpen !== undefined;
  const open = isControlled ? controlledIsOpen : internalIsOpen;

  const setOpen = (val: boolean) => {
    if (!isControlled) {
      setInternalIsOpen(val);
    }
    onOpenChange?.(val);
  };

  const toggle = () => setOpen(!open);

  // Xử lý click outside và Escape key
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const placementClasses = {
    "bottom-start": "top-full left-0 mt-2",
    "bottom-end": "top-full right-0 mt-2",
    "top-start": "bottom-full left-0 mb-2",
    "top-end": "bottom-full right-0 mb-2",
  }[placement];

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <div onClick={toggle} className="cursor-pointer">
        {trigger}
      </div>

      {open && (
        <div
          className={`absolute z-50 min-w-[240px] rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden transition-all duration-150 animate-in fade-in zoom-in-95 ${placementClasses} ${className}`}
        >
          {(title || showClose) && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/70">
              {title && (
                <span className="text-xs font-bold text-slate-800">
                  {title}
                </span>
              )}
              {showClose && (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/50 cursor-pointer ml-auto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          <div className="p-4 text-xs text-slate-700">{children}</div>
        </div>
      )}
    </div>
  );
};
