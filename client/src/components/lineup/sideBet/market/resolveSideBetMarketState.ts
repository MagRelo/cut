import type { SideBetMarketResponse, SideBetMarketSelectionDto } from "../../../../types/sideBet";
import { PARLAY_MARKET_UNAVAILABLE } from "../shared/sideBetConstants";

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
  tournamentLineupId: string | null,
  query: SideBetMarketQuerySnapshot,
): SideBetMarketVisualState {
  if (!tournamentLineupId) return { kind: "hidden" };
  if (query.data == null && (query.isLoading || query.isFetching)) {
    return { kind: "loading" };
  }
  if (query.isError) {
    return { kind: "error", message: PARLAY_MARKET_UNAVAILABLE };
  }
  if (query.data != null && query.data.bettable !== true) {
    return {
      kind: "unavailable",
      message: query.data.unavailableReason ?? PARLAY_MARKET_UNAVAILABLE,
    };
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
