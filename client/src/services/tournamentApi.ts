import { useCallback, useMemo } from "react";
import { type Tournament } from "../types.new/tournament";
import { type PlayerWithTournamentData } from "../types.new/player";
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
