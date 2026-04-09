import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { TournamentLineup, PlayerWithTournamentData } from "../../types/player";

import { useAuth } from "../../contexts/AuthContext";
import { useLineupData } from "../../hooks/useLineupData";
import { useLineupQuery } from "../../hooks/useLineupQueries";
import { useActiveTournament } from "../../hooks/useTournamentData";
import { ErrorMessage } from "../common/ErrorMessage";

import { PlayerSelectionModal } from "./PlayerSelectionModal";
import { PlayerSelectionButton } from "./PlayerSelectionButton";

/**
 * LineupForm Component
 *
 * Usage:
 * - Create mode: <LineupForm /> (no lineupId prop)
 * - Update mode: <LineupForm lineupId="existing-lineup-id" />
 *
 * The component automatically handles:
 * - Creating new lineups when no lineupId is provided
 * - Updating existing lineups when lineupId is provided
 * - Fetching the appropriate lineup data
 * - Managing player selection and lineup updates
 */
interface LineupFormProps {
  lineupId?: string; // If provided, we're in update mode. If not, we're in create mode
  onUpdateLineup?: (playerIds: string[]) => Promise<void>;
}

export const LineupForm: React.FC<LineupFormProps> = ({ lineupId }) => {
  const navigate = useNavigate();
  const { loading: isAuthLoading, user } = useAuth();
  const {
    players: fieldPlayers,
    currentTournament,
    isLoading: isTournamentLoading,
  } = useActiveTournament();

  const {
    getLineupFromCache,
    createLineup,
    updateLineup,
    lineupError,
    lineups,
    isLoading: isLineupsLoading,
  } = useLineupData();

  const {
    data: lineupFromDetail,
    isLoading: isLineupDetailLoading,
    error: lineupDetailError,
  } = useLineupQuery(
    lineupId,
    Boolean(lineupId && user?.id && currentTournament?.id && !isAuthLoading),
    user?.id,
  );

  // Local State
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number | null>(null);
  const [currentLineup, setCurrentLineup] = useState<TournamentLineup | null>(null);
  const [draftPlayers, setDraftPlayers] = useState<Array<PlayerWithTournamentData | null>>(
    Array.from({ length: 4 }, () => null),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize draft players with current lineup when in edit mode
  useEffect(() => {
    if (lineupId && currentLineup) {
      const players = currentLineup.players || [];
      // Ensure we always have exactly 4 slots
      const paddedPlayers: Array<PlayerWithTournamentData | null> = [...players];
      while (paddedPlayers.length < 4) {
        paddedPlayers.push(null);
      }
      setDraftPlayers(paddedPlayers.slice(0, 4));
    }
  }, [lineupId, currentLineup]);

  // Helper function to get the next lineup number
  const getNextLineupNumber = useCallback(() => {
    // Simply use the array length + 1 for the next number
    const nextNumber = lineups.length + 1;
    return nextNumber;
  }, [lineups]);

  // Get the next lineup name for display
  const nextLineupName = useMemo(() => {
    return `Lineup #${getNextLineupNumber()}`;
  }, [getNextLineupNumber]);

  useEffect(() => {
    if (!lineupId || isAuthLoading || !currentTournament?.id) return;
    const cachedLineup = getLineupFromCache(lineupId);
    if (cachedLineup) {
      setCurrentLineup(cachedLineup);
      return;
    }
    if (lineupFromDetail) {
      setCurrentLineup(lineupFromDetail);
    }
  }, [lineupId, isAuthLoading, currentTournament?.id, getLineupFromCache, lineupFromDetail]);

  const handlePlayerSelect = (playerId: string | null) => {
    if (selectedPlayerIndex === null) return;

    const newDraftPlayers = [...draftPlayers];

    if (playerId) {
      const selectedPlayer = fieldPlayers?.find((p) => p.id === playerId);
      if (selectedPlayer) {
        newDraftPlayers[selectedPlayerIndex] = selectedPlayer;
      }
    } else {
      // Remove player from this slot by splicing
      newDraftPlayers.splice(selectedPlayerIndex, 1);
    }

    setDraftPlayers(newDraftPlayers);
    setSelectedPlayerIndex(null);
    setValidationError(null); // Clear validation error when players change
  };

  // Helper function to check if this player set already exists
  const checkForDuplicateLineup = (playerIds: string[]): boolean => {
    // Normalize player IDs by sorting
    const normalizedPlayerIds = [...playerIds].sort().join(",");

    // Check all existing lineups for duplicates
    const list = Array.isArray(lineups) ? lineups : [];
    return list.some((lineup) => {
      // Skip the current lineup if updating
      if (lineupId && lineup.id === lineupId) {
        return false;
      }

      // Get player IDs from the lineup and normalize
      const players = Array.isArray(lineup.players) ? lineup.players : [];
      const lineupPlayerIds = players
        .map((p) => p.id)
        .sort()
        .join(",");

      // Compare normalized player sets
      return lineupPlayerIds === normalizedPlayerIds;
    });
  };

  const handleSubmit = async () => {
    if (!currentTournament?.id) return;

    const playerIds = draftPlayers
      .filter((p): p is PlayerWithTournamentData => p !== null)
      .map((p) => p.id);

    // Validate minimum players
    if (playerIds.length === 0) {
      setValidationError("Lineup must have at least 1 player");
      return;
    }

    // Check for duplicate lineup
    if (checkForDuplicateLineup(playerIds)) {
      setValidationError("You already have a lineup with these players for this tournament");
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);
    try {
      if (lineupId) {
        // Update existing lineup
        await updateLineup(lineupId, playerIds);
      } else {
        // Create new lineup
        await createLineup(currentTournament.id, playerIds, nextLineupName);
      }

      // Navigate to lineup list after successful save
      navigate("/lineups");
    } catch (error) {
      console.error("Failed to save lineup:", error);
      // Show server error if validation passed on client but failed on server
      if (error instanceof Error) {
        setValidationError(error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCardClick = (index: number) => {
    setSelectedPlayerIndex(index);
  };

  if (isAuthLoading || isTournamentLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (lineupId && !currentLineup && (isLineupsLoading || isLineupDetailLoading)) {
    return <div className="p-4">Loading...</div>;
  }

  if (lineupId && lineupDetailError && !currentLineup) {
    return (
      <div className="p-4">
        <ErrorMessage
          message={
            lineupDetailError instanceof Error ? lineupDetailError.message : "Failed to load lineup"
          }
        />
      </div>
    );
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
      {/* Lineup header */}
      <div className="flex justify-between items-start mb-1">
        <div>
          <h3 className="text-lg font-semibold text-gray-600">
            {lineupId && currentLineup
              ? currentLineup.name || `Lineup ${currentLineup.id.slice(-6)}`
              : nextLineupName}
          </h3>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || draftPlayers.filter((p) => p !== null).length === 0}
          className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-1 px-3 rounded border border-blue-500 transition-colors text-sm font-display"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>{"Save"}</>
          )}
        </button>
      </div>

      {/* Validation Error Message */}
      {validationError && (
        <div className="mb-4">
          <ErrorMessage message={validationError} />
        </div>
      )}

      <div className="flex flex-col">
        {Array.from({ length: 4 }).map((_, index) => (
          <React.Fragment key={`slot-${index}`}>
            <hr className="border-0 border-t border-slate-300 my-4" />
            <PlayerSelectionButton
              player={draftPlayers[index] || null}
              isSelected={false}
              onClick={() => handleCardClick(index)}
              iconType="pencil"
            />
          </React.Fragment>
        ))}
      </div>

      {/* player selection modal */}
      <PlayerSelectionModal
        isOpen={selectedPlayerIndex !== null}
        onClose={() => setSelectedPlayerIndex(null)}
        onSelect={handlePlayerSelect}
        availablePlayers={fieldPlayers || []}
        selectedPlayers={draftPlayers
          .filter((p): p is PlayerWithTournamentData => p != null)
          .map((p) => p.id)}
      />
    </div>
  );
};
