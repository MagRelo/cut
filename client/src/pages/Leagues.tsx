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
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {leagues.map((league) => (
            <div
              key={league.id}
              className='bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow'>
              <h2 className='text-xl font-semibold text-gray-900 mb-2'>
                {league.name}
              </h2>
              {league.description && (
                <p className='text-gray-600 mb-4'>{league.description}</p>
              )}
              <div className='space-y-2'>
                <p className='text-sm text-gray-500'>
                  Created: {new Date(league.createdAt).toLocaleDateString()}
                </p>
                <p className='text-sm text-gray-500'>
                  Teams: {league.teams.length}
                </p>
              </div>
              <div className='mt-4'>
                <Link
                  to={`/tournament/${league.id}`}
                  className='text-blue-600 hover:text-blue-800'>
                  View Tournament →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
