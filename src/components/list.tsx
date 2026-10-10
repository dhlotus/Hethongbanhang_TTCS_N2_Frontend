import React from 'react';
import { Loader2, Inbox, AlertCircle } from 'lucide-react';

export interface ListItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  clickable?: boolean;
  className?: string;
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  description,
  icon,
  action,
  clickable = false,
  className = '',
  onClick,
  ...props
}) => {
  const isInteractive = clickable || Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between gap-3.5 p-3.5 transition-colors ${
        isInteractive ? 'cursor-pointer hover:bg-slate-50/80 active:bg-slate-100' : ''
      } ${className}`}
      {...props}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {icon && (
          <div className="shrink-0 text-slate-500 p-2 rounded-lg bg-slate-100/80">{icon}</div>
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900 truncate">{title}</span>
            {subtitle && <span className="text-xs text-slate-400 font-normal">{subtitle}</span>}
          </div>
          {description && <p className="text-xs text-slate-500 truncate mt-0.5">{description}</p>}
        </div>
      </div>

      {action && <div className="shrink-0 ml-2">{action}</div>}
    </div>
  );
};

export interface ListProps {
  children?: React.ReactNode;
  divided?: boolean;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyText?: string;
  error?: string | null;
  className?: string;
}

/**
 * Component List chuẩn LOHA SALES (UI_GUIDELINES Section 27)
 * - Cấu trúc mục thống nhất: Icon -> Tiêu đề & Mô tả -> Hành động bên phải
 * - Tùy chọn đường phân chia divided mỏng nhẹ
 * - Trạng thái: Loading, Empty, Error
 */
export const List: React.FC<ListProps> = ({
  children,
  divided = true,
  isLoading = false,
  isEmpty = false,
  emptyText = 'Danh sách trống',
  error = null,
  className = '',
}) => {
  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-xs ${
        divided ? 'divide-y divide-slate-100' : ''
      } ${className}`}
    >
      {isLoading ? (
        <div className="py-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--color-primary)]" />
          <span className="text-xs">Đang tải danh sách...</span>
        </div>
      ) : error ? (
        <div className="py-8 text-center text-rose-600 flex flex-col items-center justify-center gap-1.5">
          <AlertCircle className="w-6 h-6 text-rose-500" />
          <span className="text-xs font-semibold">{error}</span>
        </div>
      ) : isEmpty ? (
        <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-1.5">
          <Inbox className="w-6 h-6 text-slate-300" />
          <span className="text-xs">{emptyText}</span>
        </div>
      ) : (
        children
      )}
    </div>
  );
};
