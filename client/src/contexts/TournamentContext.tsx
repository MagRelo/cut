import { createContext, useContext, ReactNode } from "react";
import { type Tournament } from "../types/tournament";
import { type PlayerWithTournamentData } from "../types/player";
import { useTournamentData, type ContestWithCount } from "../hooks/useTournamentData";

interface TournamentContextType {
  currentTournament: Tournament | null;
  players: PlayerWithTournamentData[];
  contests: ContestWithCount[];
  isLoading: boolean;
  error: Error | null;
  isTournamentEditable: boolean;
  tournamentStatusDisplay: string;
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

interface TournamentProviderProps {
  children: ReactNode;
}

/**
 * TournamentProvider - now powered by React Query
 *
 * Benefits of the migration:
 * - Removed 40+ lines of manual state management
 * - No more useEffect dependencies or race conditions
 * - Automatic background refetching every 10 minutes
 * - Data cached and shared across all components
 * - Built-in loading and error states
 */
export function TournamentProvider({ children }: TournamentProviderProps) {
  // React Query handles all the complexity!
  const { data, isLoading, error } = useTournamentData();

  // Check if tournament is editable (matches server middleware logic)
  // Tournament is NOT editable when status is "IN_PROGRESS" or "COMPLETED"
  const isTournamentEditable =
    data?.tournament?.status !== "IN_PROGRESS" && data?.tournament?.status !== "COMPLETED";

  // tournamentStatus
  const tournamentStatusDisplay = data?.tournament?.status
    ?.split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");

  const value: TournamentContextType = {
    currentTournament: data?.tournament ?? null,
    players: data?.players ?? [],
    contests: data?.contests ?? [],
    isLoading,
    error: error as Error | null,
    isTournamentEditable,
    tournamentStatusDisplay: tournamentStatusDisplay ?? "",
  };

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
}

export function useTournament() {
  const context = useContext(TournamentContext);
  if (context === undefined) {
    throw new Error("useTournament must be used within a TournamentProvider");
  }
  return context;
}
