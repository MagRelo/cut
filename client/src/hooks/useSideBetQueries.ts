import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../utils/apiClient";
import type {
  SideBetMarketResponse,
  SideBetPlacementPlayerDto,
  SideBetTicketsListResponse,
} from "../types/sideBet";
import { queryKeys } from "../utils/queryKeys";

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

export function useSideBetMarketQuery(lineupId: string | null | undefined) {
  return useQuery({
    queryKey: lineupId
      ? queryKeys.sideBet.market(lineupId)
      : (["sideBetMarket", "none"] as const),
    enabled: Boolean(lineupId),
    queryFn: async () => {
      const id = lineupId as string;
      return apiClient.get<SideBetMarketResponse>(`/bets/side/lineup/${id}/market`, {
        requiresAuth: true,
      });
    },
    staleTime: 0,
    refetchInterval: 60_000,
  });
}

export function useSideBetTicketsForLineupQuery(lineupId: string | null | undefined) {
  return useQuery({
    queryKey: lineupId
      ? queryKeys.sideBet.tickets(lineupId)
      : (["sideBetTickets", "none"] as const),
    enabled: Boolean(lineupId),
    queryFn: async () => {
      const id = lineupId as string;
      return apiClient.get<SideBetTicketsListResponse>(
        `/bets/side/tickets?lineupId=${encodeURIComponent(id)}`,
        { requiresAuth: true },
      );
    },
    staleTime: 45_000,
    refetchInterval: 60_000,
  });
}

export function usePlaceSideBetTicketMutation(lineupId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PlaceSideBetTicketPayload) => {
      return apiClient.post<PlaceSideBetTicketResult>("/bets/side/tickets", payload, {
        requiresAuth: true,
      });
    },
    onSuccess: () => {
      if (lineupId) {
        void qc.invalidateQueries({ queryKey: queryKeys.sideBet.market(lineupId) });
        void qc.invalidateQueries({ queryKey: queryKeys.sideBet.tickets(lineupId) });
      }
    },
  });
}
