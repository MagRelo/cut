import type { SideBetMarketResponse, SideBetMarketSelectionDto } from "../../../../types/sideBet";
import { PARLAY_MARKET_CLOSED, PARLAY_MARKET_UNAVAILABLE } from "../shared/sideBetConstants";

const CLOSED_MARKET_STATUSES = new Set([
  "LOCKED",
  "SETTLING",
  "SETTLED",
  "VOID",
  "CLOSED",
]);

export type SideBetMarketVisualState =
  | { kind: "hidden" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "unavailable"; message: string }
  | { kind: "ready"; selections: SideBetMarketSelectionDto[] };

export type SideBetMarketQuerySnapshot = {
  data?: SideBetMarketResponse | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
};

export function resolveSideBetMarketState(
  lineupId: string | null,
  query: SideBetMarketQuerySnapshot,
): SideBetMarketVisualState {
  if (!lineupId) return { kind: "hidden" };
  if (query.data == null && (query.isLoading || query.isFetching)) {
    return { kind: "loading" };
  }
  if (query.isError) {
    return { kind: "error", message: PARLAY_MARKET_UNAVAILABLE };
  }
  if (query.data != null && query.data.bettable !== true) {
    const status = query.data.marketStatus;
    const message =
      status != null && CLOSED_MARKET_STATUSES.has(status)
        ? PARLAY_MARKET_CLOSED
        : PARLAY_MARKET_UNAVAILABLE;
    return { kind: "unavailable", message };
  }
  return { kind: "ready", selections: query.data?.selections ?? [] };
}

/** Grid UI when lineup exists but market is not hidden. */
export type SideBetMarketGridState = Exclude<SideBetMarketVisualState, { kind: "hidden" }>;

export function toMarketGridState(
  state: SideBetMarketVisualState,
): SideBetMarketGridState | null {
  if (state.kind === "hidden") return null;
  return state;
}
