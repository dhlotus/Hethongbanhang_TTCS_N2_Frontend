import React, { forwardRef } from "react";

export interface RadioOption {
  value: string | number;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}

export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: string;
}

/**
 * Component Radio chuẩn LOHA SALES (UI_GUIDELINES Section 16)
 * - Click được cả Label
 * - Trạng thái: Unselected, Selected (Primary Color #371cdb), Disabled, Error
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      label,
      description,
      checked,
      disabled = false,
      error,
      id,
      className = "",
      ...props
    },
    ref,
  ) => {
    const radioId = id || props.name + "-" + String(props.value);

    return (
      <div className={`inline-flex flex-col text-left ${className}`}>
        <label
          htmlFor={radioId}
          className={`inline-flex items-start gap-2.5 select-none ${
            disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          }`}
        >
          <div className="relative flex items-center justify-center mt-0.5">
            <input
              id={radioId}
              type="radio"
              ref={ref}
              checked={checked}
              disabled={disabled}
              className="peer sr-only"
              {...props}
            />
            {/* Custom radio outer circle */}
            <div
              className={`w-5 h-5 rounded-full border transition-all duration-150 flex items-center justify-center ${
                error
                  ? "border-[var(--color-border-error)] bg-rose-50"
                  : "border-slate-300 bg-white hover:border-slate-400"
              } peer-focus-visible:ring-4 peer-focus-visible:ring-[var(--color-primary-ring)] peer-checked:border-[var(--color-primary)] ${
                disabled ? "bg-slate-100 border-slate-200" : ""
              }`}
            >
              {/* Inner active dot */}
              <div
                className={`w-2.5 h-2.5 rounded-full bg-[var(--color-primary)] transition-transform duration-150 ${
                  checked ? "scale-100 opacity-100" : "scale-0 opacity-0"
                }`}
              />
            </div>
          </div>

          {(label || description) && (
            <div className="flex flex-col">
              {label && (
                <span className="text-sm font-medium text-slate-800 leading-tight">
                  {label}
                </span>
              )}
              {description && (
                <span className="text-xs text-slate-500 mt-0.5">
                  {description}
                </span>
              )}
            </div>
          )}
        </label>
        {error && (
          <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>
        )}
      </div>
    );
  },
);

Radio.displayName = "Radio";

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string | number;
  onChange?: (val: string | number) => void;
  label?: string;
  error?: string;
  direction?: "vertical" | "horizontal";
  className?: string;
  disabled?: boolean;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  value,
  onChange,
  label,
  error,
  direction = "vertical",
  className = "",
  disabled = false,
}) => {
  return (
    <div className={`text-left ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2.5">
          {label}
        </label>
      )}
      <div
        className={`flex ${
          direction === "horizontal" ? "flex-wrap gap-4" : "flex-col gap-2.5"
        }`}
      >
        {options.map((option) => (
          <Radio
            key={String(option.value)}
            name={name}
            value={option.value}
            checked={value === option.value}
            disabled={disabled || option.disabled}
            label={option.label}
            description={option.description}
            onChange={() => onChange?.(option.value)}
          />
        ))}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>
      )}
    </div>
  );
};
