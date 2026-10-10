import React from 'react';

export interface SliderProps {
  label?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (val: number) => void;
  unit?: string;
  showInput?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Component Slider chuẩn LOHA SALES (UI_GUIDELINES Section 21)
 * - Hiển thị rõ Min, Max, và Giá trị hiện tại
 * - Tùy chọn nhập số trực tiếp để chính xác
 * - Màu thanh kéo Primary Brand Color (#371cdb)
 */
export const Slider: React.FC<SliderProps> = ({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  unit = '',
  showInput = true,
  disabled = false,
  className = '',
}) => {
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (!isNaN(val)) {
      onChange(Math.max(min, Math.min(max, val)));
    }
  };

  return (
    <div className={`w-full text-left ${className}`}>
      <div className="flex items-center justify-between mb-2">
        {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
        <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-[var(--color-primary)]">
          {showInput ? (
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={value}
              disabled={disabled}
              onChange={handleInputChange}
              className="w-16 h-7 px-1.5 text-center text-sm font-bold border border-slate-300 rounded focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-ring)] outline-none"
            />
          ) : (
            <span>{value}</span>
          )}
          {unit && <span className="text-slate-500 font-normal">{unit}</span>}
        </div>
      </div>

      <div className="relative flex items-center h-6">
        {/* Track nền */}
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--color-primary)] transition-all duration-75"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Input range native ẩn giao diện nhưng bắt kéo mượt mà */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
      </div>

      {/* Nhãn Min - Max */}
      <div className="flex justify-between items-center text-xs text-slate-400 font-mono mt-1">
        <span>
          {min} {unit}
        </span>
        <span>
          {max} {unit}
        </span>
      </div>
    </div>
  );
};
