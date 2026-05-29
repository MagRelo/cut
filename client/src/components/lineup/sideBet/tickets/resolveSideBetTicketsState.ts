import type {
  SideBetMarketTicketDto,
  SideBetTicketListItemDto,
  SideBetTicketsListResponse,
} from "../../../../types/sideBet";
import { SIDE_BET_TICKETS_LOAD_ERROR } from "../shared/sideBetConstants";

export type SideBetTicketsVisualState =
  | { kind: "hidden" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "empty" }
  | { kind: "ready"; tickets: SideBetMarketTicketDto[] };

export type SideBetTicketsQuerySnapshot = {
  data?: SideBetTicketsListResponse | null;
  isLoading: boolean;
  isError: boolean;
};

export function mapTicketListItem(t: SideBetTicketListItemDto): SideBetMarketTicketDto {
  return {
    id: t.id,
    hitsRequired: t.hitsRequired,
    topN: t.topN,
    stakeAmount: t.stakeAmount,
    decimalOddsAtPlacement: t.decimalOddsAtPlacement,
    americanDisplayAtPlacement: t.americanDisplayAtPlacement,
    quoteVersionAtPlacement: t.quoteVersionAtPlacement,
    status: t.status,
    createdAt: t.createdAt,
    playerIds: t.playerIds ?? [],
    placementPlayers: t.placementPlayers ?? [],
  };
}

export function sortTicketsNewestFirst(tickets: SideBetMarketTicketDto[]): SideBetMarketTicketDto[] {
  return [...tickets].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function resolveSideBetTicketsState(
  tournamentLineupId: string | null,
  query: SideBetTicketsQuerySnapshot,
): SideBetTicketsVisualState {
  if (!tournamentLineupId) return { kind: "hidden" };
  if (query.isLoading && query.data == null) return { kind: "loading" };
  if (query.isError) return { kind: "error", message: SIDE_BET_TICKETS_LOAD_ERROR };
  const tickets = sortTicketsNewestFirst(
    (query.data?.tickets ?? []).map(mapTicketListItem),
  );
  if (tickets.length === 0) return { kind: "empty" };
  return { kind: "ready", tickets };
}
