import React from 'react';
import { Inbox, Search, FilterX } from 'lucide-react';

export type EmptyStateType = 'initial' | 'search' | 'filter';

export interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Component EmptyState chuẩn LOHA SALES (UI_GUIDELINES Section 42)
 * - Phân biệt 3 ngữ cảnh: initial (chưa có dữ liệu), search (không tìm thấy), filter (không khớp bộ lọc)
 * - Icon tinh tế, tiêu đề ngắn gọn và nút hành động gợi ý tiếp theo
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'initial',
  title,
  description,
  icon,
  action,
  className = '',
}) => {
  const config = {
    initial: {
      icon: <Inbox className="w-8 h-8 text-slate-400 stroke-[1.8]" />,
      defaultTitle: 'Chưa có dữ liệu',
      defaultDesc: 'Dữ liệu hiện tại đang trống. Bạn có thể bắt đầu tạo mục mới.',
    },
    search: {
      icon: <Search className="w-8 h-8 text-slate-400 stroke-[1.8]" />,
      defaultTitle: 'Không tìm thấy kết quả',
      defaultDesc: 'Không tìm thấy dữ liệu nào phù hợp với từ khóa bạn đã nhập.',
    },
    filter: {
      icon: <FilterX className="w-8 h-8 text-slate-400 stroke-[1.8]" />,
      defaultTitle: 'Không có dữ liệu phù hợp',
      defaultDesc: 'Thử thay đổi hoặc xóa bớt các điều kiện lọc để hiển thị nhiều kết quả hơn.',
    },
  }[type];

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center select-none bg-white rounded-xl border border-slate-200/80 shadow-xs ${className}`}
    >
      <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3.5 shadow-2xs">
        {icon || config.icon}
      </div>

      <h3 className="text-base font-bold text-slate-900 tracking-tight">
        {title || config.defaultTitle}
      </h3>

      <div className="mt-1 text-xs text-slate-500 max-w-sm leading-relaxed">
        {description || config.defaultDesc}
      </div>

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
