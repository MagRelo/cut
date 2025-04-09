import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface League {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isPrivate: boolean;
  teams: {
    id: string;
    name: string;
    userId: string;
  }[];
  members: Array<{
    id: string;
    userId: string;
    role: string;
    joinedAt: string;
  }>;
}

export function Leagues() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [joiningLeagueId, setJoiningLeagueId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get userId from localStorage
    const storedUserId = localStorage.getItem('userId');
    setUserId(storedUserId);

    const fetchLeagues = async () => {
      try {
        const data = await api.get<League[]>('/leagues');
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

  const getMembershipStatus = (league: League) => {
    if (!userId) return null;
    const membership = league.members.find(
      (member) => member.userId === userId
    );
    return membership?.role || null;
  };

  const handleJoinLeague = async (e: React.MouseEvent, leagueId: string) => {
    e.preventDefault(); // Prevent navigation from Link component
    if (!leagueId) return;

    setJoiningLeagueId(leagueId);
    try {
      await api.joinLeague(leagueId);
      // Navigate to league lobby after successful join
      navigate(`/league-lobby/${leagueId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join league');
    } finally {
      setJoiningLeagueId(null);
    }
  };

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
              <div className='grid grid-cols-4 gap-4 px-6 py-3'>
                <div className='text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  League Name
                </div>
                <div className='text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Teams
                </div>
                <div className='text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Status
                </div>
                <div className='text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Total Bets
                </div>
              </div>
            </div>
            {/* Table Body */}
            <div className='divide-y divide-gray-200'>
              {leagues.map((league) => {
                const membershipRole = getMembershipStatus(league);
                const isJoining = joiningLeagueId === league.id;

                return (
                  <div
                    key={league.id}
                    className='grid grid-cols-4 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors duration-150'>
                    <div className='text-left text-sm font-medium text-gray-900 flex items-center'>
                      {membershipRole ? (
                        <Link
                          to={`/league-lobby/${league.id}`}
                          className='hover:text-blue-600'>
                          {league.name}
                        </Link>
                      ) : (
                        league.name
                      )}
                      {league.isPrivate && (
                        <span className='ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded'>
                          Private
                        </span>
                      )}
                    </div>
                    <div className='text-center text-sm text-gray-500'>
                      {league.teams.length}
                    </div>
                    <div className='text-center'>
                      {membershipRole ? (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            membershipRole === 'COMMISSIONER'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                          {membershipRole === 'COMMISSIONER'
                            ? 'Commissioner'
                            : 'Member'}
                        </span>
                      ) : (
                        <button
                          onClick={(e) => handleJoinLeague(e, league.id)}
                          disabled={isJoining || league.isPrivate}
                          className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium ${
                            league.isPrivate
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : isJoining
                              ? 'bg-blue-100 text-blue-400 cursor-wait'
                              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                          }`}>
                          {isJoining ? 'Joining...' : 'Join'}
                        </button>
                      )}
                    </div>
                    <div className='text-right text-sm text-gray-500'>
                      $0.00
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
