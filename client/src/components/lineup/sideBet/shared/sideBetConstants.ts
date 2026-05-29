/** Minimum stake shown as dollars (matches 1:1 on-chain platform units in this app). */
export const MIN_STAKE = "0.01";

/** Total return (stake × decimal odds) must stay strictly below this USD amount per ticket. */
export const MAX_TICKET_PAYOUT_USD = 2000;

/** Server / market quote issues only — not used for wallet, stake, or payment-prep errors. */
export const PARLAY_MARKET_UNAVAILABLE =
  "Parlay market is not available right now; check back soon.";

/** Market lifecycle closed for new tickets (LOCKED and later statuses). */
export const PARLAY_MARKET_CLOSED = "Parlay market has been closed for this event.";

export const SIDE_BET_TICKETS_LOAD_ERROR =
  "Could not load your ticket list. Try again in a moment.";

export const SIDE_BET_CELL_MIN_H = "min-h-[2.75rem]";

/** Fixed market grid area — header row + 3 data rows + gaps (matches grid layout). */
export const SIDE_BET_MARKET_GRID_H = "h-[12rem]";

export type SideBetRow = "2 of 4" | "3 of 4" | "4 of 4";
export type SideBetCol = "Top 5" | "Top 10" | "Top 20";

export const SIDE_BET_COLUMNS: SideBetCol[] = ["Top 5", "Top 10", "Top 20"];
export const ROW_ORDER: SideBetRow[] = ["2 of 4", "3 of 4", "4 of 4"];
