import React from 'react';
import { useTournament } from '../contexts/TournamentContext';
import { usePortoAuth } from '../contexts/PortoAuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/util/ErrorMessage';
import { Share } from '../components/common/Share';
import { TournamentLineupForm } from '../components/team/TournamentLineupForm';

import { PageHeader } from '../components/util/PageHeader';

export const MyTeam: React.FC = () => {
  const { loading: isAuthLoading } = usePortoAuth();
  const { isLoading: isTournamentLoading, error: tournamentError } =
    useTournament();

  if (isAuthLoading || isTournamentLoading) {
    return (
      <div className='px-4 py-4'>
        <LoadingSpinner />
      </div>
    );
  }

  if (tournamentError) {
    return (
      <div className='px-4 py-4'>
        <ErrorMessage
          message={tournamentError.message || 'An error occurred'}
        />
      </div>
    );
  }

  return (
    <div className='p-4'>
      <PageHeader title='Lineup' className='mb-3' />

      <TournamentLineupForm />

      {/* Share Section */}
      <div className='flex justify-center my-8'>
        <Share url={window.location.href} title='Share the Cut' subtitle='' />
      </div>
    </div>
  );
};
