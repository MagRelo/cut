import React, { useEffect, useState } from 'react';

import { type TournamentLineup } from '../types.new/player';

import { useTournament } from '../contexts/TournamentContext';
import { usePortoAuth } from '../contexts/PortoAuthContext';
import { useLineupApi } from '../services/lineupApi';

import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/util/ErrorMessage';
import { Share } from '../components/common/Share';
import { TournamentLineupForm } from '../components/team/TournamentLineupForm';

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

  const handleUpdateLineup = async (playerIds: string[]) => {
    try {
      const updatedLineup = await lineupApi.updateLineup(tournament?.id || '', {
        players: playerIds,
      });
      console.log({ updatedLineup: updatedLineup.lineup });
      setLineup(updatedLineup.lineup);
    } catch {
      setError('Failed to update lineup');
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
      <TournamentLineupForm
        lineup={lineup}
        onUpdateLineup={handleUpdateLineup}
      />

      {/* Share Section */}
      <div className='flex justify-center my-8'>
        <Share url={window.location.href} title='Share the Cut' subtitle='' />
      </div>
    </div>
  );
};
