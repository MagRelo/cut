import { createContext, useContext, ReactNode } from "react";
import { type TournamentLineup } from "../types/player";
import { useLineupsQuery } from "../hooks/useLineupQueries";
import { useCreateLineup, useUpdateLineup } from "../hooks/useLineupMutations";
import { usePortoAuth } from "./PortoAuthContext";
import { useTournament } from "./TournamentContext";

interface LineupContextData {
  lineups: TournamentLineup[];
  lineupError: string | null;
  isLoading: boolean;
  getLineups: (tournamentId: string) => Promise<TournamentLineup[]>;
  getLineupById: (lineupId: string) => Promise<TournamentLineup>;
  getLineupFromCache: (lineupId: string) => TournamentLineup | null;
  createLineup: (
    tournamentId: string,
    playerIds: string[],
    name?: string
  ) => Promise<TournamentLineup>;
  updateLineup: (lineupId: string, playerIds: string[], name?: string) => Promise<TournamentLineup>;
  clearLineups: () => void;
}

const LineupContext = createContext<LineupContextData | undefined>(undefined);

export function useLineup() {
  const context = useContext(LineupContext);
  if (!context) {
    throw new Error("useLineup must be used within a LineupProvider");
  }
  return context;
}

/**
 * LineupProvider - now powered by React Query
 *
 * Benefits of the migration:
 * - Removed 100+ lines of manual state management
 * - No more useEffect dependencies or complex callbacks
 * - Automatic background refetching
 * - Data cached and shared across all components
 * - Built-in loading and error states
 * - Optimistic updates for create/update operations
 */
export function LineupProvider({ children }: { children: ReactNode }) {
  const { user } = usePortoAuth();
  const { currentTournament } = useTournament();

  // React Query handles all the complexity!
  const {
    data: lineups = [],
    error,
    isLoading,
    refetch,
  } = useLineupsQuery(
    currentTournament?.id,
    !!user && !!currentTournament // Only fetch if user is logged in and tournament exists
  );

  // Mutations
  const createMutation = useCreateLineup();
  const updateMutation = useUpdateLineup();

  // Get lineups (refetch current data)
  const getLineups = async (_tournamentId: string): Promise<TournamentLineup[]> => {
    const result = await refetch();
    return result.data || [];
  };

  // Helper function to get lineup from cache by ID
  const getLineupFromCache = (lineupId: string): TournamentLineup | null => {
    return lineups.find((lineup) => lineup.id === lineupId) || null;
  };

  // Helper function to get lineup by ID (returns from cache)
  const getLineupById = async (lineupId: string): Promise<TournamentLineup> => {
    const lineup = getLineupFromCache(lineupId);
    if (!lineup) {
      throw new Error(`Lineup ${lineupId} not found`);
    }
    return lineup;
  };

  // Clear lineups (when user logs out)
  const clearLineups = () => {
    // React Query will automatically clear when user context changes
    // This is a no-op but kept for API compatibility
  };

  // Create lineup wrapper that returns the created lineup
  const createLineup = async (
    tournamentId: string,
    playerIds: string[],
    name?: string
  ): Promise<TournamentLineup> => {
    const lineup = await createMutation.mutateAsync({
      tournamentId,
      playerIds,
      name,
    });
    return lineup;
  };

  // Update lineup wrapper that returns the updated lineup
  const updateLineup = async (
    lineupId: string,
    playerIds: string[],
    name?: string
  ): Promise<TournamentLineup> => {
    const lineup = await updateMutation.mutateAsync({
      lineupId,
      playerIds,
      name,
    });
    return lineup;
  };

  const contextValue: LineupContextData = {
    lineups,
    lineupError: error
      ? error instanceof Error
        ? error.message
        : "Failed to fetch lineups"
      : null,
    isLoading,
    getLineups,
    getLineupById,
    getLineupFromCache,
    createLineup,
    updateLineup,
    clearLineups,
  };

  return <LineupContext.Provider value={contextValue}>{children}</LineupContext.Provider>;
}
