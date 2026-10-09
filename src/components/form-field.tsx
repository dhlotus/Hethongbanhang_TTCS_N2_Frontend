import React from "react";
import { AlertCircle } from "lucide-react";

export interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  children: React.ReactNode;
}

export const FormLabel: React.FC<FormLabelProps> = ({
  required = false,
  children,
  className = "",
  ...props
}) => {
  return (
    <label
      className={`block text-sm font-medium text-slate-700 mb-1.5 ${className}`}
      {...props}
    >
      {children} {required && <span className="text-rose-500">*</span>}
    </label>
  );
};

export interface FieldErrorProps {
  error?: string | null;
  className?: string;
}

export const FieldError: React.FC<FieldErrorProps> = ({
  error,
  className = "",
}) => {
  if (!error) return null;

  return (
    <p
      className={`mt-1.5 text-xs text-rose-600 flex items-center gap-1.5 font-medium animate-in fade-in duration-150 ${className}`}
      role="alert"
    >
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      <span>{error}</span>
    </p>
  );
};

export interface FormFieldProps {
  label?: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  error?: string | null;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Component FormField chuẩn LOHA SALES (UI_GUIDELINES Section 51, 52, 54, 56)
 * - Bao bọc 1 trường dữ liệu: Label (dấu *) -> Input -> HelperText / FieldError
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  required = false,
  error,
  helperText,
  children,
  className = "",
}) => {
  return (
    <div className={`w-full text-left ${className}`}>
      {label && (
        <FormLabel htmlFor={htmlFor} required={required}>
          {label}
        </FormLabel>
      )}

      {children}

      {error ? (
        <FieldError error={error} />
      ) : helperText ? (
        <p className="mt-1 text-xs text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
};
