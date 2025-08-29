import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { type TournamentLineup } from "../types/player";
import { useLineupApi } from "../services/lineupApi";
import { usePortoAuth } from "./PortoAuthContext";
import { useTournament } from "./TournamentContext";

interface LineupContextData {
  lineups: TournamentLineup[];
  lineupError: string | null;
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

export function LineupProvider({ children }: { children: React.ReactNode }) {
  const [lineups, setLineups] = useState<TournamentLineup[]>([]);
  const [lineupError, setLineupError] = useState<string | null>(null);
  const lineupApi = useLineupApi();
  const { user } = usePortoAuth();
  const { currentTournament } = useTournament();

  const getLineups = useCallback(
    async (tournamentId: string) => {
      try {
        const response = await lineupApi.getLineup(tournamentId);
        setLineups(response.lineups || []);
        setLineupError(null);
        return response.lineups || [];
      } catch (error) {
        console.error("Failed to fetch lineups:", error);
        setLineupError("Failed to fetch lineups");
        throw error;
      }
    },
    [lineupApi]
  );

  // Load lineups when user logs in and there's an active tournament
  useEffect(() => {
    if (user && currentTournament) {
      getLineups(currentTournament.id);
    }
  }, [user, currentTournament, getLineups]);

  // Clear lineups when user logs out
  useEffect(() => {
    if (!user) {
      setLineups([]);
      setLineupError(null);
    }
  }, [user]);

  const getLineupById = useCallback(
    async (lineupId: string) => {
      try {
        const response = await lineupApi.getLineupById(lineupId);
        setLineupError(null);
        return response.lineups[0] || null;
      } catch (error) {
        console.error("Failed to fetch lineup:", error);
        setLineupError("Failed to fetch lineup");
        throw error;
      }
    },
    [lineupApi]
  );

  const createLineup = useCallback(
    async (tournamentId: string, playerIds: string[], name?: string) => {
      try {
        const response = await lineupApi.createLineup(tournamentId, {
          players: playerIds,
          name,
        });
        const newLineup = response.lineups[0] || null;
        if (newLineup) {
          setLineups((prev) => [...prev, newLineup]);
        }
        setLineupError(null);
        return newLineup;
      } catch (error) {
        console.error("Failed to create lineup:", error);
        setLineupError("Failed to create lineup");
        throw error;
      }
    },
    [lineupApi]
  );

  const updateLineup = useCallback(
    async (lineupId: string, playerIds: string[], name?: string) => {
      try {
        const response = await lineupApi.updateLineup(lineupId, {
          players: playerIds,
          name,
        });
        const updatedLineup = response.lineups[0] || null;
        if (updatedLineup) {
          setLineups((prev) => prev.map((l) => (l.id === lineupId ? updatedLineup : l)));
        }
        setLineupError(null);
        return updatedLineup;
      } catch (error) {
        console.error("Failed to update lineup:", error);
        setLineupError("Failed to update lineup");
        throw error;
      }
    },
    [lineupApi]
  );

  const getLineupFromCache = useCallback(
    (lineupId: string) => {
      return lineups.find((lineup) => lineup.id === lineupId) || null;
    },
    [lineups]
  );

  const clearLineups = useCallback(() => {
    setLineups([]);
    setLineupError(null);
  }, []);

  const contextValue = useMemo(
    () => ({
      lineups,
      lineupError,
      getLineups,
      getLineupById,
      getLineupFromCache,
      createLineup,
      updateLineup,
      clearLineups,
    }),
    [
      lineups,
      lineupError,
      getLineups,
      getLineupById,
      getLineupFromCache,
      createLineup,
      updateLineup,
      clearLineups,
    ]
  );

  return <LineupContext.Provider value={contextValue}>{children}</LineupContext.Provider>;
}
