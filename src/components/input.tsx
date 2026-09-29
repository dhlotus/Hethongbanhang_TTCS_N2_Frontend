import React, { forwardRef } from "react";
import { AlertCircle } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  required?: boolean;
}

/**
 * Component Input chuẩn UI/UX cao cấp cho hệ thống LOHA SALES (h-12, rounded-xl, clean focus)
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightElement, required, id, className = "", ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full text-left">
        <label
          htmlFor={inputId}
          className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full h-12 rounded-xl text-sm bg-white border text-slate-900 placeholder-slate-400 transition-all duration-200 outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
              leftIcon ? "pl-10.5" : "pl-4"
            } ${rightElement ? "pr-10.5" : "pr-4"} ${
              error
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
                : "border-slate-200 hover:border-slate-300"
            } ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
