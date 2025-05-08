import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { publicLeagueApi, Tournament } from '../services/publicLeagueApi';
import type { Team, TeamPlayer } from '../services/api';

import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { PublicTeamFormComponent } from '../components/team/PublicTeamFormComponent';
import { PlayerScorecard } from '../components/player/PlayerScorecard';
import { TournamentInfoCard } from '../components/common/TournamentInfoCard';
import { Share } from '../components/common/Share';

export const PublicSingleTeam: React.FC = () => {
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(
    new Set()
  );
  const [isEditing, setIsEditing] = useState(false);
  const [tournament, setTournament] = useState<Tournament | undefined>();
  const [tournamentLoading, setTournamentLoading] = useState(true);
  const [tournamentError, setTournamentError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchTeam = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await publicLeagueApi.getStandaloneTeam();
      setTeam(result || null);
    } catch {
      setError('Failed to load team');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTournament = async () => {
    setTournamentLoading(true);
    setTournamentError(null);
    try {
      const result = await publicLeagueApi.getCurrentTournament();
      setTournament(result);
    } catch {
      setTournamentError('Failed to load tournament');
    } finally {
      setTournamentLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
    fetchTournament();
  }, []);

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

  const findMostRecentPlayerUpdate = (): Date | null => {
    if (!team) return null;

    let mostRecent: Date | null = null;

    team.players.forEach((player: TeamPlayer) => {
      const playerDate = new Date(player.updatedAt);
      if (!mostRecent || playerDate > mostRecent) {
        mostRecent = playerDate;
      }
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
          {player.r1?.total !== undefined ? player.r1.total : '-'}
        </td>
        <td className='px-3 py-2 whitespace-nowrap text-sm text-center text-gray-600'>
          {player.r2?.total !== undefined ? player.r2.total : '-'}
        </td>
        <td className='px-3 py-2 whitespace-nowrap text-sm text-center text-gray-600'>
          {player.r3?.total !== undefined ? player.r3.total : '-'}
        </td>
        <td className='px-3 py-2 whitespace-nowrap text-sm text-center text-gray-600'>
          {player.r4?.total !== undefined ? player.r4.total : '-'}
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
              <PlayerScorecard
                player={player}
                className='rounded-none shadow-none'
              />
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );

  if (isLoading) {
    return (
      <div className='mx-auto md:px-4 md:py-8'>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className='mx-auto md:px-4 md:py-8'>
        <ErrorMessage message={error} />
      </div>
    );
  }

  // If no team, show the form to create one
  if (!team) {
    return (
      <div className='mx-auto md:px-4 md:py-8'>
        {/* Tournament Info Card */}
        {tournamentLoading ? (
          <div className='md:mb-6'>
            <LoadingSpinner />
          </div>
        ) : tournamentError ? (
          <div className='md:mb-6'>
            <ErrorMessage message={tournamentError} />
          </div>
        ) : tournament ? (
          <div className='md:mb-6'>
            <TournamentInfoCard tournament={tournament} />
          </div>
        ) : null}

        <PublicTeamFormComponent
          leagueId={''}
          editMode={true}
          onCancel={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false);
            fetchTeam();
          }}
        />
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className='mx-auto md:px-4 md:py-8'>
        <div className='max-w-2xl mx-auto'>
          {/* Tournament Info Card */}
          {tournamentLoading ? (
            <div className='md:mb-6'>
              <LoadingSpinner />
            </div>
          ) : tournamentError ? (
            <div className='md:mb-6'>
              <ErrorMessage message={tournamentError} />
            </div>
          ) : tournament ? (
            <div className='md:mb-6'>
              <TournamentInfoCard tournament={tournament} />
            </div>
          ) : null}
          <PublicTeamFormComponent
            leagueId={''}
            editMode={true}
            onCancel={() => setIsEditing(false)}
            onSuccess={() => {
              setIsEditing(false);
              fetchTeam();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className='mx-auto md:px-4 md:py-8'>
      <div className='max-w-2xl mx-auto'>
        {/* Tournament Info Card */}
        {tournamentLoading ? (
          <div className='md:mb-6'>
            <LoadingSpinner />
          </div>
        ) : tournamentError ? (
          <div className='md:mb-6'>
            <ErrorMessage message={tournamentError} />
          </div>
        ) : tournament ? (
          <div className='md:mb-6'>
            <TournamentInfoCard tournament={tournament} />
          </div>
        ) : null}
      </div>
      <div className='max-w-2xl mx-auto bg-white rounded-lg shadow relative px-6 pt-6'>
        <h2 className='text-lg font-semibold mb-2'>
          My Golfers
          {/* Edit icon button */}
          <button
            className='float-right text-gray-400 hover:text-emerald-600 focus:outline-none text-sm'
            title='Edit Team'
            onClick={() => setIsEditing(true)}>
            Edit
          </button>
        </h2>
        <div className='overflow-x-auto -mx-4 md:mx-0'>
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
                .slice()
                .sort((a, b) => (b.total || 0) - (a.total || 0))
                .map(renderPlayerRow)}
            </tbody>
          </table>
        </div>

        {/* Last Update Time */}
        <div className='text-xs text-gray-400 text-center p-4 border-t border-gray-100 '>
          Last update: {formatUpdateTime(findMostRecentPlayerUpdate())}
        </div>
      </div>

      <hr className='my-8' />

      {/* New button to navigate to public leagues */}
      <div className='max-w-2xl mx-auto mt-6 flex justify-center mb-6'>
        <button
          onClick={() => navigate('/public/leagues')}
          className='px-6 py-2 bg-emerald-600 text-white rounded-lg shadow hover:bg-emerald-700 transition-colors duration-150 font-semibold'>
          Leagues <small>&#9658;</small>
        </button>
      </div>

      {/* Share Section */}
      <div className='flex justify-center my-8'>
        <Share
          url={window.location.href}
          title='Share!'
          subtitle='Free &#x2022; No Signup Required'
        />
      </div>
    </div>
  );
};
