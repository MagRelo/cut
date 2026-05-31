import { useMemo } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { resolveTournamentRoundNumber } from "../../src/components/player/playerRoundUtils";
import type {
  ActiveTournamentLiveResponse,
  ActiveTournamentShellResponse,
  ActiveTournamentState,
} from "../../src/hooks/useTournamentData";
import {
  buildLineupFieldPlayers,
  buildStorybookTournamentLive,
  buildStorybookTournamentShell,
} from "../../src/test/fixtures/lineupContestCardMock";
import { mergeTournament } from "../../src/types/tournament";

const shellData: ActiveTournamentShellResponse = {
  tournament: buildStorybookTournamentShell(),
};

const liveData: ActiveTournamentLiveResponse = {
  tournament: buildStorybookTournamentLive(),
  players: buildLineupFieldPlayers(),
};

const noopRefetch = async () => undefined;

const idleQueryState = {
  isLoading: false,
  isFetching: false,
  error: null,
  refetch: noopRefetch,
};

/** Week/setup fields (GET /tournaments/active/shell). */
export function useTournamentShell() {
  return {
    data: shellData,
    ...idleQueryState,
  };
}

/** Cron-updated round status + player scores (GET /tournaments/active/live). */
export function useActiveTournamentLive(_tournamentId?: string) {
  return {
    data: liveData,
    ...idleQueryState,
  };
}

/** Primary hook: merged tournament + live players + derived flags. */
export function useActiveTournament(): ActiveTournamentState {
  const tournament = useMemo(
    () => mergeTournament(shellData.tournament, liveData.tournament),
    [],
  );

  return {
    tournament,
    players: liveData.players,
    isLoading: false,
    isFetching: false,
    error: null,
    isTournamentEditable: true,
    tournamentStatusDisplay: "Not Started",
    refetch: noopRefetch,
  };
}

/** Active tournament round label and 1–4 number for scorecard / player UI. */
export function useActiveTournamentRound() {
  const { tournament } = useActiveTournament();
  const roundDisplay = tournament?.roundDisplay ?? "R1";
  const currentRound = tournament?.currentRound;
  const roundNumber = resolveTournamentRoundNumber(roundDisplay, currentRound);
  return { tournament, roundDisplay, currentRound, roundNumber };
}

export async function prefetchTournamentShell(_queryClient: QueryClient) {
  return undefined;
}

export async function prefetchActiveTournamentLive(
  _queryClient: QueryClient,
  _tournamentId: string,
) {
  return undefined;
}

export async function prefetchActiveTournament(_queryClient: QueryClient) {
  return undefined;
}
