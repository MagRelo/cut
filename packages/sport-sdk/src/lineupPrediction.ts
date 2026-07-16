export const LINEUP_PREDICTION_TYPE = "winningLineupTotal" as const;

export interface PredictionRules {
  min: number;
  max: number;
  defaultRandomMin: number;
  defaultRandomMax: number;
  /** Slider label. */
  label?: string;
  /** Helper text under the label in the lineup editor. */
  description?: string;
  /** Stored value ÷ displayScale = UI value (default 1). */
  displayScale?: number;
  /** Slider step in UI units (default 1, or 1/displayScale when scaled). */
  step?: number;
}

export interface LineupPrediction {
  type: typeof LINEUP_PREDICTION_TYPE;
  value: number;
}

export function parseLineupPrediction(prediction: unknown): number | null {
  if (!prediction || typeof prediction !== "object" || Array.isArray(prediction)) {
    return null;
  }
  const record = prediction as Record<string, unknown>;
  if (record.type === LINEUP_PREDICTION_TYPE && typeof record.value === "number") {
    return record.value;
  }
  return null;
}

export function toLineupPrediction(value: number | null | undefined): LineupPrediction | null {
  if (value == null) {
    return null;
  }
  return { type: LINEUP_PREDICTION_TYPE, value };
}

export function isValidLineupPrediction(value: unknown, rules: PredictionRules): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= rules.min &&
    value <= rules.max
  );
}

export function randomLineupPrediction(rules: PredictionRules): number {
  const span = rules.defaultRandomMax - rules.defaultRandomMin + 1;
  return rules.defaultRandomMin + Math.floor(Math.random() * span);
}

export function defaultLineupPredictionForLineupId(
  lineupId: string,
  rules: PredictionRules,
): number {
  let hash = 0;
  for (let i = 0; i < lineupId.length; i++) {
    hash = (hash * 31 + lineupId.charCodeAt(i)) | 0;
  }
  const span = rules.defaultRandomMax - rules.defaultRandomMin + 1;
  return rules.defaultRandomMin + (Math.abs(hash) % span);
}

export function defaultLineupPredictionMidpoint(rules: PredictionRules): number {
  return Math.round((rules.min + rules.max) / 2);
}
