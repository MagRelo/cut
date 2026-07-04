import { useCallback, useSyncExternalStore } from "react";
import type {
  SideBetMarketResponse,
  SideBetPlacementPlayerDto,
  SideBetTicketsListResponse,
} from "../../src/types/sideBet";
import {
  buildBettableSideBetMarket,
  buildSideBetTicketsFixture,
} from "../../src/test/fixtures/sideBetMock";

export type PlaceSideBetTicketPayload = {
  lineupId: string;
  hitsRequired: number;
  topN: number;
  stakeAmount: number;
  transactionHashes?: string[];
};

export type PlaceSideBetTicketResult = {
  id: string;
  hitsRequired: number;
  topN: number;
  stakeAmount: number;
  decimalOddsAtPlacement: number;
  americanDisplayAtPlacement: string;
  quoteVersionAtPlacement: number;
  status: string;
  playerIds: string[];
  placementPlayers: SideBetPlacementPlayerDto[];
};

export type StorybookSideBetMarketMode =
  | "bettable"
  | "closed"
  | "unavailable"
  | "loading"
  | "error";

export type StorybookSideBetTicketsMode = "withTickets" | "empty" | "loading" | "error";

type MarketSnapshot =
  | { kind: "ready"; data: SideBetMarketResponse }
  | { kind: "loading" }
  | { kind: "error" };

type TicketsSnapshot =
  | { kind: "ready"; data: SideBetTicketsListResponse }
  | { kind: "loading" }
  | { kind: "error" };

let marketSnapshot: MarketSnapshot = {
  kind: "ready",
  data: buildBettableSideBetMarket(),
};
let ticketsSnapshot: TicketsSnapshot = {
  kind: "ready",
  data: buildSideBetTicketsFixture(),
};

const subscribers = new Set<() => void>();

function emitChange() {
  subscribers.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

function getMarketSnapshot() {
  return marketSnapshot;
}

function getTicketsSnapshot() {
  return ticketsSnapshot;
}

function marketForMode(mode: StorybookSideBetMarketMode): MarketSnapshot {
  switch (mode) {
    case "loading":
      return { kind: "loading" };
    case "error":
      return { kind: "error" };
    case "closed":
      return {
        kind: "ready",
        data: buildBettableSideBetMarket({ bettable: false, marketStatus: "LOCKED" }),
      };
    case "unavailable":
      return {
        kind: "ready",
        data: buildBettableSideBetMarket({ bettable: false, marketStatus: "PENDING" }),
      };
    case "bettable":
    default:
      return { kind: "ready", data: buildBettableSideBetMarket() };
  }
}

function ticketsForMode(mode: StorybookSideBetTicketsMode): TicketsSnapshot {
  switch (mode) {
    case "loading":
      return { kind: "loading" };
    case "error":
      return { kind: "error" };
    case "empty":
      return { kind: "ready", data: { tickets: [] } };
    case "withTickets":
    default:
      return { kind: "ready", data: buildSideBetTicketsFixture() };
  }
}

export function resetStorybookSideBetMocks(options?: {
  market?: StorybookSideBetMarketMode;
  tickets?: StorybookSideBetTicketsMode;
}) {
  marketSnapshot = marketForMode(options?.market ?? "bettable");
  ticketsSnapshot = ticketsForMode(options?.tickets ?? "withTickets");
  emitChange();
}

function useMarketSnapshot() {
  return useSyncExternalStore(subscribe, getMarketSnapshot);
}

function useTicketsSnapshot() {
  return useSyncExternalStore(subscribe, getTicketsSnapshot);
}

export function useSideBetMarketQuery(lineupId: string | null | undefined) {
  const snapshot = useMarketSnapshot();

  if (!lineupId) {
    return {
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: false,
      isPending: false,
      refetch: async () => undefined,
    };
  }

  if (snapshot.kind === "loading") {
    return {
      data: undefined,
      isLoading: true,
      isFetching: true,
      isError: false,
      isPending: true,
      refetch: async () => undefined,
    };
  }

  if (snapshot.kind === "error") {
    return {
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      isPending: false,
      refetch: async () => undefined,
    };
  }

  return {
    data: snapshot.data,
    isLoading: false,
    isFetching: false,
    isError: false,
    isPending: false,
    refetch: async () => snapshot.data,
  };
}

export function useSideBetTicketsForLineupQuery(lineupId: string | null | undefined) {
  const snapshot = useTicketsSnapshot();

  if (!lineupId) {
    return {
      data: undefined,
      isLoading: false,
      isError: false,
      isPending: false,
      refetch: async () => undefined,
    };
  }

  if (snapshot.kind === "loading") {
    return {
      data: undefined,
      isLoading: true,
      isError: false,
      isPending: true,
      refetch: async () => undefined,
    };
  }

  if (snapshot.kind === "error") {
    return {
      data: undefined,
      isLoading: false,
      isError: true,
      isPending: false,
      refetch: async () => undefined,
    };
  }

  return {
    data: snapshot.data,
    isLoading: false,
    isError: false,
    isPending: false,
    refetch: async () => snapshot.data,
  };
}

export function usePlaceSideBetTicketMutation(_lineupId: string | null | undefined) {
  const mutateAsync = useCallback(async (payload: PlaceSideBetTicketPayload) => {
    const result: PlaceSideBetTicketResult = {
      id: `ticket-${Date.now()}`,
      hitsRequired: payload.hitsRequired,
      topN: payload.topN,
      stakeAmount: payload.stakeAmount,
      decimalOddsAtPlacement: 3.1,
      americanDisplayAtPlacement: "+210",
      quoteVersionAtPlacement: 1,
      status: "OPEN",
      playerIds: [],
      placementPlayers: [],
    };
    return result;
  }, []);

  return {
    mutateAsync,
    isPending: false,
  };
}
