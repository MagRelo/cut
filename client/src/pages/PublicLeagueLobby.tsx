import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  publicLeagueApi,
  type PublicLeague as ApiPublicLeague,
} from '../services/publicLeagueApi';
import { PlayerScorecard } from '../components/player/PlayerScorecard';
import { TournamentInfoCard } from '../components/common/TournamentInfoCard';
import { Share } from '../components/common/Share';

interface Player {
  id: string;
  pga_pgaTourId?: string | null;
  pga_imageUrl?: string | null;
  pga_displayName?: string | null;
  pga_firstName?: string | null;
  pga_lastName?: string | null;
  pga_shortName?: string | null;
  pga_country?: string | null;
  pga_countryFlag?: string | null;
  pga_age?: number | null;
  isActive: boolean;
  inField: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date | null;
}

interface Round {
  strokes: number;
  total?: number;
}

interface TeamPlayer {
  id: string;
  teamId: string;
  playerId: string;
  active: boolean;
  player: Player;
  leaderboardPosition?: string;
  r1?: Round;
  r2?: Round;
  r3?: Round;
  r4?: Round;
  cut?: number;
  bonus?: number;
  total?: number;
  updatedAt: Date;
}

interface Team {
  id: string;
  name: string;
  color: string;
  players: TeamPlayer[];
  userId: string;
  leagueId: string;
}

interface LeagueTeam {
  team: Team;
}

interface PublicLeagueWithTeams extends ApiPublicLeague {
  leagueTeams: LeagueTeam[];
}

