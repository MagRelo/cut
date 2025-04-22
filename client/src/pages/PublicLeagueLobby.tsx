import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  publicLeagueApi,
  type PublicLeague,
  type Tournament,
} from '../services/publicLeagueApi';
import { PublicTeamFormComponent } from '../components/team/PublicTeamFormComponent';
import { PlayerScorecard } from '../components/player/PlayerScorecard';

interface Player {
  id: string;
  pgaTourId: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  pga_imageUrl: string | null;
  country: string | null;
  countryFlag: string | null;
  age: number | null;
  inField: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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

export const PublicLeagueLobby: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [league, setLeague] = useState<PublicLeague | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCopied, setShowCopied] = useState(false);
  const userId = localStorage.getItem('publicUserGuid');
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(
    new Set()
  );

  const fetchLeague = async () => {
    if (!leagueId) return;

    try {
      const data = await publicLeagueApi.getLeague(leagueId);
      setLeague(data);
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

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
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
    if (!league?.teams.length) return null;

    let mostRecent: Date | null = null;
    league.teams.forEach((team) => {
      team.players.forEach((player) => {
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
        <td className='px-3 py-2 whitespace-nowrap text-sm text-center text-gray-600'>
          {player.leaderboardPosition || '-'}
        </td>
        <td className='py-2 pl-2 pr-3 whitespace-nowrap'>
          <div className='flex items-center'>
            {player.player.pga_imageUrl && (
              <div className='flex-shrink-0 h-10 w-10 relative'>
                <img
                  className='h-10 w-10 rounded-full object-cover ring-2 ring-white'
                  src={player.player.pga_imageUrl}
                  alt={player.player.displayName || player.player.name}
                />
              </div>
            )}
            <div className='ml-4'>
              <button
                onClick={() => togglePlayer(player.id)}
                className='text-sm font-medium text-gray-900 flex items-center gap-2 hover:text-emerald-600'>
                {player.player.displayName || player.player.name}
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
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-4'>
      <div className='max-w-4xl mx-auto space-y-4'>
        <div className='bg-white rounded-lg shadow'>
          {/* Tournament Information */}
          {league.tournament && (
            <div className='relative overflow-hidden rounded-lg border border-gray-200 mt-2'>
              {league.tournament.beautyImage ? (
                <>
                  <div
                    className='absolute inset-0 bg-cover bg-center'
                    style={{
                      backgroundImage: `url(${league.tournament.beautyImage})`,
                    }}
                  />
                  <div className='absolute inset-0 bg-black/50' />
                </>
              ) : (
                <div className='absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-700' />
              )}
              <div className='relative p-4 text-white'>
                <div className='flex justify-between items-center'>
                  <p className='text-2xl font-bold tracking-tight'>
                    {league.tournament.name}
                  </p>
                </div>
                <div className='mt-1 space-y-1'>
                  {league.tournament.venue && (
                    <p className='text-white/90'>
                      {formatVenue(league.tournament)}
                    </p>
                  )}
                  <a
                    href='https://www.pgatour.com/leaderboard'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-block mt-2 text-white/90 hover:text-white text-sm font-medium border border-white/30 rounded px-3 py-1 hover:border-white/60 transition-colors'>
                    Leaderboard ↗
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Teams Section */}
        <div className='bg-white rounded-lg shadow'>
          <div className='flex justify-between items-center p-4'>
            <h1 className='text-2xl font-bold'>{league.name}</h1>
          </div>
          <div>
            <div className='space-y-0'>
              {league.teams.length === 0 ? (
                <div className='text-gray-500 text-center py-3'>
                  No teams yet. Create one to get started!
                </div>
              ) : (
                [...league.teams]
                  .sort((a, b) => calculateTeamScore(b) - calculateTeamScore(a))
                  .map((team, index) => (
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
            <div className='text-xs text-gray-400 text-center py-2 border-t border-gray-100'>
              Last update: {formatUpdateTime(findMostRecentPlayerUpdate())}
            </div>
          </div>
        </div>

        {/* My Team Section */}
        {league.teams.length < league.maxTeams &&
          leagueId &&
          (() => {
            const userTeam = league.teams.find(
              (team) => team.userId === userId
            );
            const isScheduled = league.tournament?.status === 'scheduled';

            // Case 1: No userId -> always show form
            if (!userId)
              return (
                <PublicTeamFormComponent
                  leagueId={leagueId}
                  onSuccess={fetchLeague}
                />
              );

            // Case 2: Has userId but no team -> show form
            if (!userTeam)
              return (
                <PublicTeamFormComponent
                  leagueId={leagueId}
                  onSuccess={fetchLeague}
                />
              );

            // Case 3: Has team and tournament is scheduled -> show form
            if (userTeam && isScheduled)
              return (
                <PublicTeamFormComponent
                  leagueId={leagueId}
                  onSuccess={fetchLeague}
                />
              );

            // Case 4: Has team but tournament in progress -> don't show form
            return null;
          })()}

        {/* Share Section */}
        <div className='bg-white rounded-lg shadow'>
          <div className='p-4'>
            <div className='flex flex-col items-center space-y-3'>
              <h2 className='text-lg font-semibold text-gray-900'>
                Share League
              </h2>
              <button
                onClick={handleShare}
                className='inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors'>
                {showCopied ? (
                  <>
                    <svg
                      className='w-4 h-4 mr-2 text-green-500'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M5 13l4 4L19 7'
                      />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg
                      className='w-4 h-4 mr-2'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
                      />
                    </svg>
                    Copy Link
                  </>
                )}
              </button>
              <div className='p-3 bg-white rounded-lg border border-gray-200'>
                <QRCodeSVG value={window.location.href} size={128} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
