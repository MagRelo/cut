import React from "react";
import type { PredictionFieldProps } from "@cut/sport-sdk/ui";
import { parseLineupPrediction, toLineupPrediction } from "@cut/sport-sdk";
import { useOptionalEventScope } from "../../contexts/EventScopeContext";
import { useSportPredictionRules } from "../../hooks/useSportPredictionRules";
import { defaultPredictionMidpoint } from "../../lib/sportPrediction";

export const F1PredictionField: React.FC<PredictionFieldProps> = ({
  value,
  onChange,
  disabled,
  error,
  readOnly,
}) => {
  const scope = useOptionalEventScope();
  const rules = useSportPredictionRules(scope?.sportId ?? "f1");
  const numeric = parseLineupPrediction(value) ?? defaultPredictionMidpoint(rules);

  return (
    <div className="border-t border-gray-100 p-3">
      {readOnly ? (
        <div className="flex items-baseline justify-between gap-3 font-display">
          <span
            id="f1-lineup-points-prediction"
            className="text-sm font-semibold text-gray-700"
          >
            Tie-Breaker (winning lineup pts)
          </span>
          <span className="text-base font-bold tabular-nums leading-none text-gray-900">
            {numeric}
          </span>
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-baseline justify-between gap-3 font-display">
            <span
              id="f1-lineup-points-prediction"
              className="text-sm font-semibold text-gray-700"
            >
              Tie-Breaker (winning lineup pts)
            </span>
            <span className="text-base font-bold tabular-nums leading-none text-gray-900">
              {numeric}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={rules.min}
              max={rules.max}
              value={numeric}
              disabled={disabled}
              onChange={(event) => onChange?.(toLineupPrediction(Number(event.target.value)))}
              className="h-2 w-full flex-1 accent-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              aria-labelledby="f1-lineup-points-prediction"
            />
          </div>
          <div className="mt-1 flex justify-between px-0.5 font-display text-[10px] font-medium text-gray-400">
            <span>{rules.min}</span>
            <span>{rules.max}</span>
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
