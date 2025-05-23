import React, { useState } from 'react';
import { PlayerScorecard } from './PlayerScorecard';
import type { TeamPlayer } from '../../types/team';

interface PlayerTableProps {
  players: TeamPlayer[];
  roundDisplay: string;
}

export const PlayerTable: React.FC<PlayerTableProps> = ({
  players,
  roundDisplay,
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

  // Get round data for a player
  const getRoundData = (player: TeamPlayer) => {
    const roundNumber = parseInt(roundDisplay.replace('R', ''));
    const roundKey = `r${roundNumber}` as keyof Pick<
      TeamPlayer,
      'r1' | 'r2' | 'r3' | 'r4'
    >;
    return player[roundKey];
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
              className='w-12 py-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wider border-b-2  border-gray-200'>
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
            .map((player) => {
              const roundData = getRoundData(player);
              return (
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
                            <span>
                              {player.player.pga_displayName || ''}
                              {roundData?.icon && (
                                <span className='text-lg pl-2'>
                                  {roundData.icon}
                                </span>
                              )}
                            </span>
                            <svg
                              className={`w-4 h-4 text-gray-400 transform transition-transform duration-200 ${
                                expandedPlayers.has(player.id)
                                  ? 'rotate-180'
                                  : ''
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

                    {/* POSITION */}
                    <td className='w-10 py-2 pl-1  text-center text-sm font-semibold text-gray-600'>
                      {player.leaderboardPosition || '-'}
                    </td>

                    {/* TOTAL */}
                    <td className='w-12 py-2 text-center text-sm font-bold '>
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

                    {/* THRU */}
                    <td className='w-12 py-2 pr-1 text-center text-sm text-gray-700'>
                      {roundData?.holes?.scores
                        ? roundData.holes.scores.filter(
                            (score) => score !== null
                          ).length || '-'
                        : '-'}
                    </td>
                  </tr>
                  {expandedPlayers.has(player.id) && (
                    <tr>
                      <td colSpan={4} className='p-0'>
                        <div className=''>
                          <div className='w-full overflow-x-auto shadow-sm'>
                            <PlayerScorecard
                              player={player}
                              className='rounded-none shadow-none'
                              roundDisplay={roundDisplay}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
        </tbody>
      </table>
    </div>
  );
};
