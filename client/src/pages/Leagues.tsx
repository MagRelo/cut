import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

interface League {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  teams: {
    id: string;
    name: string;
    userId: string;
  }[];
}

export function Leagues() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        const data = await api.get('/leagues');
        setLeagues(data);
      } catch (err) {
        setError('Failed to load leagues');
        console.error('Error fetching leagues:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeagues();
  }, []);

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900'></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-red-600'>{error}</div>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex justify-between items-center mb-8'>
        <h1 className='text-3xl font-bold text-gray-900'>My Leagues</h1>
        <Link
          to='/leagues/new'
          className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700'>
          Create New League
        </Link>
      </div>

      {leagues.length === 0 ? (
        <div className='text-center py-12'>
          <p className='text-gray-600 mb-4'>
            You haven't joined any leagues yet.
          </p>
          <Link to='/leagues/new' className='text-blue-600 hover:text-blue-800'>
            Create your first league
          </Link>
        </div>
      ) : (
        <div className='bg-white rounded-lg shadow overflow-hidden'>
          <div className='min-w-full'>
            {/* Table Header */}
            <div className='bg-gray-50 border-b border-gray-200'>
              <div className='grid grid-cols-3 gap-4 px-6 py-3'>
                <div className='text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  League Name
                </div>
                <div className='text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Teams
                </div>
                <div className='text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Total Bets
                </div>
              </div>
            </div>
            {/* Table Body */}
            <div className='divide-y divide-gray-200'>
              {leagues.map((league) => (
                <Link
                  key={league.id}
                  to={`/league-lobby/${league.id}`}
                  className='grid grid-cols-3 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors duration-150'>
                  <div className='text-left text-sm font-medium text-gray-900'>
                    {league.name}
                  </div>
                  <div className='text-center text-sm text-gray-500'>
                    {league.teams.length}
                  </div>
                  <div className='text-right text-sm text-gray-500'>$0.00</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
