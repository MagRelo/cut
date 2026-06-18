import React from "react";
import type { PredictionFieldProps } from "@cut/sport-sdk/ui";
import { LineupWinningScoreSlider } from "../../components/lineup/LineupWinningScoreSlider";
import { golfPredictionValue, toGolfPrediction } from "../../lib/golfPrediction";

export const GolfPredictionField: React.FC<PredictionFieldProps> = ({
  value,
  onChange,
  disabled,
  error,
  readOnly,
}) => {
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
