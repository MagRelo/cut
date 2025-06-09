import React, { useState, useEffect } from 'react';
import { PlayerSelectionCard } from './PlayerSelectionCard';
import { PlayerSelectionModal } from './PlayerSelectionModal';
import { useTournament } from '../../contexts/TournamentContext';
import { usePortoAuth } from '../../contexts/PortoAuthContext';
import { useLineupApi } from '../../services/lineupApi';
import {
  PlayerWithTournamentData,
  type TournamentLineup,
} from '../../types.new/player';
import { ErrorMessage } from '../util/ErrorMessage';
import { TournamentSummaryModal } from '../common/TournamentSummaryModal';
import { PlayerCard } from '../player/PlayerCard';

interface TournamentLineupFormProps {
  onUpdateLineup?: (playerIds: string[]) => Promise<void>;
}

export const TournamentLineupForm: React.FC<TournamentLineupFormProps> = ({
  onUpdateLineup,
}) => {
  const lineupApi = useLineupApi();
  const { loading: isAuthLoading } = usePortoAuth();
  const {
    players: fieldPlayers,
    currentTournament,
    isLoading: isTournamentLoading,
  } = useTournament();

  // Local State
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [lineup, setLineup] = useState<TournamentLineup | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchLineup = async () => {
      if (!isAuthLoading && currentTournament?.id) {
        try {
          const response = await lineupApi.getLineup(currentTournament.id);
          setLineup(response.lineup);
        } catch (error) {
          console.error('Failed to fetch lineup:', error);
          setError('Failed to fetch lineup');
        }
      }
    };

    fetchLineup();
  }, [currentTournament?.id, isAuthLoading, lineupApi]);

  const isEditingAllowed = (): boolean => {
    // return true;
    return !currentTournament || currentTournament.status === 'NOT_STARTED';
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

    try {
      if (onUpdateLineup) {
        await onUpdateLineup(playerIds);
      } else {
        const response = await lineupApi.updateLineup(
          currentTournament?.id || '',
          {
            players: playerIds,
          }
        );
        setLineup(response.lineup);
      }
    } catch (error) {
      console.error('Failed to update lineup:', error);
      setError('Failed to update lineup');
    }

    setSelectedPlayerIndex(null);
  };

  const handleCardClick = (index: number) => {
    if (isEditingAllowed()) {
      setSelectedPlayerIndex(index);
    }
  };

  if (isAuthLoading || isTournamentLoading) {
    return <div className='p-4'>Loading...</div>;
  }

  if (error) {
    return (
      <div className='p-4'>
        <ErrorMessage message={error} />
      </div>
    );
  }

  return (
    <div className='bg-white p-4 rounded-lg shadow-md pb-6'>
      {/* tournament Summary */}
      <div className='text-2xl font-bold mb-2 flex flex-col gap-1'>
        <div className='flex items-center gap-2'>
          {currentTournament?.name}
          <button
            onClick={() => setIsModalOpen(true)}
            className='inline-block text-gray-600 hover:text-gray-800 text-sm font-medium rounded-full transition-colors flex items-center justify-center'
            style={{ width: '31px', height: '31px' }}>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-4 w-4'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          </button>
        </div>

        <div className='text-sm text-gray-500'>
          {currentTournament?.roundDisplay} -{' '}
          {currentTournament?.roundStatusDisplay}
        </div>
      </div>

      <div className='flex flex-col gap-4'>
        {/* lineup open */}
        {isEditingAllowed() && (
          <div className='flex flex-col gap-4'>
            {Array.from({ length: 4 }).map((_, index) => (
              <PlayerSelectionCard
                key={`slot-${index}`}
                player={lineup?.players[index] || null}
                isSelected={false}
                onClick={() => handleCardClick(index)}
              />
            ))}
          </div>
        )}

        {/* lineup closed */}
        {!isEditingAllowed() && (
          <div className='flex flex-col gap-4'>
            {Array.from({ length: 4 }).map((_, index) => (
              <PlayerCard
                key={`slot-${index}`}
                player={lineup?.players[index] as PlayerWithTournamentData}
                roundDisplay={currentTournament?.roundDisplay || ''}
              />
            ))}
          </div>
        )}
      </div>

      {/* player selection modal */}
      <PlayerSelectionModal
        isOpen={selectedPlayerIndex !== null}
        onClose={() => setSelectedPlayerIndex(null)}
        onSelect={handlePlayerSelect}
        availablePlayers={fieldPlayers || []}
        selectedPlayers={lineup?.players?.map((p) => p.id) || []}
      />

      {/* tournament summary modal */}
      <TournamentSummaryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
