import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTournamentData } from "./useTournamentData";

interface AppLoadingGateState {
  isBlockingLoad: boolean;
  authLoading: boolean;
  /** True only until the first successful active tournament payload; background refetches do not block. */
  tournamentLoading: boolean;
}

export function useAppLoadingGate(): AppLoadingGateState {
  const { loading: authLoading, user } = useAuth();
  const { isLoading: tournamentInitialLoading } = useTournamentData();

  // Block only until we have cached or first-fetched tournament data; do not block on refetchInterval / stale refetches.
  const tournamentLoading = tournamentInitialLoading;
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
