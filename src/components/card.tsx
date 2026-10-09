import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
  clickable?: boolean;
  className?: string;
}

/**
 * Component Card chuẩn LOHA SALES (UI_GUIDELINES Section 24)
 * - Bo góc chuẩn radius-lg (12px), viền mỏng border-slate-200/80, shadow-xs nhẹ
 * - Cấu trúc module: Card, CardHeader, CardTitle, CardBody, CardFooter
 */
export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  clickable = false,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-white shadow-xs transition-all duration-200 ${
        hoverable ? "hover:shadow-md hover:border-slate-300" : ""
      } ${
        clickable
          ? "cursor-pointer active:scale-[0.99] hover:border-[var(--color-primary)]"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`p-5 pb-3 border-b border-slate-100 flex items-center justify-between gap-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <h3
      className={`text-base font-bold text-slate-900 tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<
  React.HTMLAttributes<HTMLParagraphElement>
> = ({ children, className = "", ...props }) => {
  return (
    <p className={`text-xs text-slate-500 mt-0.5 ${className}`} {...props}>
      {children}
    </p>
  );
};

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div className={`p-5 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`p-5 pt-3 border-t border-slate-100 bg-slate-50/50 rounded-b-xl flex items-center justify-between gap-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
