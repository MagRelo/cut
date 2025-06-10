import React, { useState, useEffect } from 'react';
import { PlayerSelectionCard } from './PlayerSelectionCard';
import { PlayerSelectionModal } from './PlayerSelectionModal';
import { useTournament } from '../../contexts/TournamentContext';
import { usePortoAuth } from '../../contexts/PortoAuthContext';
import { useLineupApi } from '../../services/lineupApi';
import { type TournamentLineup } from '../../types.new/player';
import { ErrorMessage } from '../util/ErrorMessage';
import { TournamentSummaryModal } from '../common/TournamentSummaryModal';
import { PlayerCard } from '../player/PlayerCard';
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/react';
import { TournamentPreview } from './TournamentPreview';

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
      <div className='mb-4 flex flex-col '>
        <h1 className='mt-1 text-3xl font-bold tracking-tight text-gray-700'>
          {currentTournament?.name}
        </h1>

        <h2 className='text-lg font-medium text-gray-700'>
          {currentTournament?.course}
        </h2>

        <p className='text-sm font-medium text-gray-500 tracking-wide'>
          {currentTournament?.roundDisplay} -{' '}
          {currentTournament?.roundStatusDisplay}
        </p>
      </div>

      <TabGroup defaultIndex={0}>
        <TabList className='flex space-x-1 rounded-xl bg-gray-100 p-1 mb-4'>
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5
              ${
                selected
                  ? 'bg-white text-emerald-600 shadow'
                  : 'text-gray-600 hover:bg-white/[0.12] hover:text-emerald-500'
              }`
            }>
            Lineup
          </Tab>
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5
              ${
                selected
                  ? 'bg-white text-emerald-600 shadow'
                  : 'text-gray-600 hover:bg-white/[0.12] hover:text-emerald-500'
              }`
            }>
            Preview
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
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
                  {Array.from({ length: 4 }).map((_, index) => {
                    const player = lineup?.players[index];
                    return player ? (
                      <PlayerCard
                        key={`slot-${index}`}
                        player={player}
                        roundDisplay={currentTournament?.roundDisplay || ''}
                      />
                    ) : (
                      <div
                        key={`slot-${index}`}
                        className='h-24 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400'>
                        Empty Slot
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabPanel>
          <TabPanel>
            <div className='flex flex-col gap-4'>
              <div className='max-h-[62vh] overflow-y-auto pt-4 px-2 pb-8 shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.06)] border border-gray-100 rounded-lg'>
                <TournamentPreview />
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>

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
