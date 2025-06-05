import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from '../util/ErrorMessage';
import { useTournament } from '../../contexts/TournamentContext';
import { CountdownTimer } from './CountdownTimer';
import { TournamentSummaryModal } from './TournamentSummaryModal';

export const TournamentInfoCard: React.FC = () => {
  const { currentTournament, isLoading, error } = useTournament();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        <div className='flex justify-between items-center mt-1'>
          <p className='text-3xl font-bold tracking-tight pt-1 [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]'>
            {currentTournament.name}
          </p>
        </div>

        {/* round display */}
        <div className='text-white font-semibold text-xl [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)] '>
          {currentTournament.status === 'NOT_STARTED' ? (
            <p>
              Starting:{' '}
              <CountdownTimer targetDate={currentTournament.endDate} />
            </p>
          ) : (
            <p>
              {currentTournament.roundDisplay} &#183;{' '}
              {currentTournament.roundStatusDisplay}
            </p>
          )}
        </div>

        {/* links to team and leagues */}
        <div className='mt-5'>
          <div className='flex flex-row items-center justify-between'>
            <div className='flex items-center gap-4'>
              <Link
                to='/public/team'
                className={`inline-block text-white/90 hover:text-white text-sm font-medium border-2 ${
                  location.pathname === '/public/team'
                    ? 'border-white bg-white/20'
                    : 'border-white/50'
                } rounded px-3 py-1 transition-colors flex items-center justify-center`}>
                My Team
              </Link>
              <Link
                to='/public/leagues'
                className={`inline-block text-white/90 hover:text-white text-sm font-medium border-2 ${
                  location.pathname === '/public/leagues'
                    ? 'border-white bg-white/20'
                    : 'border-white/50'
                } rounded px-3 py-1 transition-colors flex items-center justify-center`}>
                Leagues
              </Link>
              <button
                onClick={() => setIsModalOpen(true)}
                className='inline-block text-white/90 hover:text-white text-sm font-medium border-2 border-white/50 hover:border-white rounded-full transition-colors flex items-center justify-center'
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
            <Link
              to='/user'
              className={`inline-block text-white/90 hover:text-white text-sm font-medium border-2 ${
                location.pathname === '/user'
                  ? 'border-white bg-white/20'
                  : 'border-white/50'
              } rounded-full transition-colors flex items-center justify-center`}
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
                  d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <TournamentSummaryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
