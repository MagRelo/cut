import React from "react";

interface DiscreteValueSliderProps {
  id: string;
  label: string;
  description?: string;
  valueIndex: number;
  valueCount: number;
  displayValue: string;
  minLabel?: string;
  maxLabel?: string;
  onChange: (index: number) => void;
  disabled?: boolean;
}

export const DiscreteValueSlider: React.FC<DiscreteValueSliderProps> = ({
  id,
  label,
  description,
  valueIndex,
  valueCount,
  displayValue,
  minLabel,
  maxLabel,
  onChange,
  disabled = false,
}) => {
  const maxIndex = Math.max(0, valueCount - 1);

  return (
    <div>
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
          min={0}
          max={maxIndex}
          step={1}
          value={valueIndex}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-2 w-full flex-1 accent-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          aria-valuemin={0}
          aria-valuemax={maxIndex}
          aria-valuenow={valueIndex}
          aria-valuetext={displayValue}
        />
        <span className="w-16 shrink-0 text-right font-display text-lg font-bold tabular-nums leading-none text-gray-900">
          {displayValue}
        </span>
      </div>
      {minLabel != null && maxLabel != null ? (
        <div className="mt-1 flex justify-between px-0.5 font-display text-[10px] font-medium text-gray-400">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      ) : null}
    </div>
  );
};
