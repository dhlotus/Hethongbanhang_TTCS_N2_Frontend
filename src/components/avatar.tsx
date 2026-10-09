import React, { useState } from "react";
import { User } from "lucide-react";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string;
  size?: AvatarSize;
  rounded?: "full" | "md";
  onClick?: () => void;
  className?: string;
}

/**
 * Component Avatar chuẩn LOHA SALES (UI_GUIDELINES Section 26)
 * - Tỷ lệ vuông chuẩn, ưu tiên ảnh thật, fallback sang chữ cái đại diện (Initials) hoặc icon User
 * - Kích thước chuẩn: xs (24px), sm (32px), md (40px), lg (48px), xl (64px)
 */
export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = "",
  size = "md",
  rounded = "full",
  onClick,
  className = "",
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  const getInitials = (fullName: string): string => {
    if (!fullName) return "";
    const words = fullName.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(name);

  const sizeStyles = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
  }[size];

  const iconSizes = {
    xs: "w-3.5 h-3.5",
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
  }[size];

  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center aspect-square shrink-0 select-none overflow-hidden border border-slate-200/80 bg-[var(--color-primary-light)] text-[var(--color-primary)] font-bold transition-all duration-150 ${
        rounded === "full" ? "rounded-full" : "rounded-md"
      } ${
        isClickable
          ? "cursor-pointer hover:opacity-90 active:scale-95 focus:outline-none focus:ring-4 focus:ring-[var(--color-primary-ring)]"
          : ""
      } ${sizeStyles} ${className}`}
      {...props}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt={name || "Avatar"}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
        />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <User className={`${iconSizes} text-slate-400`} />
      )}
    </div>
  );
};
