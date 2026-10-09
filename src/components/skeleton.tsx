import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rounded" | "rectangular";
  width?: string | number;
  height?: string | number;
  className?: string;
}

/**
 * Component Skeleton nguyên tử chuẩn LOHA SALES (UI_GUIDELINES Section 38)
 * - Hiệu ứng animate-pulse nhẹ nhàng, nền slate-200/70
 * - Ngăn chặn Layout Shift trước khi dữ liệu xuất hiện
 * - 4 hình dạng: text (dòng chữ), circular (avatar), rounded (button/card), rectangular
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = "rounded",
  width,
  height,
  className = "",
  style,
  ...props
}) => {
  const variantStyles = {
    text: "h-4 rounded-sm",
    circular: "rounded-full aspect-square",
    rounded: "rounded-md",
    rectangular: "rounded-none",
  }[variant];

  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-slate-200/70 ${variantStyles} ${className}`}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        ...style,
      }}
      {...props}
    />
  );
};
