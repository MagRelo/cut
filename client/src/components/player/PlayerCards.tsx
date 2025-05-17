import React, { useState } from 'react';
import type { TeamPlayer } from '../../types/team';
import { PlayerScorecard } from './PlayerScorecard';

interface PlayerCardsProps {
  players: TeamPlayer[];
  roundDisplay?: string;
}

interface LabelProps {
  children: React.ReactNode;
  className?: string;
}

const Label: React.FC<LabelProps> = ({ children, className = '' }) => (
  <span className={`text-sm font-medium text-gray-400 pr-1 ${className}`}>
    {children}
  </span>
);

export const PlayerCards: React.FC<PlayerCardsProps> = ({
  players,
  roundDisplay,
}) => {
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  const getCurrentRound = (player: TeamPlayer) => {
    // If roundDisplay is specified, try to use that round
    if (roundDisplay !== undefined) {
      const roundNumber = roundDisplay.replace('R', '');
      const roundData = player[`r${roundNumber}` as keyof TeamPlayer];
      if (
        roundData &&
        typeof roundData === 'object' &&
        'total' in roundData &&
        roundData.total !== undefined
      ) {
        return { round: `R${roundNumber}`, data: roundData };
      }
    }

    // Fallback to finding the latest round with data
    for (let round = 4; round >= 1; round--) {
      const roundData = player[`r${round}` as keyof TeamPlayer];
      if (
        roundData &&
        typeof roundData === 'object' &&
        'total' in roundData &&
        roundData.total !== undefined
      ) {
        return { round: `R${round}`, data: roundData };
      }
    }
    return null;
  };

  return (
    <div className='grid grid-cols-1 gap-3'>
      {players
        .slice()
        .sort(
          (a, b) =>
            (b.total || 0) +
            (b.cut || 0) +
            (b.bonus || 0) -
            ((a.total || 0) + (a.cut || 0) + (a.bonus || 0))
        )
        .map((player) => {
          const currentRound = getCurrentRound(player);

          return (
            <div
              key={player.id}
              onClick={() =>
                setExpandedPlayerId(
                  expandedPlayerId === player.id ? null : player.id
                )
              }
              className='bg-white shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer'
              role='button'
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setExpandedPlayerId(
                    expandedPlayerId === player.id ? null : player.id
                  );
                }
              }}
              aria-label={
                expandedPlayerId === player.id
                  ? 'Hide scorecard'
                  : 'Show scorecard'
              }>
              {/* Top Row */}
              <div className='px-4 py-3 border-b border-gray-200'>
                <div className='flex items-center space-x-4'>
                  {player.player.pga_imageUrl && (
                    <div className='flex-shrink-0'>
                      <img
                        className='h-14 w-14 rounded-full object-cover ring-2 ring-white'
                        src={player.player.pga_imageUrl}
                        alt={player.player.pga_displayName || ''}
                      />
                    </div>
                  )}
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between'>
                      <div className='text-base font-bold text-gray-900 truncate'>
                        {player.player.pga_displayName || ''}
                        {/* optionally add the round icon of the current round */}
                        {currentRound?.round &&
                          currentRound.data.icon !== '' && (
                            <span className='text-xl text-gray-600 font-bold ml-2'>
                              {currentRound.data.icon}
                            </span>
                          )}
                      </div>
                      <div className='flex items-center'>
                        <span className='text-xl text-gray-600 font-bold ml-1'>
                          {player.total || '0'}
                        </span>
                      </div>
                    </div>

                    {/* Position*/}
                    <div className='flex items-center space-x-6 mt-1'>
                      <div className='text-sm text-gray-500'>
                        <Label>POS</Label>{' '}
                        <span className='font-medium text-gray-700 ml-1'>
                          {player.leaderboardPosition}
                        </span>
                      </div>

                      {/* Total */}
                      <div className='text-sm text-gray-500 flex items-center'>
                        <Label>TOTAL</Label>{' '}
                        <span
                          className={`font-medium ml-1 ${
                            player.leaderboardTotal === 'E' ||
                            !player.leaderboardTotal?.startsWith('-')
                              ? 'text-gray-700'
                              : 'text-red-600'
                          }`}>
                          {player.leaderboardTotal}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row */}
              {currentRound ? (
                <div className='p-1 bg-gray-50'>
                  <div className='flex items-center justify-between gap-x-4 px-3'>
                    {/* TEAM button */}
                    <div className='flex items-center text-sm text-gray-500 text-left whitespace-nowrap'>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 mr-1 ${
                          expandedPlayerId === player.id ? 'rotate-180' : ''
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
                      <Label>CARD</Label>
                    </div>

                    {/* RND */}
                    <div className='text-sm text-gray-500 text-left whitespace-nowrap flex items-center'>
                      <Label>{currentRound.round}</Label>{' '}
                      <span className='font-medium text-gray-700 ml-1'>
                        {currentRound.data.holes?.total}
                      </span>
                    </div>

                    {/* PTS */}
                    <div className='text-sm text-gray-500 text-left whitespace-nowrap flex items-center'>
                      <Label>PTS</Label>{' '}
                      <span className='font-medium text-gray-700 ml-1'>
                        {currentRound.data.total}
                      </span>
                    </div>

                    {/* % */}
                    <div className='text-sm text-gray-500 flex-1 min-w-0 text-center py-1 flex items-center'>
                      <Label className='text-xs text-gray-400 mr-2 -mt-px'>
                        %
                      </Label>
                      <div className='w-full h-2 bg-gray-200 rounded-full relative'>
                        <div
                          className='h-2 bg-emerald-600/70 rounded-full transition-all duration-300'
                          style={{
                            width: `${Math.round(
                              (currentRound.data.ratio || 0) * 100
                            )}%`,
                          }}
                          aria-label='Round completion'
                        />
                        <span className='sr-only'>
                          {Math.round((currentRound.data.ratio || 0) * 100)}%
                          complete
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Scorecard Section */}
                  {expandedPlayerId === player.id && (
                    <div className='mt-2 border-t border-gray-200'>
                      <PlayerScorecard
                        player={player}
                        currentRound={
                          currentRound?.round
                            ? parseInt(currentRound.round.slice(1))
                            : 1
                        }
                      />
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
    </div>
  );
};
