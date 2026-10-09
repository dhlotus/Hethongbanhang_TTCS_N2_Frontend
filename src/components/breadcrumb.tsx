import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: React.ReactNode;
  to?: string;
  icon?: React.ReactNode;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  homeUrl?: string;
  className?: string;
}

/**
 * Component Breadcrumb chuẩn LOHA SALES (UI_GUIDELINES Section 47)
 * - Đường dẫn phân cấp từ cấp cao đến trang hiện tại
 * - Cấp trước click được (Link), cấp hiện tại là chữ đậm không click
 * - Dấu phân cách ChevronRight mỏng nhẹ
 */
export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  showHome = true,
  homeUrl = "/",
  className = "",
}) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center text-xs text-slate-500 font-medium select-none ${className}`}
    >
      <ol className="inline-flex items-center gap-1.5 flex-wrap">
        {showHome && (
          <li className="inline-flex items-center">
            <Link
              to={homeUrl}
              className="inline-flex items-center gap-1 hover:text-[var(--color-primary)] transition-colors p-1 -m-1 rounded"
              title="Trang chủ"
            >
              <Home className="w-3.5 h-3.5" />
            </Link>
          </li>
        )}

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="inline-flex items-center gap-1.5">
              {(showHome || index > 0) && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              )}

              {isLast || !item.to ? (
                <span
                  className="font-bold text-slate-900 truncate max-w-[200px]"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.icon && <span className="mr-1 inline-flex">{item.icon}</span>}
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.to}
                  className="hover:text-[var(--color-primary)] transition-colors truncate max-w-[160px] p-1 -m-1 rounded"
                >
                  {item.icon && <span className="mr-1 inline-flex">{item.icon}</span>}
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
