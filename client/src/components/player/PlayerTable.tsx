import React, { useState } from 'react';
import { PlayerScorecard } from './PlayerScorecard';
import type { TeamPlayer, RoundData } from '../../types/team';

interface PlayerTableProps {
  players: TeamPlayer[];
  getCurrentRound?: (
    player: TeamPlayer
  ) => { round: string; data: RoundData } | null;
}

export const PlayerTable: React.FC<PlayerTableProps> = ({
  players,
  getCurrentRound,
}) => {
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(
    new Set()
  );

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

  return (
    <div className='w-full overflow-x-auto'>
      <table className='w-full table-fixed divide-y divide-gray-200'>
        <thead className='bg-gray-100'>
          <tr>
            <th
              scope='col'
              className='w-48 sm:w-64 py-2 pl-3 pr-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider border-b-2 border-gray-200'>
              Player
            </th>
            <th
              scope='col'
              className='w-12 sm:w-16 px-2 sm:px-3 py-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wider border-b-2 border-gray-200'>
              Pos
            </th>
            <th
              scope='col'
              className='w-12 sm:w-16 px-2 sm:px-3 py-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wider border-b-2 border-gray-200'>
              Total
            </th>
            <th
              scope='col'
              className='w-12 sm:w-16 px-2 sm:px-3 py-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wider border-b-2 border-gray-200'>
              PTS
            </th>
          </tr>
        </thead>
        <tbody className='divide-y divide-gray-200'>
          {players
            .slice()
            .sort(
              (a, b) =>
                (b.total || 0) +
                (b.cut || 0) +
                (b.bonus || 0) -
                ((a.total || 0) + (a.cut || 0) + (a.bonus || 0))
            )
            .map((player) => (
              <React.Fragment key={player.id}>
                <tr className='hover:bg-gray-50/50'>
                  <td className='py-2 pl-3 pr-3 whitespace-nowrap'>
                    <div className='flex items-center'>
                      <div>
                        <button
                          onClick={() => togglePlayer(player.id)}
                          className='text-sm font-medium text-gray-900 flex items-center gap-2 hover:text-emerald-600'>
                          {/* Player Icon for current round */}

                          <span>
                            {player.player.pga_displayName || ''}

                            {getCurrentRound &&
                              (() => {
                                const round = getCurrentRound(player);
                                return round?.data.icon ? (
                                  <span className='text-lg pl-2'>
                                    {round.data.icon}
                                  </span>
                                ) : null;
                              })()}
                          </span>
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
                  <td className='px-2 sm:px-3 py-2 whitespace-nowrap text-xs font-bold text-gray-600 text-center'>
                    {player.leaderboardPosition || '-'}
                  </td>
                  <td className='px-2 sm:px-3 py-2 whitespace-nowrap text-xs font-bold text-center'>
                    <span
                      className={`${
                        player.leaderboardTotal === 'E' ||
                        !player.leaderboardTotal?.startsWith('-')
                          ? 'text-gray-600'
                          : 'text-red-600'
                      }`}>
                      {player.leaderboardTotal || '-'}
                    </span>
                  </td>
                  <td className='px-2 sm:px-3 py-2 whitespace-nowrap text-sm text-center font-medium text-gray-900'>
                    {(player.total ?? 0) +
                      (player.cut ?? 0) +
                      (player.bonus ?? 0)}
                  </td>
                </tr>
                {expandedPlayers.has(player.id) && (
                  <tr>
                    <td colSpan={4} className='p-0'>
                      <div className='border-t border-gray-200'>
                        <div className='w-full overflow-x-auto'>
                          <div className='inline-block min-w-full'>
                            <PlayerScorecard
                              player={player}
                              className='rounded-none shadow-none'
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
        </tbody>
      </table>
    </div>
  );
};
