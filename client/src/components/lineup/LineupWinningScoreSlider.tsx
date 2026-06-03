import React from "react";

export const WINNING_SCORE_SLIDER_MIN = 1;
export const WINNING_SCORE_SLIDER_MAX = 250;

interface LineupWinningScoreSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  error?: string | null;
}

export const LineupWinningScoreSlider: React.FC<LineupWinningScoreSliderProps> = ({
  value,
  onChange,
  disabled = false,
  error = null,
}) => {
  return (
    <div className="px-3 pb-1 pt-2">
      <label
        htmlFor="winning-score-prediction"
        className="text-medium block font-display text-base font-semibold text-gray-900"
      >
        Tie-Breaker
      </label>
      <p className="mt-0.5 font-display text-xs leading-relaxed text-gray-600">
        Guess how many points the winning lineup will score. Used to break ties.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <input
          id="winning-score-prediction"
          type="range"
          min={WINNING_SCORE_SLIDER_MIN}
          max={WINNING_SCORE_SLIDER_MAX}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-2 w-full flex-1 accent-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Predicted winning lineup score"
        />
        <span className="w-10 shrink-0 text-right font-display text-lg font-bold tabular-nums leading-none text-gray-900">
          {value}
        </span>
      </div>
      <div className="mt-1 flex justify-between px-0.5 font-display text-[10px] font-medium text-gray-400">
        <span>{WINNING_SCORE_SLIDER_MIN}</span>
        <span>{WINNING_SCORE_SLIDER_MAX}</span>
      </div>
      {error ? (
        <p className="mt-2 font-display text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};
