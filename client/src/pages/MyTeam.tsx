import React, { useEffect, useState } from 'react';

import { useTournament } from '../contexts/TournamentContext';

import { usePortoAuth } from '../contexts/PortoAuthContext';

import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/util/ErrorMessage';
import { PageHeader } from '../components/util/PageHeader';
import { Share } from '../components/common/Share';

// import { TeamForm } from '../components/team/TeamForm';
// import { PlayerCard } from '../components/player/PlayerCard';
// import { PlayerStats } from '../components/team/PlayerStats';
// import { PlayerSelectionModal } from '../components/team/PlayerSelectionModal';
import { useLineupApi } from '../services/lineupApi';
import { TournamentLineup } from 'src/types/lineup';
// import { type TournamentLineup } from '../types/lineup';

export const MyTeam: React.FC = () => {
  const { user, loading: isAuthLoading } = usePortoAuth();
  const lineupApi = useLineupApi();
  const {
    currentTournament: tournament,
    isLoading: isTournamentLoading,
    error: tournamentError,
  } = useTournament();

  // Local state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lineup, setLineup] = useState<TournamentLineup | null>(null);
  // const [team, setTeam] = useState<TournamentLineup | null>(null);
  // const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number | null>(
  //   null
  // );

  const fetchLineup = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let result = null;
      result = await lineupApi.getLineup(tournament?.id || '');
      setLineup(result.lineup || null);
    } catch {
      setError(`Failed to load lineup for ${tournament?.name}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && !isTournamentLoading) {
      fetchLineup();
    }
  }, [user, isAuthLoading, isTournamentLoading]);

  //
  // Form Controls
  //
  // const isEditingAllowed = (): boolean => {
  //   return !currentTournament || currentTournament.status === 'NOT_STARTED';
  // };

  if (isLoading || isTournamentLoading || isAuthLoading) {
    return (
      <div className='px-4 py-4'>
        <LoadingSpinner />
      </div>
    );
  }

  if (error || tournamentError) {
    return (
      <div className='px-4 py-4'>
        <ErrorMessage
          message={error || tournamentError?.message || 'An error occurred'}
        />
      </div>
    );
  }

  return (
    <div className='p-4'>
      {/* Team Info */}
      <PageHeader title='My Team' className='mb-4' />

      {/* Teast call to try  out lineupAPI.updateLineup */}
      <button
        className='bg-blue-500 text-white px-4 py-2 rounded-md'
        onClick={() =>
          lineupApi.updateLineup(tournament?.id || '', {
            players: [
              'cmbo2jjes002q13yvtogyxj3i',
              'cmbo2jjet002r13yvy6owe6ot',
              'cmbo2jji3005v13yvwcq1yw6n',
              'cmbo2jjj6006w13yvuw6z4uck',
            ],
          })
        }>
        Update Lineup
      </button>

      {/* Display the lineup */}
      <div className='flex flex-col gap-4'>
        {lineup?.players.map((player) => (
          <div key={player.id}>{player.id}</div>
        ))}
      </div>

      {/* Share Section */}
      <div className='flex justify-center my-8'>
        <Share url={window.location.href} title='Share the Cut' subtitle='' />
      </div>

      {/* <PlayerSelectionModal
        isOpen={selectedPlayerIndex !== null}
        onClose={() => setSelectedPlayerIndex(null)}
        onSelect={handlePlayerSelect}
        availablePlayers={availablePlayers || []}
        selectedPlayers={team?.players?.map((p) => p.player.id) || []}
      /> */}
    </div>
  );
};