export const PublicLeagueLobby: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [league, setLeague] = useState<PublicLeagueWithTeams | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const userId = localStorage.getItem('publicUserGuid');
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(
    new Set()
  );
  const navigate = useNavigate();

  const fetchLeague = async () => {
    if (!leagueId) return;

    try {
      const data = await publicLeagueApi.getLeague(leagueId);
      // Ensure leagueTeams is present for type safety
      const leagueWithTeams: PublicLeagueWithTeams = {
        ...data,
        leagueTeams: (data as { leagueTeams?: LeagueTeam[] }).leagueTeams ?? [],
      };
      setLeague(leagueWithTeams);
    } catch (err) {
      setError('Failed to load league details');
      console.error('Error fetching league:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('PublicLeagueLobby mounted with userId:', userId);
    fetchLeague();
  }, [leagueId]);

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

  const togglePlayer = (playerId: string) => {
    setExpandedPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  };

  const calculateTeamScore = (team: Team) => {
    return team.players
      .filter((player) => player.active)
      .reduce((sum, player) => sum + (player.total || 0), 0);
  };

  const findMostRecentPlayerUpdate = (): Date | null => {
    if (!league?.leagueTeams?.length) return null;

    let mostRecent: Date | null = null;
    league.leagueTeams.forEach((lt: LeagueTeam) => {
      const team = lt.team;
      team.players.forEach((player: TeamPlayer) => {
        const playerDate = new Date(player.updatedAt);
        if (!mostRecent || playerDate > mostRecent) {
          mostRecent = playerDate;
        }
      });
    });
    return mostRecent;
  };

  const formatUpdateTime = (date: Date | null): string => {
    if (!date) return 'No updates yet';

    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return `${month}/${day} ${displayHours}:${minutes} ${ampm}`;
  };

  const renderPlayerRow = (player: TeamPlayer) => (
    <React.Fragment key={player.id}>
      <tr className='hover:bg-gray-50/50'>
        <td className='px-3 py-2 whitespace-nowrap text-xs font-bold text-gray-600 text-center'>
          {player.leaderboardPosition || '-'}
        </td>
        <td className='py-2 pl-2 pr-3 whitespace-nowrap'>
          <div className='flex items-center'>
            {player.player.pga_imageUrl && (
              <div className='flex-shrink-0 h-10 w-10 relative'>
                <img
                  className='h-10 w-10 rounded-full object-cover ring-2 ring-white'
                  src={player.player.pga_imageUrl}
                  alt={player.player.pga_displayName || ''}
                />
              </div>
            )}
            <div className='ml-4'>
              <button
                onClick={() => togglePlayer(player.id)}
                className='text-sm font-medium text-gray-900 flex items-center gap-2 hover:text-emerald-600'>
                {player.player.pga_displayName || ''}
                <svg
                  className={`w-4 h-4 text-gray-400 transform transition-transform duration-200 ${
                    expandedPlayers.has(player.id) ? 'rotate-180' : ''
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
              </button>
            </div>
          </div>
        </td>

        <td className='px-3 py-2 whitespace-nowrap text-sm text-center font-medium text-gray-900'>
          {player.total ?? '-'}
        </td>

        <td className='px-3 py-2 whitespace-nowrap text-sm text-center text-gray-600'>
          {player.r1?.total ?? '-'}
        </td>
        <td className='px-3 py-2 whitespace-nowrap text-sm text-center text-gray-600'>
          {player.r2?.total ?? '-'}
        </td>
        <td className='px-3 py-2 whitespace-nowrap text-sm text-center text-gray-600'>
          {player.r3?.total ?? '-'}
        </td>
        <td className='px-3 py-2 whitespace-nowrap text-sm text-center text-gray-600'>
          {player.r4?.total ?? '-'}
        </td>
        <td className='px-3 py-2 whitespace-nowrap text-sm text-center text-gray-600'>
          {player.cut ?? '-'}
        </td>
        <td className='px-3 py-2 whitespace-nowrap text-sm text-center text-gray-600'>
          {player.bonus ?? '-'}
        </td>
      </tr>
      {expandedPlayers.has(player.id) && (
        <tr>
          <td colSpan={9} className='p-0'>
            <div className='border-t border-gray-200'>
              <div className='bg-gray-600/10 px-2 pb-2'>
                <PlayerScorecard
                  player={player}
                  className='rounded-none shadow-none'
                />
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );

  const renderTeamPlayers = (team: Team) => (
    <div className='pb-4'>
      <div className='overflow-x-auto'>
        <div className='inline-block min-w-full align-middle'>
          <table className='min-w-full divide-y divide-gray-200'>
            <thead className='bg-gray-100'>
              <tr>
                <th
                  scope='col'
                  className='px-3 py-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider border-b-2 border-gray-200'>
                  Pos
                </th>
                <th
                  scope='col'
                  className='py-2 pl-2 pr-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider border-b-2 border-gray-200'>
                  Player
                </th>
                <th
                  scope='col'
                  className='px-3 py-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider border-b-2 border-gray-200'>
                  Total
                </th>

                <th
                  scope='col'
                  className='px-3 py-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider border-b-2 border-gray-200'>
                  R1
                </th>
                <th
                  scope='col'
                  className='px-3 py-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider border-b-2 border-gray-200'>
                  R2
                </th>
                <th
                  scope='col'
                  className='px-3 py-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider border-b-2 border-gray-200'>
                  R3
                </th>
                <th
                  scope='col'
                  className='px-3 py-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider border-b-2 border-gray-200'>
                  R4
                </th>
                <th
                  scope='col'
                  className='px-3 py-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider border-b-2 border-gray-200'>
                  Cut
                </th>
                <th
                  scope='col'
                  className='px-3 py-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider border-b-2 border-gray-200'>
                  Bonus
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200'>
              {team.players
                .sort((a, b) => (b.total || 0) - (a.total || 0))
                .map(renderPlayerRow)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const handleJoinLeague = async () => {
    if (!leagueId) return;

    setIsActionLoading(true);
    try {
      await publicLeagueApi.joinLeague(leagueId);
      // Refresh the league data after joining
      await fetchLeague();
    } catch (err) {
      console.error('Error joining league:', err);
      setError('Failed to join league');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLeaveLeague = async () => {
    if (!leagueId) return;

    setIsActionLoading(true);
    try {
      await publicLeagueApi.leaveLeague(leagueId);
      // Refresh the league data after leaving
      await fetchLeague();
    } catch (err) {
      setError('Failed to leave league');
      console.error('Error leaving league:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='text-center'>Loading league details...</div>
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='text-red-600 text-center'>
          {error || 'League not found'}
        </div>

        <p className='text-center my-4'>Make sure you have created a team.</p>

        <div className='flex justify-center my-8'>
          <button
            onClick={() => navigate('/public/team')}
            className='bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
            My Team
          </button>
        </div>
      </div>
    );
  }

  const teams: Team[] =
    league.leagueTeams?.map((lt: LeagueTeam) => lt.team) ?? [];

  const userHasTeam = teams.some((team) => team.userId === userId);

  return (
    <div className='container mx-auto'>
      {/* Tournament Information */}
      {league.tournament && (
        <TournamentInfoCard tournament={league.tournament} />
      )}

      <div className='max-w-4xl mx-auto px-4 py-4'>
        <div className='bg-white rounded-lg shadow'></div>

        {/* Teams Section */}
        <div className='bg-white rounded-lg shadow'>
          <div className='flex justify-between items-center p-4'>
            <h1 className='text-2xl font-bold'>{league.name}</h1>
          </div>
          <div>
            <div className='space-y-0'>
              {teams.length === 0 ? (
                <div className='text-gray-500 text-center py-3'>
                  No teams yet. Create one to get started!
                </div>
              ) : (
                [...teams]
                  .sort(
                    (a: Team, b: Team) =>
                      calculateTeamScore(b) - calculateTeamScore(a)
                  )
                  .map((team: Team, index: number) => (
                    <div
                      key={team.id}
                      className={`${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } hover:bg-gray-100/70 transition-colors`}>
                      <div className='w-full'>
                        <button
                          onClick={() => toggleTeam(team.id)}
                          className='w-full px-4 py-2 flex justify-between items-center'>
                          <div className='flex items-center'>
                            <div
                              className='w-4 h-4 rounded-full mr-2'
                              style={{ backgroundColor: team.color }}
                            />
                            <h3 className='text-base font-medium text-gray-900'>
                              {team.name}
                            </h3>
                          </div>
                          <div className='flex items-center space-x-4'>
                            <span className='text-sm font-semibold text-gray-900'>
                              {calculateTeamScore(team)}
                            </span>
                            <svg
                              className={`w-5 h-5 text-gray-400 transform transition-transform duration-200 ${
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
                      </div>
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          expandedTeams.has(team.id)
                            ? 'max-h-[1000px] border-t border-gray-200'
                            : 'max-h-0'
                        }`}>
                        {renderTeamPlayers(team)}
                      </div>
                    </div>
                  ))
              )}
            </div>
            {/* Last Update Time */}
            <div className='text-xs text-gray-400 text-center py-2 border-t border-gray-100 flex items-center justify-center gap-2'>
              <span>
                Last update: {formatUpdateTime(findMostRecentPlayerUpdate())}
              </span>
              <button
                onClick={fetchLeague}
                className='p-1 hover:bg-gray-100 rounded-full transition-colors'
                title='Refresh data'>
                <svg
                  className='w-4 h-4'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Add/Leave League Buttons */}
        <div className='flex justify-center my-8'>
          {userHasTeam ? (
            <button
              onClick={handleLeaveLeague}
              disabled={isActionLoading}
              className='bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
              {isActionLoading ? 'Leaving...' : 'Leave League'}
            </button>
          ) : (
            <button
              onClick={handleJoinLeague}
              disabled={isActionLoading}
              className='bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
              {isActionLoading ? 'Joining...' : 'Join League'}
            </button>
          )}
        </div>

        {/* Share Section */}
        <div className='flex justify-center my-8'>
          <Share
            url={`${
              import.meta.env.VITE_BASE_URL || window.location.origin
            }/public/team`}
            title='Share!'
            subtitle='Free &#x2022; No Signup Required'
          />
        </div>
      </div>
    </div>
  );
};
