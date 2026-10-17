import React, { forwardRef } from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  size?: 'sm' | 'md';
  id?: string;
  name?: string;
  className?: string;
}

/**
 * Component Switch / Toggle chuẩn LOHA SALES (UI_GUIDELINES Section 17)
 * - Thao tác Bật / Tắt trực quan, mượt mà
 * - Trạng thái ON dùng màu Primary (#371cdb)
 * - Click được cả vùng Label
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    { checked, onChange, label, description, disabled = false, size = 'md', id, className = '' },
    ref
  ) => {
    const switchId = id || Math.random().toString(36).substring(7);

    const toggle = () => {
      if (!disabled) {
        onChange(!checked);
      }
    };

    const isSmall = size === 'sm';

    return (
      <div className={`inline-flex items-start gap-3 select-none text-left ${className}`}>
        <button
          id={switchId}
          ref={ref}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={toggle}
          className={`relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${
            isSmall ? 'h-5 w-9 p-0.5' : 'h-6 w-11 p-0.5'
          } ${checked ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-300 hover:bg-slate-400/80'}`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out ${
              isSmall ? 'h-4 w-4' : 'h-5 w-5'
            } ${
              checked ? (isSmall ? 'translate-x-4' : 'translate-x-5') : 'translate-x-0'
            }`}
          />
        </button>

        {(label || description) && (
          <div
            onClick={toggle}
            className={`flex flex-col ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
          >
            {label && (
              <span className="text-sm font-medium text-slate-800 leading-tight">{label}</span>
            )}
            {description && <span className="text-xs text-slate-500 mt-0.5">{description}</span>}
          </div>
        )}
      </div>
    );
  }
);

Switch.displayName = 'Switch';
