import React, { useEffect, useState } from 'react';
import { publicLeagueApi } from '../services/publicLeagueApi';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { PublicTeamFormComponent } from '../components/team/PublicTeamFormComponent';
import { PlayerScorecard } from '../components/player/PlayerScorecard';
import type { Team, TeamPlayer } from '../services/api';

export const PublicSingleTeam: React.FC = () => {
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(
    new Set()
  );
  const [isEditing, setIsEditing] = useState(false);

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

  useEffect(() => {
    fetchTeam();
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
      <div className='mx-auto px-4 py-8'>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className='mx-auto px-4 py-8'>
        <ErrorMessage message={error} />
      </div>
    );
  }

  // If no team, show the form to create one
  if (!team) {
    return (
      <div className='mx-auto px-4 py-8'>
        <PublicTeamFormComponent leagueId={''} />
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className='mx-auto px-4 py-8'>
        <div className='max-w-2xl mx-auto'>
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
    <div className='mx-auto px-4 py-8'>
      <div className='max-w-2xl mx-auto bg-white rounded-lg shadow p-6 relative'>
        <h1 className='text-2xl font-bold mb-4' style={{ color: team.color }}>
          {/* Edit icon button */}
          <button
            className='float-right text-gray-400 hover:text-emerald-600 focus:outline-none text-sm'
            title='Edit Team'
            onClick={() => setIsEditing(true)}>
            Edit
          </button>
          {team.name}
        </h1>
        <div className='mb-6'>
          <h2 className='text-lg font-semibold mb-2'>Players</h2>
          <div className='overflow-x-auto'>
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
        </div>
      </div>
    </div>
  );
};
