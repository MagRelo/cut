import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  usePublicLeagueApi,
  type PublicLeague,
} from '../services/publicLeagueApi';

export const PublicLeagueList: React.FC = () => {
  const [leagues, setLeagues] = useState<PublicLeague[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const publicLeagueApi = usePublicLeagueApi();

  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        const data = await publicLeagueApi.listLeagues();
        setLeagues(data.leagues);
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
    <div className='container mx-auto'>
      <div className='max-w-2xl mx-auto p-4'>
        {/* Header Section */}
        <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-2 sm:space-y-0'>
          <h1 className='text-3xl font-bold'>Public Leagues</h1>
          <Link
            to='/public/leagues/new'
            className='text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition-colors duration-150 inline-flex items-center gap-1'>
            <span className='text-sm font-medium'>+ Add League</span>
          </Link>
        </div>

        {/* League List Section */}
        <div className='space-y-2'>
          {isLoading ? (
            <div className='text-center py-4'>Loading leagues...</div>
          ) : error ? (
            <div className='text-red-600 text-center py-4'>{error}</div>
          ) : leagues.length === 0 ? (
            <div className='text-gray-500 text-center py-4'>
              No leagues found. Create one to get started!
            </div>
          ) : (
            <div className='space-y-2'>
              {leagues.map((league) => (
                <div key={league.id} className='group'>
                  <Link
                    to={`/public/league/${league.id}`}
                    className='block bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 p-4 rounded-lg transition-all duration-200 hover:shadow-sm'>
                    <div className='flex justify-between items-center'>
                      <div>
                        <h3 className='text-lg font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors'>
                          {league.name}
                        </h3>
                        {league.description && (
                          <p className='text-gray-600 mt-1 text-sm'>
                            {league.description}
                          </p>
                        )}
                      </div>
                      <div className='text-gray-400 group-hover:text-emerald-500 transition-colors'>
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          className='h-5 w-5'
                          viewBox='0 0 20 20'
                          fill='currentColor'>
                          <path
                            fillRule='evenodd'
                            d='M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z'
                            clipRule='evenodd'
                          />
                        </svg>
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
  );
};
