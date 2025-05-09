import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  publicLeagueApi,
  type Tournament,
} from '../../services/publicLeagueApi';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';

export const TournamentInfoCard: React.FC = () => {
  const [tournament, setTournament] = useState<Tournament | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const fetchTournament = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await publicLeagueApi.getCurrentTournament();
        setTournament(result);
      } catch {
        setError('Failed to load tournament');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTournament();
  }, []);

  if (isLoading) {
    return (
      <div className='relative overflow-hidden md:rounded-lg border border-gray-200 p-4'>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className='relative overflow-hidden md:rounded-lg border border-gray-200 p-4'>
        <ErrorMessage message={error} />
      </div>
    );
  }

  if (!tournament) {
    return null;
  }

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
        <div className='mt-1 space-y-2'>
          <p className='text-white font-semibold'>
            {tournament.roundDisplay} &#183; {tournament.roundStatusDisplay}
          </p>
          <Link
            to='/public/team'
            className={`inline-block mt-2 mr-2 text-white/90 hover:text-white text-sm font-medium border-2 ${
              location.pathname === '/public/team'
                ? 'border-white'
                : 'border-white/30'
            } rounded px-3 py-1 hover:border-white/60 transition-colors`}>
            My Team
          </Link>
          <Link
            to='/public/leagues'
            className={`inline-block mt-2 mr-2 text-white/90 hover:text-white text-sm font-medium border-2 ${
              location.pathname === '/public/leagues'
                ? 'border-white'
                : 'border-white/30'
            } rounded px-3 py-1 hover:border-white/60 transition-colors`}>
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
  );
};
