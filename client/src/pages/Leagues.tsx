import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type League as ApiLeague, type Team } from '../services/api';

// Extend League type to include leagueTeams for local use
interface LeagueTeam {
  team: Team;
}
interface LeagueWithTeams extends ApiLeague {
  leagueTeams: LeagueTeam[];
}

export function Leagues() {
  const [leagues, setLeagues] = useState<LeagueWithTeams[]>([]);
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
        const data = await api.getLeagues();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const leaguesWithTeams: LeagueWithTeams[] = data.map((l: any) => ({
          ...l,
          leagueTeams: l.leagueTeams ?? [],
        }));
        setLeagues(leaguesWithTeams);
      } catch (err) {
        setError('Failed to load leagues');
        console.error('Error fetching leagues:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeagues();
  }, []);

  const getMembershipStatus = (league: LeagueWithTeams) => {
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
      {/* Move buttons to bottom on mobile, top on desktop */}
      <div className='hidden md:flex justify-between items-center mb-8'>
        <div className='space-x-4'>
          <Link
            to='/leagues/new'
            className='bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700'>
            Create New League
          </Link>
          <Link
            to='/leagues/join'
            className='bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700'>
            Join Private League
          </Link>
        </div>
      </div>

      {leagues.length === 0 ? (
        <div className='text-center py-12'>
          <p className='text-gray-600 mb-4'>
            You haven't joined any leagues yet.
          </p>
          <Link
            to='/leagues/new'
            className='text-emerald-600 hover:text-emerald-500'>
            Create your first league
          </Link>
        </div>
      ) : (
        <div className='bg-white rounded-lg shadow overflow-hidden'>
          <div className='min-w-full'>
            {/* Table Header - Hide less important columns on mobile */}
            <div className='bg-gray-50 border-b border-gray-200'>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-3'>
                <div className='text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  League Name
                </div>
                <div className='hidden md:block text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Teams
                </div>
                <div className='text-right md:text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Status
                </div>
                <div className='hidden md:block text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Total Bets
                </div>
              </div>
            </div>
            {/* Table Body - Hide less important columns on mobile */}
            <div className='divide-y divide-gray-200'>
              {leagues.map((league) => {
                const membershipRole = getMembershipStatus(league);
                const isJoining = joiningLeagueId === league.id;
                const teams: Team[] = league.leagueTeams.map(
                  (lt: LeagueTeam) => lt.team
                );

                return (
                  <div
                    key={league.id}
                    className={`grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors duration-150 ${
                      membershipRole ? 'cursor-pointer' : ''
                    }`}
                    onClick={(e) => {
                      if (membershipRole) {
                        e.preventDefault();
                        navigate(`/league-lobby/${league.id}`);
                      }
                    }}>
                    <div className='text-left text-sm font-medium text-gray-900 flex items-center'>
                      {league.name}
                      {league.isPrivate && (
                        <span className='ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded'>
                          Private
                        </span>
                      )}
                    </div>
                    <div className='hidden md:block text-center text-sm text-gray-500'>
                      {teams.length}
                    </div>
                    <div className='text-right md:text-center'>
                      {membershipRole ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoinLeague(e, league.id);
                          }}
                          disabled={isJoining}
                          className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${
                            isJoining
                              ? 'bg-emerald-100 text-emerald-400 cursor-wait'
                              : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                          }`}>
                          {isJoining ? 'Joining...' : 'Join'}
                        </button>
                      )}
                    </div>
                    <div className='hidden md:block text-right text-sm text-gray-500'>
                      $0.00
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile buttons - stacked vertically at bottom */}
      <div className='md:hidden flex flex-col space-y-3 mt-8'>
        <Link
          to='/leagues/new'
          className='bg-emerald-600 text-white px-3 py-2 rounded-md hover:bg-emerald-700 text-sm text-center'>
          Create New League
        </Link>
        <Link
          to='/leagues/join'
          className='bg-emerald-600 text-white px-3 py-2 rounded-md hover:bg-emerald-700 text-sm text-center'>
          Join Private League
        </Link>
      </div>
    </div>
  );
}
