import React from "react";

export interface TabItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: number | string;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  variant?: "underline" | "pills";
  className?: string;
}

/**
 * Component Tabs chuẩn LOHA SALES (UI_GUIDELINES Section 29)
 * - 2 kiểu dáng: "underline" (viền dưới thương hiệu) và "pills" (nút bo góc)
 * - Tab đang chọn nổi bật với Primary Brand Color
 * - Hỗ trợ Icon và Badge số lượng đính kèm
 */
export const Tabs: React.FC<TabsProps> = ({
  items,
  activeKey,
  onChange,
  variant = "underline",
  className = "",
}) => {
  return (
    <div
      className={`flex items-center gap-1 select-none ${
        variant === "underline"
          ? "border-b border-slate-200"
          : "p-1 bg-slate-100 rounded-lg"
      } ${className}`}
      role="tablist"
    >
      {items.map((tab) => {
        const isActive = tab.key === activeKey;

        if (variant === "pills") {
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.key)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none ${
                isActive
                  ? "bg-white text-[var(--color-primary)] shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        }

        // Kiểu underline
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => onChange(tab.key)}
            className={`relative inline-flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-colors duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none -mb-px ${
              isActive
                ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] font-bold"
                : "text-slate-500 hover:text-slate-800 border-b-2 border-transparent"
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive
                    ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
