export const WINNING_SCORE_PREDICTION_MIN = 1;
export const WINNING_SCORE_PREDICTION_MAX = 250;

export const DUPLICATE_LINEUP_PREDICTION_MESSAGE =
  "You already have a lineup with these players and winning score prediction for this tournament";

/** Random int in [125, 175] for new or backfilled lineups. */
export function randomWinningScorePrediction(): number {
  return 125 + Math.floor(Math.random() * 51);
}

export function isValidWinningScorePrediction(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= WINNING_SCORE_PREDICTION_MIN &&
    value <= WINNING_SCORE_PREDICTION_MAX
  );
}
