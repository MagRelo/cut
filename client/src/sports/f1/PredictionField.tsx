import React from "react";
import type { PredictionFieldProps } from "@cut/sport-sdk/ui";
import {
  F1_PREDICTION_MAX,
  F1_PREDICTION_MIN,
  f1PredictionValue,
  toF1Prediction,
} from "../../lib/f1Prediction";

export const F1PredictionField: React.FC<PredictionFieldProps> = ({
  value,
  onChange,
  disabled,
  error,
  readOnly,
}) => {
  const numeric = f1PredictionValue(value) ?? 60;

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
              min={F1_PREDICTION_MIN}
              max={F1_PREDICTION_MAX}
              value={numeric}
              disabled={disabled}
              onChange={(event) => onChange?.(toF1Prediction(Number(event.target.value)))}
              className="h-2 w-full flex-1 accent-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              aria-labelledby="f1-lineup-points-prediction"
            />
          </div>
          <div className="mt-1 flex justify-between px-0.5 font-display text-[10px] font-medium text-gray-400">
            <span>{F1_PREDICTION_MIN}</span>
            <span>{F1_PREDICTION_MAX}</span>
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
