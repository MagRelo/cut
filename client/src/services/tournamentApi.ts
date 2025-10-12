import { useCallback, useMemo } from "react";
import { type Tournament } from "../types/tournament";
import { type PlayerWithTournamentData } from "../types/player";
import { type Contest } from "../types/contest";
import apiClient from "../utils/apiClient";

export type ContestWithCount = Contest & {
  _count: {
    contestLineups: number;
  };
};

export const useTournamentApi = () => {
  const getCurrentTournament = useCallback(
    () =>
      apiClient.get<{
        tournament: Tournament;
        players: PlayerWithTournamentData[];
        contests: ContestWithCount[];
      }>("/tournaments/active"),
    []
  );

  return useMemo(
    () => ({
      getCurrentTournament,
    }),
    [getCurrentTournament]
  );
};
