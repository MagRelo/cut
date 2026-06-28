/** Client mirror of @cut/sport-f1 f1PredictionValue. */
export function f1PredictionValue(prediction: unknown): number | null {
  if (!prediction || typeof prediction !== "object" || Array.isArray(prediction)) {
    return null;
  }
  const record = prediction as Record<string, unknown>;
  if (record.type === "winningLineupPoints" && typeof record.value === "number") {
    return record.value;
  }
  return null;
}

export function toF1Prediction(value: number | null | undefined): unknown {
  if (value == null) return null;
  return { type: "winningLineupPoints", value };
}

export const F1_PREDICTION_MIN = 1;
export const F1_PREDICTION_MAX = 120;
