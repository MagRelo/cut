export const WINNING_SCORE_PREDICTION_MIN = 1;
export const WINNING_SCORE_PREDICTION_MAX = 250;

export const DUPLICATE_LINEUP_PREDICTION_MESSAGE =
  "You already have a lineup with these players and winning score prediction for this contest";

/** Inclusive range for randomized defaults on new lineups (center 120, ±25). */
export const WINNING_SCORE_PREDICTION_RANDOM_MIN = 95;
export const WINNING_SCORE_PREDICTION_RANDOM_MAX = 145;

/** Deterministic default in [95, 145] for display before server value loads. */
export function defaultWinningScorePredictionForLineup(lineupId: string): number {
  let hash = 0;
  for (let i = 0; i < lineupId.length; i++) {
    hash = (hash * 31 + lineupId.charCodeAt(i)) | 0;
  }
  const span =
    WINNING_SCORE_PREDICTION_RANDOM_MAX - WINNING_SCORE_PREDICTION_RANDOM_MIN + 1;
  return WINNING_SCORE_PREDICTION_RANDOM_MIN + (Math.abs(hash) % span);
}
