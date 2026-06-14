/** Client mirror of @cut/sport-pga-golf golfPredictionValue (avoids bundling server package). */
export function golfPredictionValue(prediction: unknown): number | null {
  if (!prediction || typeof prediction !== "object" || Array.isArray(prediction)) {
    return null;
  }
  const record = prediction as Record<string, unknown>;
  if (record.type === "winningScore" && typeof record.value === "number") {
    return record.value;
  }
  return null;
}

export function toGolfPrediction(value: number | null | undefined): unknown {
  if (value == null) return null;
  return { type: "winningScore", value };
}
