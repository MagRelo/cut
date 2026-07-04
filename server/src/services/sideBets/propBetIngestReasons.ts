/** Data gaps handled by marking the market UNAVAILABLE — not cron failures. */
const UNAVAILABLE_DATA_REASONS = new Set([
  "LINEUP_NOT_FOUR_PLAYERS",
  "EVENT_NAME_MISMATCH",
  "OUTRIGHTS_EVENT_MISMATCH",
  "MISSING_PGA_TOUR_ID",
  "PLAYER_NOT_IN_FIELD",
  "MISSING_OUTRIGHTS_ROW",
  "MISSING_FINISH_DECIMAL",
  "INVALID_SNAPSHOT_METADATA",
]);

/** Expected no-ops for this lineup — not failures and not unavailable data. */
const SKIP_REASONS = new Set([
  "LINEUP_NOT_FOUND",
  "MARKET_NOT_INGESTABLE_STATE",
  "PROP_BETS_NOT_SUPPORTED_FOR_SPORT",
]);

export function isPropBetUnavailableDataReason(reason: string): boolean {
  return UNAVAILABLE_DATA_REASONS.has(reason);
}

export function isPropBetIngestSkipReason(reason: string): boolean {
  return SKIP_REASONS.has(reason);
}

/** True when cron should count the lineup ingest as a failure (API / unexpected errors). */
export function isPropBetIngestFailure(reason: string): boolean {
  if (isPropBetUnavailableDataReason(reason) || isPropBetIngestSkipReason(reason)) {
    return false;
  }
  return true;
}
