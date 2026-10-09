import React from "react";

export interface FormSectionProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  divider?: boolean;
  className?: string;
}

/**
 * Component FormSection chuẩn LOHA SALES (UI_GUIDELINES Section 51)
 * - Phân nhóm các trường nhập liệu liên quan theo nghiệp vụ
 * - Tiêu đề nhóm rõ nét, mô tả phụ ngắn gọn
 */
export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  divider = true,
  className = "",
}) => {
  return (
    <div
      className={`space-y-4 text-left ${
        divider ? "pb-6 border-b border-slate-100 last:border-b-0 last:pb-0" : ""
      } ${className}`}
    >
      {(title || description) && (
        <div className="mb-3">
          {title && (
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">
              {title}
            </h4>
          )}
          {description && (
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}

      {children}
    </div>
  );
};

export interface FormGridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}

/**
 * Component FormGrid responsive chuẩn Spacing System
 */
export const FormGrid: React.FC<FormGridProps> = ({
  children,
  cols = 2,
  className = "",
}) => {
  const colStyles = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  }[cols];

  return <div className={`grid gap-4.5 ${colStyles} ${className}`}>{children}</div>;
};
