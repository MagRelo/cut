import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { useTournament } from '../../contexts/TournamentContext';
import { CountdownTimer } from './CountdownTimer';

export const TournamentInfoCard: React.FC = () => {
  const { currentTournament, isLoading, error } = useTournament();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className='relative overflow-hidden md:rounded-lg p-4'>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className='relative overflow-hidden md:rounded-lg p-4'>
        <ErrorMessage message={error.message} />
      </div>
    );
  }

  if (!currentTournament) {
    return null;
  }

  return (
    <div className='relative overflow-hidden md:rounded-lg'>
      {currentTournament.beautyImage ? (
        <>
          <div
            className='absolute inset-0 bg-cover bg-center'
            style={{
              backgroundImage: `url(${currentTournament.beautyImage})`,
            }}
          />
          <div className='absolute inset-0 bg-black/50' />
        </>
      ) : (
        <div className='absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-700' />
      )}
      <div className='relative p-4 text-white'>
        {/* tournament name */}
        <div className='flex justify-between items-center'>
          <p className='text-3xl font-bold tracking-tight pt-1 [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]'>
            {currentTournament.name}
          </p>
        </div>

        {/* round display */}
        {currentTournament.status === 'NOT_STARTED' ? (
          <div className='text-white font-semibold text-xl [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)] mt-3'>
            Starting: <CountdownTimer targetDate={currentTournament.endDate} />
          </div>
        ) : (
          <p className='text-white font-semibold text-xl [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)] mt-3'>
            {currentTournament.roundDisplay} &#183;{' '}
            {currentTournament.roundStatusDisplay}
          </p>
        )}

        {/* links to team and leagues */}
        <div className='mt-3 space-y-4'>
          <div>
            <Link
              to='/public/team'
              className={`inline-block mt-2 mr-2 text-white/90 hover:text-white text-sm font-medium border-2 ${
                location.pathname === '/public/team'
                  ? 'border-white'
                  : 'border-white/30'
              } rounded px-3 py-1 transition-colors`}>
              My Team
            </Link>
            <Link
              to='/public/leagues'
              className={`inline-block mt-2 mr-2 text-white/90 hover:text-white text-sm font-medium border-2 ${
                location.pathname === '/public/leagues'
                  ? 'border-white'
                  : 'border-white/20'
              } rounded px-3 py-1  transition-colors`}>
              Leagues
            </Link>
            <a
              href='https://www.pgatour.com/leaderboard'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-block mt-2 text-white/90 hover:text-white text-sm font-medium rounded px-3 py-1 transition-colors'>
              Leaderboard ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
