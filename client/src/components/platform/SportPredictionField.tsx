import React from "react";
import { useSportUIPlugin } from "../../hooks/useSportUI";
import { LineupWinningScoreSlider } from "../lineup/LineupWinningScoreSlider";
import { golfPredictionValue, toGolfPrediction } from "../../lib/golfPrediction";

interface SportPredictionFieldProps {
  value: unknown;
  onChange?: (value: unknown) => void;
  disabled?: boolean;
  error?: string | null;
  readOnly?: boolean;
}

/** Sport-aware prediction input; falls back to golf slider when no plugin field is registered. */

export const SportPredictionField: React.FC<SportPredictionFieldProps> = ({
  value,
  onChange,
  disabled,
  error,
  readOnly,
}) => {
  const plugin = useSportUIPlugin();
  const PredictionField = plugin?.PredictionField;

  if (PredictionField) {
    return (
      <PredictionField
        value={value}
        onChange={onChange}
        disabled={disabled}
        error={error}
        readOnly={readOnly}
      />
    );
  }

  const numeric = golfPredictionValue(value) ?? 100;
  return (
    <LineupWinningScoreSlider
      value={numeric}
      disabled={disabled}
      error={error}
      readOnly={readOnly}
      onChange={readOnly ? undefined : (next) => onChange?.(toGolfPrediction(next))}
    />
  );
};
