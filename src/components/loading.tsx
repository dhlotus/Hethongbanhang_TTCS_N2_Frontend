import React from "react";
import { Loader2 } from "lucide-react";

export type LoadingSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface SpinnerProps {
  size?: LoadingSize;
  className?: string;
  color?: "primary" | "white" | "slate";
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  className = "",
  color = "primary",
}) => {
  const sizeStyles = {
    xs: "w-3.5 h-3.5",
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  }[size];

  const colorStyles = {
    primary: "text-[var(--color-primary)]",
    white: "text-white",
    slate: "text-slate-400",
  }[color];

  return (
    <Loader2
      className={`animate-spin ${sizeStyles} ${colorStyles} ${className}`}
      aria-hidden="true"
    />
  );
};

export interface LoadingAreaProps {
  text?: string;
  size?: LoadingSize;
  className?: string;
}

export const LoadingArea: React.FC<LoadingAreaProps> = ({
  text = "Đang tải dữ liệu...",
  size = "md",
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center select-none ${className}`}
      role="status"
    >
      <Spinner size={size} />
      {text && <span className="mt-2.5 text-xs font-medium text-slate-500">{text}</span>}
    </div>
  );
};

export interface LoadingOverlayProps {
  active: boolean;
  text?: string;
  children: React.ReactNode;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  active,
  text = "Đang xử lý...",
  children,
  className = "",
}) => {
  return (
    <div className={`relative ${className}`}>
      {children}
      {active && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/70 backdrop-blur-xs rounded-inherit transition-opacity">
          <Spinner size="lg" />
          {text && <span className="mt-2 text-xs font-semibold text-slate-700">{text}</span>}
        </div>
      )}
    </div>
  );
};
