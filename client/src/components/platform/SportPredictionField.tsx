import React from "react";
import { useSportPredictionRules } from "../../hooks/useSportPredictionRules";
import {
  defaultPredictionMidpoint,
  predictionNumericValue,
  toLineupPredictionValue,
} from "../../lib/sportPrediction";
import { LineupWinningScoreSlider } from "../lineup/LineupWinningScoreSlider";

interface SportPredictionFieldProps {
  sportId: string;
  value: unknown;
  onChange?: (value: unknown) => void;
  disabled?: boolean;
  error?: string | null;
  readOnly?: boolean;
}

function formatPredictionBound(display: number, scale: number): string {
  return scale > 1 ? display.toFixed(1) : String(display);
}

/** Tie-break slider driven by `predictionRules` for `sportId`. */
export const SportPredictionField: React.FC<SportPredictionFieldProps> = ({
  sportId,
  value,
  onChange,
  disabled,
  error,
  readOnly,
}) => {
  const rules = useSportPredictionRules(sportId);
  if (!rules) return null;

  const scale = rules.displayScale ?? 1;
  const step = rules.step ?? (scale > 1 ? 1 / scale : 1);
  const label = rules.label ?? "Tie-Breaker";
  const stored = predictionNumericValue(value) ?? defaultPredictionMidpoint(rules);
  const display = stored / scale;

  return (
    <LineupWinningScoreSlider
      id={`${sportId}-lineup-points-prediction`}
      label={label}
      description={rules.description}
      value={display}
      min={rules.min / scale}
      max={rules.max / scale}
      step={step}
      formatValue={(next) => formatPredictionBound(next, scale)}
      formatBound={(bound) => formatPredictionBound(bound, scale)}
      disabled={disabled}
      error={error}
      readOnly={readOnly}
      onChange={
        readOnly
          ? undefined
          : (next) => onChange?.(toLineupPredictionValue(Math.round(next * scale)))
      }
    />
  );
};
