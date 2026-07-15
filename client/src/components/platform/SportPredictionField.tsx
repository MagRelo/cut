import React from "react";
import { useOptionalEventScope } from "../../contexts/EventScopeContext";
import { useSportPredictionRules } from "../../hooks/useSportPredictionRules";
import {
  defaultPredictionMidpoint,
  predictionNumericValue,
  toLineupPredictionValue,
} from "../../lib/sportPrediction";
import { LineupWinningScoreSlider } from "../lineup/LineupWinningScoreSlider";

interface SportPredictionFieldProps {
  value: unknown;
  onChange?: (value: unknown) => void;
  disabled?: boolean;
  error?: string | null;
  readOnly?: boolean;
}

function formatPredictionBound(display: number, scale: number): string {
  return scale > 1 ? display.toFixed(1) : String(display);
}

/** Sport-aware tie-breaker slider; min/max/scale come from `predictionRules` on the sport. */
export const SportPredictionField: React.FC<SportPredictionFieldProps> = ({
  value,
  onChange,
  disabled,
  error,
  readOnly,
}) => {
  const scope = useOptionalEventScope();
  const sportId = scope?.sportId ?? "pga-golf";
  const rules = useSportPredictionRules(sportId);

  const scale = rules.displayScale ?? 1;
  const step = rules.step ?? (scale > 1 ? 1 / scale : 1);
  const label =
    rules.label ??
    (sportId === "pga-golf" ? "Tie-Breaker" : "Tie-Breaker (winning lineup pts)");
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
