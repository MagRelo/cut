import React from "react";
import { useOptionalEventScope } from "../../contexts/EventScopeContext";
import { useSportUIPlugin } from "../../hooks/useSportUI";
import { useSportPredictionRules } from "../../hooks/useSportPredictionRules";
import { LineupWinningScoreSlider } from "../lineup/LineupWinningScoreSlider";
import {
  defaultPredictionMidpoint,
  predictionNumericValue,
  toLineupPredictionValue,
} from "../../lib/sportPrediction";

interface SportPredictionFieldProps {
  value: unknown;
  onChange?: (value: unknown) => void;
  disabled?: boolean;
  error?: string | null;
  readOnly?: boolean;
}

/** Sport-aware prediction input; falls back to generic slider when no plugin field is registered. */

export const SportPredictionField: React.FC<SportPredictionFieldProps> = ({
  value,
  onChange,
  disabled,
  error,
  readOnly,
}) => {
  const plugin = useSportUIPlugin();
  const scope = useOptionalEventScope();
  const sportId = scope?.sportId ?? "pga-golf";
  const rules = useSportPredictionRules(sportId);
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

  const numeric = predictionNumericValue(value) ?? defaultPredictionMidpoint(rules);
  return (
    <LineupWinningScoreSlider
      value={numeric}
      min={rules.min}
      max={rules.max}
      disabled={disabled}
      error={error}
      readOnly={readOnly}
      onChange={readOnly ? undefined : (next) => onChange?.(toLineupPredictionValue(next))}
    />
  );
};
