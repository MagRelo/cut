import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { type TournamentLineup } from "../types.new/player";
import { useLineupApi } from "../services/lineupApi";

interface LineupContextData {
  lineups: TournamentLineup[];
  selectedLineup: TournamentLineup | null;
  lineupError: string | null;
  getLineups: (tournamentId: string) => Promise<TournamentLineup[]>;
  getLineupById: (lineupId: string) => Promise<TournamentLineup>;
  createLineup: (
    tournamentId: string,
    playerIds: string[],
    name?: string
  ) => Promise<TournamentLineup>;
  updateLineup: (lineupId: string, playerIds: string[], name?: string) => Promise<TournamentLineup>;
  selectLineup: (lineupId: string | null) => void;
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
  const [selectedLineup, setSelectedLineup] = useState<TournamentLineup | null>(null);
  const [lineupError, setLineupError] = useState<string | null>(null);
  const lineupApi = useLineupApi();

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
          setSelectedLineup(newLineup);
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
          setSelectedLineup(updatedLineup);
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

  const selectLineup = useCallback(
    (lineupId: string | null) => {
      if (lineupId === null) {
        setSelectedLineup(null);
      } else {
        const lineup = lineups.find((l) => l.id === lineupId);
        setSelectedLineup(lineup || null);
      }
    },
    [lineups]
  );

  const contextValue = useMemo(
    () => ({
      lineups,
      selectedLineup,
      lineupError,
      getLineups,
      getLineupById,
      createLineup,
      updateLineup,
      selectLineup,
    }),
    [
      lineups,
      selectedLineup,
      lineupError,
      getLineups,
      getLineupById,
      createLineup,
      updateLineup,
      selectLineup,
    ]
  );

  return <LineupContext.Provider value={contextValue}>{children}</LineupContext.Provider>;
}
