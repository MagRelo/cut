import React, { useState } from 'react';
import { PlayerSelectionCard } from './PlayerSelectionCard';
import { PlayerSelectionModal } from './PlayerSelectionModal';
import { useTournament } from '../../contexts/TournamentContext';
import { type TournamentLineup } from '../../types.new/player';

interface TournamentLineupFormProps {
  lineup: TournamentLineup | null;
  onUpdateLineup: (playerIds: string[]) => Promise<void>;
}

export const TournamentLineupForm: React.FC<TournamentLineupFormProps> = ({
  lineup,
  onUpdateLineup,
}) => {
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number | null>(
    null
  );
  const { players: fieldPlayers, currentTournament } = useTournament();

  const isEditingAllowed = (): boolean => {
    return true;
    // return !currentTournament || currentTournament.status === 'NOT_STARTED';
  };

  const handlePlayerSelect = async (playerId: string | null) => {
    if (selectedPlayerIndex === null) return;

    const newPlayers = [...(lineup?.players || [])];

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
    await onUpdateLineup(playerIds);
    setSelectedPlayerIndex(null);
  };

  const handleCardClick = (index: number) => {
    if (isEditingAllowed()) {
      setSelectedPlayerIndex(index);
    }
  };

  return (
    <div className='bg-white p-4 rounded-lg shadow-md'>
      {/* tournament Summary */}
      <div className='text-2xl font-bold mb-2'>
        {currentTournament?.name}
        <div className='text-sm text-gray-500'>
          {currentTournament?.roundDisplay} -{' '}
          {currentTournament?.roundStatusDisplay}
        </div>
      </div>

      {/* lineup */}
      <div className='flex flex-col gap-4'>
        {Array.from({ length: 4 }).map((_, index) => (
          <PlayerSelectionCard
            key={`slot-${index}`}
            player={lineup?.players[index] || null}
            isSelected={false}
            onClick={() => handleCardClick(index)}
          />
        ))}

        <PlayerSelectionModal
          isOpen={selectedPlayerIndex !== null}
          onClose={() => setSelectedPlayerIndex(null)}
          onSelect={handlePlayerSelect}
          availablePlayers={fieldPlayers || []}
          selectedPlayers={lineup?.players?.map((p) => p.id) || []}
        />
      </div>
    </div>
  );
};
