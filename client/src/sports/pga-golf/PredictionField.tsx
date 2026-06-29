import React from "react";
import type { PredictionFieldProps } from "@cut/sport-sdk/ui";
import { parseLineupPrediction, toLineupPrediction } from "@cut/sport-sdk";
import { LineupWinningScoreSlider } from "../../components/lineup/LineupWinningScoreSlider";
import { useOptionalEventScope } from "../../contexts/EventScopeContext";
import { useSportPredictionRules } from "../../hooks/useSportPredictionRules";
import { defaultPredictionMidpoint } from "../../lib/sportPrediction";

export const GolfPredictionField: React.FC<PredictionFieldProps> = ({
  value,
  onChange,
  disabled,
  error,
  readOnly,
}) => {
  const scope = useOptionalEventScope();
  const rules = useSportPredictionRules(scope?.sportId ?? "pga-golf");
  const numeric = parseLineupPrediction(value) ?? defaultPredictionMidpoint(rules);

  return (
    <LineupWinningScoreSlider
      value={numeric}
      min={rules.min}
      max={rules.max}
      disabled={disabled}
      error={error}
      readOnly={readOnly}
      onChange={readOnly ? undefined : (next) => onChange?.(toLineupPrediction(next))}
    />
  );
};
