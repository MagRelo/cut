import React from "react";

export const WINNING_SCORE_SLIDER_MIN = 1;
export const WINNING_SCORE_SLIDER_MAX = 250;

interface LineupWinningScoreSliderProps {
  value: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  error?: string | null;
  readOnly?: boolean;
}

export const LineupWinningScoreSlider: React.FC<LineupWinningScoreSliderProps> = ({
  value,
  onChange,
  disabled = false,
  error = null,
  readOnly = false,
}) => {
  return (
    <div className="border-t border-gray-100 p-3">
      {readOnly ? (
        <div className="flex items-baseline justify-between gap-3 font-display">
          <span
            id="winning-score-prediction"
            className="text-sm font-semibold text-gray-700"
          >
            Tie-Breaker
          </span>
          <span className="text-base font-bold tabular-nums leading-none text-gray-900">
            {value}
          </span>
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-baseline justify-between gap-3 font-display">
            <span
              id="winning-score-prediction"
              className="text-sm font-semibold text-gray-700"
            >
              Tie-Breaker
            </span>
            <span className="text-base font-bold tabular-nums leading-none text-gray-900">
              {value}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={WINNING_SCORE_SLIDER_MIN}
              max={WINNING_SCORE_SLIDER_MAX}
              value={value}
              disabled={disabled}
              onChange={(event) => onChange?.(Number(event.target.value))}
              className="h-2 w-full flex-1 accent-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              aria-labelledby="winning-score-prediction"
            />
          </div>
          <div className="mt-1 flex justify-between px-0.5 font-display text-[10px] font-medium text-gray-400">
            <span>{WINNING_SCORE_SLIDER_MIN}</span>
            <span>{WINNING_SCORE_SLIDER_MAX}</span>
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
