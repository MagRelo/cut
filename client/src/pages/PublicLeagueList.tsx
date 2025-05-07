import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  publicLeagueApi,
  type PublicLeague,
  type Tournament,
} from '../services/publicLeagueApi';
import { TournamentInfoCard } from '../components/common/TournamentInfoCard';

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

  return (
    <div className='container mx-auto '>
      {/* Active Tournament Section */}
      {activeTournament && <TournamentInfoCard tournament={activeTournament} />}
      <div className='max-w-4xl mx-auto px-4 py-8'>
        {/* Header Section */}
        <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-2 sm:space-y-0'>
          <h1 className='text-3xl font-bold'>Public Leagues</h1>
          <Link
            to='/public/leagues/new'
            className='text-white bg-emerald-600/90 hover:bg-emerald-500 px-4 py-2 rounded-lg transition-colors duration-150 inline-flex items-center gap-1'>
            <span className='text-sm font-medium'>+ Add League</span>
          </Link>
        </div>

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
