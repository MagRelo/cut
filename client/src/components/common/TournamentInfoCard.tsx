import React from 'react';
import type { Tournament } from '../../services/publicLeagueApi';

interface TournamentInfoCardProps {
  tournament: Tournament;
}

export const TournamentInfoCard: React.FC<TournamentInfoCardProps> = ({
  tournament,
}) => {
  const formatVenue = (tournament: Tournament): string => {
    if (typeof tournament.venue === 'string') {
      return tournament.venue;
    }
    if (tournament.venue) {
      return tournament.venue.name || '';
    }
    return '';
  };

  return (
    <div className='relative overflow-hidden md:rounded-lg border border-gray-200'>
      {tournament.beautyImage ? (
        <>
          <div
            className='absolute inset-0 bg-cover bg-center'
            style={{ backgroundImage: `url(${tournament.beautyImage})` }}
          />
          <div className='absolute inset-0 bg-black/50' />
        </>
      ) : (
        <div className='absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-700' />
      )}
      <div className='relative p-4 text-white'>
        <div className='flex justify-between items-center'>
          <p className='text-2xl font-bold tracking-tight'>{tournament.name}</p>
        </div>
        <div className='mt-1 space-y-1'>
          {tournament.venue && (
            <p className='text-white/90'>{formatVenue(tournament)}</p>
          )}
          <a
            href='https://www.pgatour.com/leaderboard'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-block mt-2 text-white/90 hover:text-white text-sm font-medium border border-white/30 rounded px-3 py-1 hover:border-white/60 transition-colors'>
            Leaderboard ↗
          </a>
        </div>
      </div>
    </div>
  );
};
