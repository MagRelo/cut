import React, { useState, useEffect, useCallback, useMemo } from "react";
import { PlayerSelectionCard } from "./PlayerSelectionCard";
import { PlayerSelectionModal } from "./PlayerSelectionModal";
import { useTournament } from "../../contexts/TournamentContext";
import { usePortoAuth } from "../../contexts/PortoAuthContext";
import { useLineup } from "../../contexts/LineupContext";
import { TournamentLineup } from "../../types.new/player";
import { ErrorMessage } from "../util/ErrorMessage";
import { PlayerDisplayCard } from "../player/PlayerDisplayCard";

/**
 * TournamentLineupForm Component
 *
 * Usage:
 * - Create mode: <TournamentLineupForm /> (no lineupId prop)
 * - Update mode: <TournamentLineupForm lineupId="existing-lineup-id" />
 *
 * The component automatically handles:
 * - Creating new lineups when no lineupId is provided
 * - Updating existing lineups when lineupId is provided
 * - Fetching the appropriate lineup data
 * - Managing player selection and lineup updates
 */
interface TournamentLineupFormProps {
  lineupId?: string; // If provided, we're in update mode. If not, we're in create mode
  onUpdateLineup?: (playerIds: string[]) => Promise<void>;
}

export const TournamentLineupForm: React.FC<TournamentLineupFormProps> = ({ lineupId }) => {
  const { loading: isAuthLoading } = usePortoAuth();
  const {
    players: fieldPlayers,
    currentTournament,
    isLoading: isTournamentLoading,
  } = useTournament();

  const {
    getLineupById,
    getLineupFromCache,
    createLineup,
    updateLineup,
    lineupError,
    lineups,
    getLineups,
  } = useLineup();

  // Local State
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number | null>(null);
  const [currentLineup, setCurrentLineup] = useState<TournamentLineup | null>(null);

  // Helper function to get the next lineup number
  const getNextLineupNumber = useCallback(() => {
    console.log("Calculating next lineup number. Current lineups:", lineups);

    // Simply use the array length + 1 for the next number
    const nextNumber = lineups.length + 1;
    console.log("Next number based on array length:", nextNumber);
    return nextNumber;
  }, [lineups]);

  // Get the next lineup name for display
  const nextLineupName = useMemo(() => {
    return `Lineup #${getNextLineupNumber()}`;
  }, [getNextLineupNumber]);

  useEffect(() => {
    const fetchLineup = async () => {
      if (!isAuthLoading && currentTournament?.id && lineupId) {
        // First try to get from cache
        const cachedLineup = getLineupFromCache(lineupId);
        if (cachedLineup) {
          setCurrentLineup(cachedLineup);
          return;
        }

        // If not in cache, fetch from API
        try {
          const lineup = await getLineupById(lineupId);
          setCurrentLineup(lineup);
        } catch (error) {
          console.error("Failed to fetch lineup:", error);
        }
      }
    };

    fetchLineup();
  }, [currentTournament?.id, isAuthLoading, getLineupById, getLineupFromCache, lineupId]);

  // Load lineups when creating a new lineup to ensure we have the latest data
  useEffect(() => {
    const loadLineups = async () => {
      if (!isAuthLoading && currentTournament?.id && !lineupId && lineups.length === 0) {
        try {
          console.log("Loading lineups for new lineup creation...");
          await getLineups(currentTournament.id);
        } catch (error) {
          console.error("Failed to load lineups:", error);
        }
      }
    };

    loadLineups();
  }, [currentTournament?.id, isAuthLoading, lineupId, lineups.length, getLineups]);

  const handlePlayerSelect = async (playerId: string | null) => {
    if (selectedPlayerIndex === null) return;

    const newPlayers = [...(currentLineup?.players || [])];

    if (playerId) {
      const selectedPlayer = fieldPlayers?.find((p) => p.id === playerId);
      if (selectedPlayer) {
        newPlayers[selectedPlayerIndex] = selectedPlayer;
      }
    } else {
      // Remove player from this slot by splicing
      newPlayers.splice(selectedPlayerIndex, 1);
    }

    // Map remaining players to IDs
    const playerIds = newPlayers.map((p) => p.id);

    try {
      if (lineupId) {
        // Update existing lineup
        await updateLineup(lineupId, playerIds);
      } else {
        // Create new lineup
        await createLineup(currentTournament?.id || "", playerIds, nextLineupName);
      }
    } catch (error) {
      console.error("Failed to update lineup:", error);
    }

    setSelectedPlayerIndex(null);
  };

  const isEditingAllowed = (): boolean => {
    return true;
    // return !currentTournament || currentTournament.status === "NOT_STARTED";
  };

  const handleCardClick = (index: number) => {
    if (isEditingAllowed()) {
      setSelectedPlayerIndex(index);
    }
  };

  if (isAuthLoading || isTournamentLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (lineupError) {
    return (
      <div className="p-4">
        <ErrorMessage message={lineupError} />
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md pb-6">
      {/* Display lineup name for new lineups */}
      {!lineupId && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-medium text-blue-900">Creating New Lineup</h3>
          <p className="text-sm text-blue-700">
            This lineup will be named: <span className="font-semibold">{nextLineupName}</span>
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* lineup open */}
        {isEditingAllowed() && (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <PlayerSelectionCard
                key={`slot-${index}`}
                player={currentLineup?.players[index] || null}
                isSelected={false}
                onClick={() => handleCardClick(index)}
                iconType="pencil"
              />
            ))}
          </div>
        )}

        {/* lineup closed */}
        {!isEditingAllowed() && (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, index) => {
              const player = currentLineup?.players[index];
              return player ? (
                <PlayerDisplayCard
                  key={`slot-${index}`}
                  player={player}
                  roundDisplay={currentTournament?.roundDisplay || ""}
                />
              ) : (
                <div
                  key={`slot-${index}`}
                  className="h-24 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400"
                >
                  Empty Slot
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* player selection modal */}
      <PlayerSelectionModal
        isOpen={selectedPlayerIndex !== null}
        onClose={() => setSelectedPlayerIndex(null)}
        onSelect={handlePlayerSelect}
        availablePlayers={fieldPlayers || []}
        selectedPlayers={currentLineup?.players?.map((p) => p.id) || []}
      />
    </div>
  );
};
