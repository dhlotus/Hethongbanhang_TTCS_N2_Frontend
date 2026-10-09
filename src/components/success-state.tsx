import React from "react";
import { CheckCircle2 } from "lucide-react";

export interface SuccessStateProps {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Component SuccessState chuẩn LOHA SALES (UI_GUIDELINES Section 40)
 * - Hiển thị trạng thái hoàn thành thành công trong nội dung trang
 * - Icon CheckCircle2 xanh lá (Emerald) nổi bật, tiêu đề ngắn gọn
 * - Cung cấp nút hành động tiếp theo
 */
export const SuccessState: React.FC<SuccessStateProps> = ({
  title,
  description,
  action,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center select-none bg-white rounded-xl border border-slate-200/80 shadow-xs ${className}`}
    >
      <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 ring-8 ring-emerald-50/50">
        <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
      </div>

      <h3 className="text-lg font-bold text-slate-900 tracking-tight">
        {title}
      </h3>

      {description && (
        <div className="mt-1.5 text-xs sm:text-sm text-slate-500 max-w-md leading-relaxed">
          {description}
        </div>
      )}

      {action && <div className="mt-6 flex items-center gap-3">{action}</div>}
    </div>
  );
};
