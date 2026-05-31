import React from "react";

const MIN_SCORE = 1;
const MAX_SCORE = 250;
const DEFAULT_SCORE = 150;

interface LineupWinningScoreSliderProps {
  /** Display value only — slider is non-interactive in this preview component. */
  value?: number;
}

export const LineupWinningScoreSlider: React.FC<LineupWinningScoreSliderProps> = ({
  value = DEFAULT_SCORE,
}) => {
  return (
    <div className="border-t border-gray-200 px-3 pb-1 pt-4">
      <label
        htmlFor="winning-score-prediction"
        className="block font-display text-sm font-semibold text-gray-900"
      >
        Predicted winning lineup score
      </label>
      <p className="mt-0.5 font-display text-xs leading-relaxed text-gray-600">
        Your guess for the highest lineup score in the contest. Used to break ties.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <input
          id="winning-score-prediction"
          type="range"
          min={MIN_SCORE}
          max={MAX_SCORE}
          value={value}
          readOnly
          tabIndex={-1}
          className="pointer-events-none h-2 w-full flex-1 accent-blue-500"
          aria-label="Predicted winning lineup score"
        />
        <span className="w-10 shrink-0 text-right font-display text-lg font-bold tabular-nums leading-none text-gray-900">
          {value}
        </span>
      </div>
      <div className="mt-1 flex justify-between px-0.5 font-display text-[10px] font-medium text-gray-400">
        <span>{MIN_SCORE}</span>
        <span>{MAX_SCORE}</span>
      </div>
    </div>
  );
};
