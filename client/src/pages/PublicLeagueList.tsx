import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  publicLeagueApi,
  type PublicLeague,
  type Tournament,
} from '../services/publicLeagueApi';

export const PublicLeagueList: React.FC = () => {
  const [leagues, setLeagues] = useState<PublicLeague[]>([]);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        const data = await publicLeagueApi.listLeagues();
        setLeagues(data.leagues);
        setActiveTournament(data.tournament || null);
      } catch (err) {
        setError('Failed to load leagues');
        console.error('Error fetching leagues:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeagues();
  }, []);

  const formatTournamentLocation = (tournament: Tournament): string => {
    if (typeof tournament.location === 'string') {
      return tournament.location;
    }
    if (tournament.location) {
      const loc = tournament.location;
      return [loc.city, loc.state, loc.country].filter(Boolean).join(', ');
    }
    return '';
  };

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
    <div className='container mx-auto px-4 py-8'>
      <div className='max-w-4xl mx-auto'>
        <div className='flex justify-between items-center mb-8'>
          <h1 className='text-3xl font-bold'>Public Leagues</h1>
          <Link
            to='/public/leagues/new'
            className='bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700'>
            Create League
          </Link>
        </div>

        {/* Active Tournament Section */}
        {activeTournament && (
          <div className='relative overflow-hidden rounded-lg border border-gray-200 mb-6'>
            {activeTournament.beautyImage ? (
              <>
                <div
                  className='absolute inset-0 bg-cover bg-center'
                  style={{
                    backgroundImage: `url(${activeTournament.beautyImage})`,
                  }}
                />
                <div className='absolute inset-0 bg-black/50' />
              </>
            ) : (
              <div className='absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-700' />
            )}
            <div className='relative p-6 text-white'>
              <div className='flex justify-between items-center'>
                <p className='text-2xl font-bold tracking-tight'>
                  {activeTournament.name}
                </p>
              </div>
              <div className='mt-2 space-y-2'>
                <div className='text-white/90'>
                  {activeTournament.venue && (
                    <p>{formatVenue(activeTournament)}</p>
                  )}
                  {activeTournament.location && (
                    <p>{formatTournamentLocation(activeTournament)}</p>
                  )}
                </div>
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
        )}

        {/* League List Section */}
        <div className='bg-white rounded-lg shadow'>
          <div className='p-6'>
            {isLoading ? (
              <div className='text-center py-4'>Loading leagues...</div>
            ) : error ? (
              <div className='text-red-600 text-center py-4'>{error}</div>
            ) : leagues.length === 0 ? (
              <div className='text-gray-500 text-center py-4'>
                No leagues found. Create one to get started!
              </div>
            ) : (
              <div className='space-y-4'>
                {leagues.map((league) => (
                  <div
                    key={league.id}
                    className='border-b pb-4 last:border-b-0 last:pb-0'>
                    <Link
                      to={`/public/league/${league.id}`}
                      className='block hover:bg-gray-50 p-4 -m-4 rounded transition-colors'>
                      <div className='flex justify-between items-center'>
                        <div>
                          <h3 className='text-lg font-semibold text-gray-900'>
                            {league.name}
                          </h3>
                          {league.description && (
                            <p className='text-gray-600 mt-1'>
                              {league.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
