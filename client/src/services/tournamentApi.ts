import { useCallback, useMemo } from "react";
import { type Tournament } from "../types/tournament";
import { type PlayerWithTournamentData } from "../types/player";
import apiClient from "../utils/apiClient";

export const useTournamentApi = () => {
  const getCurrentTournament = useCallback(
    () =>
      apiClient.get<{
        tournament: Tournament;
        players: PlayerWithTournamentData[];
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
