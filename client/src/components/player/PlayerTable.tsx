import React, { useState } from 'react';
import { PlayerScorecard } from './PlayerScorecard';
import type { TeamPlayer, RoundData } from '../../types/team';

interface PlayerTableProps {
  players: TeamPlayer[];
  getCurrentRound?: (
    player: TeamPlayer
  ) => { round: string; data: RoundData } | null;
  currentRound: string;
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

  // const calculateScoreToPar = (roundData: RoundData): string => {
  //   if (roundData.ratio === 0) return '-';

  //   const totalScore = roundData?.holes?.scores.reduce(
  //     (sum: number, score: number | null) => sum + (score || 0),
  //     0
  //   );

  //   const totalPar = roundData?.holes?.scores.reduce(
  //     (sum: number, score: number | null, index: number) =>
  //       score !== null ? sum + (roundData.holes?.par[index] || 0) : sum,
  //     0
  //   );

  //   const scoreToPar = totalScore && totalPar ? totalScore - totalPar : 0;

  //   if (scoreToPar === 0) return 'E';
  //   return scoreToPar > 0 ? `+${scoreToPar}` : `${scoreToPar}`;
  // };

  return (
    <div className='w-full overflow-x-auto'>
      <table className='w-full table-fixed divide-y divide-gray-200'>
        <thead className='bg-gray-100'>
          <tr>
            <th
              scope='col'
              className='px-4 py-2 text-left text-xs font-bold text-gray-400 uppercase tracking-wider border-b-2 border-gray-200'>
              Player
            </th>
            <th
              scope='col'
              className='w-12 py-2 pl-1 text-center text-xs font-bold text-gray-400 uppercase tracking-wider border-b-2 border-gray-200'>
              Pos
            </th>
            <th
              scope='col'
              className='w-12 py-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wider border-b-2 border-r border-gray-200'>
              TOT
            </th>
            {/* <th
              scope='col'
              className='w-10 py-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wider border-b-2 border-gray-200'>
              {currentRound}
            </th> */}
            <th
              scope='col'
              className='w-12 py-2  pr-1 text-center text-xs font-bold text-gray-400 uppercase tracking-wider border-b-2 border-gray-200'>
              THRU
            </th>
          </tr>
        </thead>
        <tbody className='divide-y divide-gray-200'>
          {players
            .slice()
            .sort((a, b) => {
              // Handle cases where position might be "-" or undefined
              const getPosition = (pos: string | undefined) => {
                if (!pos || pos === '-') return Infinity;
                // Remove "T" prefix if present and convert to number
                return parseInt(pos.replace('T', ''));
              };

              return (
                getPosition(a.leaderboardPosition) -
                getPosition(b.leaderboardPosition)
              );
            })
            .map((player) => (
              <React.Fragment key={player.id}>
                <tr
                  onClick={() => togglePlayer(player.id)}
                  className='hover:bg-gray-50/50 cursor-pointer'
                  role='button'
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      togglePlayer(player.id);
                    }
                  }}
                  aria-label={
                    expandedPlayers.has(player.id)
                      ? 'Hide scorecard'
                      : 'Show scorecard'
                  }>
                  <td className='px-2 py-3 pl-4 text-left'>
                    <div className='flex items-center'>
                      <div>
                        <div className='text-sm font-medium text-gray-900 flex items-center gap-2'>
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
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className='w-10 py-2 pl-1  text-center text-sm font-semibold text-gray-700'>
                    {player.leaderboardPosition || '-'}
                  </td>
                  <td className='w-12 py-2 text-center text-sm font-bold border-r border-gray-200'>
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
                  {/* <td className='w-10 py-2 text-center text-sm font-medium text-gray-800'>
                    {getCurrentRound?.(player)?.data
                      ? calculateScoreToPar(getCurrentRound(player)!.data)
                      : '-'}
                  </td> */}
                  <td className='w-12 py-2 pr-1 text-center text-sm text-gray-800'>
                    {(() => {
                      const round = getCurrentRound?.(player);
                      if (!round?.data.holes?.scores) return 0;
                      return (
                        round.data.holes.scores.filter(
                          (score) => score !== null
                        ).length || '-'
                      );
                    })()}
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
