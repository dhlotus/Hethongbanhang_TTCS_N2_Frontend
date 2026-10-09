import React, { useState, useRef, useEffect } from "react";

export interface DropdownMenuItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  variant?: "default" | "danger";
  disabled?: boolean;
  divider?: boolean;
  onClick?: () => void;
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  placement?: "bottom-start" | "bottom-end";
  className?: string;
}

/**
 * Component DropdownMenu chuẩn LOHA SALES (UI_GUIDELINES Section 48)
 * - Mở menu hành động khi click vào trigger
 * - Tự động đóng khi click ra ngoài hoặc nhấn phím Escape
 * - Hỗ trợ phân nhóm divider và mục nguy hiểm variant="danger" (màu đỏ)
 */
export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  items,
  placement = "bottom-end",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const placementStyles = {
    "bottom-start": "top-full left-0 mt-1.5",
    "bottom-end": "top-full right-0 mt-1.5",
  }[placement];

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <div onClick={() => setIsOpen((prev) => !prev)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          role="menu"
          className={`absolute z-50 min-w-[180px] rounded-xl border border-slate-200/90 bg-white py-1 shadow-lg animate-in fade-in zoom-in-95 select-none ${placementStyles}`}
        >
          {items.map((item) => {
            if (item.divider) {
              return (
                <div
                  key={item.key}
                  className="my-1 border-t border-slate-100"
                  role="separator"
                />
              );
            }

            const isDanger = item.variant === "danger";

            return (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick?.();
                    setIsOpen(false);
                  }
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer text-left ${
                  item.disabled
                    ? "opacity-50 cursor-not-allowed"
                    : isDanger
                    ? "text-rose-600 hover:bg-rose-50 active:bg-rose-100"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100"
                }`}
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
