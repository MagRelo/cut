import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Team } from '../services/api';

interface League {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  maxTeams: number;
  isPrivate: boolean;
  members: Array<{
    id: string;
    userId: string;
    role: string;
    joinedAt: string;
  }>;
}

export const LeagueLobby: React.FC = () => {
  const navigate = useNavigate();
  const { leagueId } = useParams<{ leagueId: string }>();
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [teams, setTeams] = useState<Team[]>([]);
  const [league, setLeague] = useState<League | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [userTeam, setUserTeam] = useState<Team | null>(null);

  useEffect(() => {
    const fetchLeagueData = async () => {
      if (!leagueId) {
        setError('No league ID provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch league details and teams in parallel
        const [leagueData, teamsData] = await Promise.all([
          api.getLeague(leagueId),
          api.getTeamsByLeague(leagueId),
        ]);

        setLeague(leagueData);
        setTeams(teamsData);

        // Check if user is a member of this league by checking the members array
        const userId = localStorage.getItem('userId'); // We need to store userId in localStorage after login
        const isMemberOfLeague = leagueData.members.some(
          (member) => member.userId === userId
        );
        setIsMember(isMemberOfLeague);

        // Find user's team if they have one
        if (isMemberOfLeague) {
          const userTeam = teamsData.find(
            (team) => team.userId === localStorage.getItem('userId')
          );
          setUserTeam(userTeam || null);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch league data'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeagueData();
  }, [leagueId]);

  const handleJoinLeave = async () => {
    if (!leagueId) return;

    setIsActionLoading(true);
    try {
      if (isMember) {
        await api.leaveLeague(leagueId);
        setIsMember(false);
      } else {
        await api.joinLeague(leagueId);
        setIsMember(true);
      }
      // Refresh league data after join/leave
      const [updatedLeague, updatedTeams] = await Promise.all([
        api.getLeague(leagueId),
        api.getTeamsByLeague(leagueId),
      ]);
      setLeague(updatedLeague);
      setTeams(updatedTeams);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform action');
    } finally {
      setIsActionLoading(false);
    }
  };

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const calculateTeamScore = (team: Team) => {
    return team.players
      .filter((player) => player.active)
      .reduce((sum, player) => sum + (player.total || 0), 0);
  };

  if (isLoading) {
    return (
      <div className='px-4 py-6'>
        <div className='text-center text-gray-600'>Loading league data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='px-4 py-6'>
        <div className='text-center text-red-600'>{error}</div>
      </div>
    );
  }

  if (!league) {
    return (
      <div className='px-4 py-6'>
        <div className='text-center text-red-600'>League not found</div>
      </div>
    );
  }

  return (
    <div className='px-4 py-6'>
      {/* League Header */}
      <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
        <div className='flex justify-between items-start'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>{league.name}</h1>
            {league.description && (
              <p className='mt-2 text-gray-600'>{league.description}</p>
            )}
            <div className='mt-4 flex space-x-4 text-sm text-gray-500'>
              <div>
                <span className='font-medium'>{league.memberCount}</span>{' '}
                members
              </div>
              <div>
                <span className='font-medium'>{teams.length}</span> teams
              </div>
              <div>
                Max teams:{' '}
                <span className='font-medium'>{league.maxTeams}</span>
              </div>
              <div>{league.isPrivate ? 'Private League' : 'Public League'}</div>
            </div>
          </div>
          <div className='flex space-x-2'>
            {isMember && !userTeam && (
              <button
                onClick={() => navigate(`/league/${leagueId}/create-team`)}
                className='px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors'>
                Create Team
              </button>
            )}
            <button
              onClick={handleJoinLeave}
              disabled={isActionLoading}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                isActionLoading
                  ? 'bg-gray-300 cursor-not-allowed'
                  : isMember
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}>
              {isActionLoading
                ? 'Processing...'
                : isMember
                ? 'Leave League'
                : 'Join League'}
            </button>
          </div>
        </div>
      </div>

      {/* Teams List */}
      <div className='space-y-4'>
        {teams.map((team) => (
          <div key={team.id} className='bg-white rounded-lg shadow'>
            <div className='w-full px-4 py-4 flex justify-between items-center'>
              <button
                onClick={() => toggleTeam(team.id)}
                className='flex-1 flex justify-between items-center hover:bg-gray-50 transition-colors'>
                <h2 className='text-xl font-bold text-gray-900'>{team.name}</h2>
                <div className='flex items-center space-x-4'>
                  <span className='text-lg font-semibold text-gray-900'>
                    Score: {calculateTeamScore(team)}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-500 transform transition-transform ${
                      expandedTeams.has(team.id) ? 'rotate-180' : ''
                    }`}
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M19 9l-7 7-7-7'
                    />
                  </svg>
                </div>
              </button>
              {team.userId === localStorage.getItem('userId') && (
                <button
                  onClick={() => navigate(`/team/${team.id}/edit`)}
                  className='ml-4 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors'>
                  Edit Team
                </button>
              )}
            </div>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                expandedTeams.has(team.id) ? 'max-h-[1000px]' : 'max-h-0'
              }`}>
              <div className='px-4 pb-4'>
                <div className='overflow-x-auto'>
                  <table className='min-w-full divide-y divide-gray-200'>
                    <thead>
                      <tr>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Player
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Status
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Pos
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          R1
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          R2
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          R3
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          R4
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Cut
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Bonus
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className='bg-white divide-y divide-gray-200'>
                      {team.players.map((player) => (
                        <tr key={player.id}>
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <div className='flex items-center'>
                              {player.player.imageUrl && (
                                <div className='flex-shrink-0 h-10 w-10'>
                                  <img
                                    className='h-10 w-10 rounded-full object-cover'
                                    src={player.player.imageUrl}
                                    alt={
                                      player.player.displayName ||
                                      player.player.name
                                    }
                                  />
                                </div>
                              )}
                              <div className='ml-4'>
                                <div className='text-sm font-medium text-gray-900'>
                                  {player.player.displayName ||
                                    player.player.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm'>
                            <div className='flex flex-col space-y-1'>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  player.player.inField
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                {player.player.inField
                                  ? 'In Field'
                                  : 'Not In Field'}
                              </span>
                            </div>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {player.leaderboardPosition || '-'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {player.r1?.strokes || '-'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {player.r2?.strokes || '-'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {player.r3?.strokes || '-'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {player.r4?.strokes || '-'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {player.cut || '-'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {player.bonus || '-'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {player.total || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
