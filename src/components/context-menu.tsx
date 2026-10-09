import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface ContextMenuItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  divider?: boolean;
  onClick?: () => void;
}

export interface ContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
  className?: string;
}

/**
 * Component ContextMenu chuẩn LOHA SALES (UI_GUIDELINES Section 49)
 * - Mở menu ngữ cảnh khi người dùng nhấp chuột phải (right-click) vào vùng bao
 * - Tự động định vị và không bị tràn khỏi viewport màn hình
 * - Đóng an toàn khi click ra ngoài hoặc nhấn phím Escape
 */
export const ContextMenu: React.FC<ContextMenuProps> = ({ items, children, className = '' }) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - (items.length * 36 + 20));
    setPosition({ x, y });
  };

  const closeMenu = () => {
    setPosition(null);
  };

  useEffect(() => {
    if (!position) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [position]);

  return (
    <>
      <div onContextMenu={handleContextMenu} className={className}>
        {children}
      </div>

      {position &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: position.y, left: position.x }}
            className="fixed z-50 min-w-[180px] rounded-xl border border-slate-200/90 bg-white py-1 shadow-xl animate-in fade-in zoom-in-95 select-none"
            role="menu"
          >
            {items.map((item) => {
              if (item.divider) {
                return (
                  <div key={item.key} className="my-1 border-t border-slate-100" role="separator" />
                );
              }

              const isDanger = item.variant === 'danger';

              return (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    if (!item.disabled) {
                      item.onClick?.();
                      closeMenu();
                    }
                  }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer text-left ${
                    item.disabled
                      ? 'opacity-50 cursor-not-allowed'
                      : isDanger
                        ? 'text-rose-600 hover:bg-rose-50 active:bg-rose-100'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100'
                  }`}
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span className="flex-1 truncate">{item.label}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
};
