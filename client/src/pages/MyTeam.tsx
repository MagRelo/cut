import React from 'react';
import { useTournament } from '../contexts/TournamentContext';
import { usePortoAuth } from '../contexts/PortoAuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/util/ErrorMessage';
import { Share } from '../components/common/Share';
import { TournamentLineupForm } from '../components/team/TournamentLineupForm';

import { PageHeader } from '../components/util/PageHeader';
import { PlayerDisplayCard } from '../components/player/PlayerDisplayCard';

const TeamSummary = () => {
  const { currentTournament } = useTournament();
  const { user } = usePortoAuth();

  // Calculate total score from all players in the lineup
  const totalScore =
    user?.tournamentLineups?.[0]?.players.reduce((sum, player) => {
      return (
        sum +
        (player.tournamentData.total || 0) +
        (player.tournamentData.cut || 0) +
        (player.tournamentData.bonus || 0)
      );
    }, 0) || 0;

  return (
    <div className='flex flex-col gap-4 bg-white p-4 rounded-lg shadow-md'>
      <div className='flex justify-between items-center w-full'>
        <h1 className='text-3xl font-bold tracking-tight text-gray-700 truncate w-full pr-2'>
          {user?.name}
          {/* this is a really long name that should be truncated */}
        </h1>

        <div className='text-2xl font-bold text-gray-700 px-3 py-1 rounded-md border-2 border-gray-200 bg-gray-50'>
          {totalScore}
        </div>
      </div>

      <div className='flex flex-col gap-4'>
        {Array.from({ length: 4 }).map((_, index) => {
          const player = user?.tournamentLineups?.[0]?.players[index];

          return player ? (
            <PlayerDisplayCard
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
    </div>
  );
};

export const MyTeam: React.FC = () => {
  const { loading: isAuthLoading } = usePortoAuth();
  const {
    isLoading: isTournamentLoading,
    error: tournamentError,
    currentTournament,
  } = useTournament();

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
      <PageHeader title='Manage Lineup' className='mb-3' />

      {currentTournament?.status === 'NOT_STARTED' && <TournamentLineupForm />}

      {currentTournament?.status === 'IN_PROGRESS' && <TeamSummary />}

      {/* Share Section */}
      <div className='flex justify-center my-8'>
        <Share url={window.location.href} title='Share the Cut' subtitle='' />
      </div>
    </div>
  );
};
