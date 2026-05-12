import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../utils/apiClient";
import type { SideBetMarketResponse, SideBetTicketsListResponse } from "../types/sideBet";
import { queryKeys } from "../utils/queryKeys";

export type PlaceSideBetTicketPayload = {
  tournamentLineupId: string;
  hitsRequired: number;
  topN: number;
  stakeAmount: number;
  /** When set, server may create a `REFUND_PENDING` ticket if booking fails after on-chain stake. */
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
};

export function useSideBetMarketQuery(tournamentLineupId: string | null | undefined) {
  return useQuery({
    queryKey: tournamentLineupId
      ? queryKeys.sideBet.market(tournamentLineupId)
      : (["sideBetMarket", "none"] as const),
    enabled: Boolean(tournamentLineupId),
    queryFn: async () => {
      const id = tournamentLineupId as string;
      return apiClient.get<SideBetMarketResponse>(`/bets/side/lineup/${id}/market`, {
        requiresAuth: true,
      });
    },
    /** Odds must track roster and quote version; treat as stale so refetches are not delayed. */
    staleTime: 0,
    refetchInterval: 60_000,
  });
}

/** GET /bets/side/tickets?lineupId= — works when market GET is unavailable or errors. */
export function useSideBetTicketsForLineupQuery(tournamentLineupId: string | null | undefined) {
  return useQuery({
    queryKey: tournamentLineupId
      ? queryKeys.sideBet.tickets(tournamentLineupId)
      : (["sideBetTickets", "none"] as const),
    enabled: Boolean(tournamentLineupId),
    queryFn: async () => {
      const id = tournamentLineupId as string;
      return apiClient.get<SideBetTicketsListResponse>(
        `/bets/side/tickets?lineupId=${encodeURIComponent(id)}`,
        { requiresAuth: true },
      );
    },
    staleTime: 45_000,
    refetchInterval: 60_000,
  });
}

export function usePlaceSideBetTicketMutation(tournamentLineupId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PlaceSideBetTicketPayload) => {
      return apiClient.post<PlaceSideBetTicketResult>("/bets/side/tickets", payload, {
        requiresAuth: true,
      });
    },
    onSuccess: () => {
      if (tournamentLineupId) {
        void qc.invalidateQueries({ queryKey: queryKeys.sideBet.market(tournamentLineupId) });
        void qc.invalidateQueries({ queryKey: queryKeys.sideBet.tickets(tournamentLineupId) });
      }
    },
  });
}
