import React from "react";

interface DiscreteValueSliderProps {
  id: string;
  label: string;
  description?: React.ReactNode;
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
    <div className="grid grid-cols-[minmax(0,1fr)_5.25rem] items-start gap-x-3">
      <div className="col-start-1 min-w-0">
        <label htmlFor={id} className="block font-display text-base font-semibold text-gray-900">
          {label}
        </label>
        {description ? (
          <p className="mt-0.5 font-display text-xs leading-relaxed text-gray-600">{description}</p>
        ) : null}
      </div>
      <div className="col-start-1 row-start-2 mt-3 flex min-w-0 items-center self-stretch">
        <input
          id={id}
          type="range"
          min={0}
          max={maxIndex}
          step={1}
          value={valueIndex}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-2 w-full accent-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          aria-valuemin={0}
          aria-valuemax={maxIndex}
          aria-valuenow={valueIndex}
          aria-valuetext={displayValue}
        />
      </div>
      <span className="col-start-2 row-start-2 mt-3 inline-flex w-full items-center justify-center rounded-md border border-blue-200 bg-gradient-to-tl from-blue-100 via-blue-50 to-white px-1.5 py-2.5 font-display text-lg font-bold tabular-nums leading-none text-black">
        {displayValue}
      </span>
      {minLabel != null && maxLabel != null ? (
        <div className="col-start-1 mt-1 flex justify-between px-0.5 font-display text-[10px] font-medium text-gray-600">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      ) : null}
    </div>
  );
};
