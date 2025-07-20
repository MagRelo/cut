import React, { useState, useEffect } from "react";
import { PlayerSelectionCard } from "./PlayerSelectionCard";
import { PlayerSelectionModal } from "./PlayerSelectionModal";
import { useTournament } from "../../contexts/TournamentContext";
import { usePortoAuth } from "../../contexts/PortoAuthContext";
import { ErrorMessage } from "../util/ErrorMessage";
// import { TournamentSummaryModal } from '../common/TournamentSummaryModal';
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

  const { getLineup, getLineupById, createLineup, updateLineup, currentLineup, lineupError } =
    usePortoAuth();

  // Local State
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchLineup = async () => {
      if (!isAuthLoading && currentTournament?.id) {
        try {
          if (lineupId) {
            // Fetch specific lineup by ID
            await getLineupById(lineupId);
          } else {
            // Fetch first lineup for tournament
            await getLineup(currentTournament.id);
          }
        } catch (error) {
          console.error("Failed to fetch lineup:", error);
        }
      }
    };

    fetchLineup();
  }, [currentTournament?.id, isAuthLoading, getLineup, getLineupById, lineupId]);

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
        await createLineup(currentTournament?.id || "", playerIds);
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
