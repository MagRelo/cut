import { useCallback, useSyncExternalStore } from "react";
import type { SideBetPlacementPlayerDto } from "../../src/types/sideBet";
import {
  getStorybookSideBetMarketSnapshot,
  getStorybookSideBetTicketsSnapshot,
  subscribeStorybookSideBet,
} from "../../src/test/fixtures/sideBetStorybook";

export type {
  StorybookSideBetMarketMode,
  StorybookSideBetTicketsMode,
} from "../../src/test/fixtures/sideBetStorybook";
export { resetStorybookSideBetMocks } from "../../src/test/fixtures/sideBetStorybook";

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

function useMarketSnapshot() {
  return useSyncExternalStore(
    subscribeStorybookSideBet,
    getStorybookSideBetMarketSnapshot,
    getStorybookSideBetMarketSnapshot,
  );
}

function useTicketsSnapshot() {
  return useSyncExternalStore(
    subscribeStorybookSideBet,
    getStorybookSideBetTicketsSnapshot,
    getStorybookSideBetTicketsSnapshot,
  );
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
