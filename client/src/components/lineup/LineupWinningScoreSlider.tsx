import React from "react";

interface LineupWinningScoreSliderProps {
  id?: string;
  label?: string;
  description?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  formatValue?: (value: number) => string;
  formatBound?: (value: number) => string;
  onChange?: (value: number) => void;
  disabled?: boolean;
  error?: string | null;
  readOnly?: boolean;
}

const defaultFormat = (value: number) => String(value);

export const LineupWinningScoreSlider: React.FC<LineupWinningScoreSliderProps> = ({
  id = "winning-score-prediction",
  label = "Tie-Breaker",
  description,
  value,
  min = 1,
  max = 250,
  step = 1,
  formatValue = defaultFormat,
  formatBound = defaultFormat,
  onChange,
  disabled = false,
  error = null,
  readOnly = false,
}) => {
  const displayValue = formatValue(value);

  return (
    <div className="border-t border-gray-100 p-3">
      {readOnly ? (
        <div className="flex items-center justify-between gap-3">
          <span className="font-display text-sm font-medium text-gray-900">{label}</span>
          <span className="shrink-0 font-display text-sm font-medium tabular-nums text-gray-900">
            {displayValue}
          </span>
        </div>
      ) : (
        <>
          <label htmlFor={id} className="block font-display text-base font-semibold text-gray-900">
            {label}
          </label>
          {description ? (
            <p className="mt-0.5 font-display text-xs leading-relaxed text-gray-600">{description}</p>
          ) : null}
          <div className="mt-3 flex items-center gap-3">
            <input
              id={id}
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              disabled={disabled}
              onChange={(event) => onChange?.(Number(event.target.value))}
              className="h-2 w-full flex-1 accent-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={value}
              aria-valuetext={displayValue}
            />
            <span className="w-16 shrink-0 text-right font-display text-lg font-bold tabular-nums leading-none text-gray-900">
              {displayValue}
            </span>
          </div>
          <div className="mt-1 flex justify-between px-0.5 font-display text-[10px] font-medium text-gray-400">
            <span>{formatBound(min)}</span>
            <span>{formatBound(max)}</span>
          </div>
        </>
      )}
      {error ? (
        <p className="mt-2 font-display text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};
