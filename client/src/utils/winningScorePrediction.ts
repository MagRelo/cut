export const WINNING_SCORE_PREDICTION_MIN = 1;
export const WINNING_SCORE_PREDICTION_MAX = 250;

export const DUPLICATE_LINEUP_PREDICTION_MESSAGE =
  "You already have a lineup with these players and winning score prediction for this tournament";

/** Deterministic default in 125–175 for display before server value loads. */
export function defaultWinningScorePredictionForLineup(lineupId: string): number {
  let hash = 0;
  for (let i = 0; i < lineupId.length; i++) {
    hash = (hash * 31 + lineupId.charCodeAt(i)) | 0;
  }
  return 125 + (Math.abs(hash) % 51);
}
