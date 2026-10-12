import React from 'react';

/**
 * Trang Hóa đơn & Công nợ:
 * Hiển thị đơn giản "Chưa có" theo yêu cầu người dùng
 */
export const InvoicesPage: React.FC = () => {
  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-[360px] w-full items-center justify-center rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <p className="text-base sm:text-lg font-medium text-slate-500">
        Chưa có
      </p>
    </div>
  );
};
