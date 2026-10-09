import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface AccordionItem {
  id: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultOpenIds?: string[];
  className?: string;
}

/**
 * Component Accordion chuẩn LOHA SALES (UI_GUIDELINES Section 30)
 * - Vùng click toàn bộ thanh tiêu đề
 * - Icon ChevronDown xoay hiệu ứng trơn tru 180 độ
 * - Tùy chọn mở đồng thời nhiều mục (allowMultiple)
 */
export const Accordion: React.FC<AccordionProps> = ({
  items,
  allowMultiple = false,
  defaultOpenIds = [],
  className = '',
}) => {
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenIds);

  const toggleItem = (id: string, disabled?: boolean) => {
    if (disabled) return;
    if (allowMultiple) {
      setOpenIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    } else {
      setOpenIds((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-xs divide-y divide-slate-100 ${className}`}
    >
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);

        return (
          <div key={item.id} className="transition-colors">
            {/* Thanh tiêu đề Accordion Header */}
            <button
              type="button"
              disabled={item.disabled}
              onClick={() => toggleItem(item.id, item.disabled)}
              className={`w-full p-4 flex items-center justify-between gap-4 text-left select-none transition-colors cursor-pointer ${
                item.disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:bg-slate-50/70'
              }`}
            >
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-semibold text-slate-900 truncate">{item.title}</span>
                {item.subtitle && (
                  <span className="text-xs text-slate-500 mt-0.5">{item.subtitle}</span>
                )}
              </div>

              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-[var(--color-primary)]' : ''
                }`}
              />
            </button>

            {/* Khối nội dung mở rộng */}
            {isOpen && (
              <div className="p-4 pt-1 pb-4 text-xs text-slate-600 bg-white border-t border-slate-50 leading-relaxed">
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
