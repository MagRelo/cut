export const WINNING_SCORE_PREDICTION_MIN = 1;
export const WINNING_SCORE_PREDICTION_MAX = 250;

export const DUPLICATE_LINEUP_PREDICTION_MESSAGE =
  "You already have a lineup with these players and winning score prediction for this tournament";

/** Inclusive range for randomized defaults on new lineups (center 120, ±25). */
export const WINNING_SCORE_PREDICTION_RANDOM_MIN = 95;
export const WINNING_SCORE_PREDICTION_RANDOM_MAX = 145;

/** Random int in [95, 145] for new or backfilled lineups. */
export function randomWinningScorePrediction(): number {
  const span =
    WINNING_SCORE_PREDICTION_RANDOM_MAX - WINNING_SCORE_PREDICTION_RANDOM_MIN + 1;
  return WINNING_SCORE_PREDICTION_RANDOM_MIN + Math.floor(Math.random() * span);
}

export function isValidWinningScorePrediction(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= WINNING_SCORE_PREDICTION_MIN &&
    value <= WINNING_SCORE_PREDICTION_MAX
  );
}
