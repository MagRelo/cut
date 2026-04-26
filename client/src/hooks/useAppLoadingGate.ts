import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTournamentData } from "./useTournamentData";

interface AppLoadingGateState {
  isBlockingLoad: boolean;
  authLoading: boolean;
  tournamentLoading: boolean;
}

export function useAppLoadingGate(): AppLoadingGateState {
  const { loading: authLoading, user } = useAuth();
  const { isLoading: tournamentInitialLoading, isFetching: tournamentFetching } = useTournamentData();

  // Product decision: block the app on both cold start and subsequent tournament refreshes.
  const tournamentLoading = tournamentInitialLoading || tournamentFetching;
  // Treat auth loading as blocking only when user has not been resolved yet.
  const authBlocking = authLoading && !user;
  const isBlockingLoad = authBlocking || tournamentLoading;

  return useMemo(
    () => ({
      isBlockingLoad,
      authLoading,
      tournamentLoading,
    }),
    [authLoading, isBlockingLoad, tournamentLoading],
  );
}
