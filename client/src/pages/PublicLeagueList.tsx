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
          <div className='bg-white rounded-lg shadow mb-6'>
            <div className='p-6'>
              <h2 className='text-xl font-semibold mb-2'>Active Tournament</h2>
              <div className='text-gray-600'>
                <p className='font-medium text-lg'>{activeTournament.name}</p>
                <div className='mt-2 text-sm space-y-1'>
                  <p>
                    {new Date(activeTournament.startDate).toLocaleDateString()}{' '}
                    - {new Date(activeTournament.endDate).toLocaleDateString()}
                  </p>
                  {activeTournament.venue && (
                    <p>{formatVenue(activeTournament)}</p>
                  )}
                  {activeTournament.location && (
                    <p>{formatTournamentLocation(activeTournament)}</p>
                  )}
                  {activeTournament.purse && (
                    <p>Purse: ${activeTournament.purse.toLocaleString()}</p>
                  )}
                </div>
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
