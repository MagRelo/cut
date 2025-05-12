import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePublicLeagueApi } from '../services/publicLeagueApi';
import { LeagueCard } from '../components/LeagueCard';
import { type PublicLeague } from '../types/league';

export const PublicLeagueList: React.FC = () => {
  const [leagues, setLeagues] = useState<PublicLeague[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const publicLeagueApi = usePublicLeagueApi();

  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        const data = await publicLeagueApi.getLeagues();
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
                <LeagueCard key={league.id} league={league} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
