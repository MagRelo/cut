import React from "react";
import type { PredictionFieldProps } from "@cut/sport-sdk/ui";
import { parseLineupPrediction, toLineupPrediction } from "@cut/sport-sdk";
import { totalToDisplayScore } from "@cut/sport-commodities";
import { useOptionalEventScope } from "../../contexts/EventScopeContext";
import { useSportPredictionRules } from "../../hooks/useSportPredictionRules";
import { defaultPredictionMidpoint } from "../../lib/sportPrediction";

function storedToDisplay(stored: number): number {
  return totalToDisplayScore(stored);
}

function displayToStored(display: number): number {
  return Math.round(display * 10);
}

export const CommodityPredictionField: React.FC<PredictionFieldProps> = ({
  value,
  onChange,
  disabled,
  error,
  readOnly,
}) => {
  const scope = useOptionalEventScope();
  const rules = useSportPredictionRules(scope?.sportId ?? "commodities");
  const stored =
    parseLineupPrediction(value) ?? displayToStored(defaultPredictionMidpoint(rules));
  const display = storedToDisplay(stored);
  const minDisplay = storedToDisplay(rules.min);
  const maxDisplay = storedToDisplay(rules.max);

  return (
    <div className="border-t border-gray-100 p-3">
      {readOnly ? (
        <div className="flex items-baseline justify-between gap-3 font-display">
          <span
            id="commodities-lineup-points-prediction"
            className="text-sm font-semibold text-gray-700"
          >
            Tie-Breaker (winning lineup pts)
          </span>
          <span className="text-base font-bold tabular-nums leading-none text-gray-900">
            {display.toFixed(1)}
          </span>
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-baseline justify-between gap-3 font-display">
            <span
              id="commodities-lineup-points-prediction"
              className="text-sm font-semibold text-gray-700"
            >
              Tie-Breaker (winning lineup pts)
            </span>
            <span className="text-base font-bold tabular-nums leading-none text-gray-900">
              {display.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={minDisplay}
              max={maxDisplay}
              step={0.1}
              value={display}
              disabled={disabled}
              onChange={(event) =>
                onChange?.(toLineupPrediction(displayToStored(Number(event.target.value))))
              }
              className="h-2 w-full flex-1 accent-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
              aria-labelledby="commodities-lineup-points-prediction"
            />
          </div>
          <div className="mt-1 flex justify-between px-0.5 font-display text-[10px] font-medium text-gray-400">
            <span>{minDisplay.toFixed(1)}</span>
            <span>{maxDisplay.toFixed(1)}</span>
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
