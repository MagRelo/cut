import React from 'react';
import type { TeamPlayer } from '../../types/team';

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
        .sort((a, b) => (b.total || 0) - (a.total || 0))
        .map((player) => {
          const currentRound = getCurrentRound(player);

          return (
            <div
              key={player.id}
              className='bg-white shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200'>
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
                        {/* optionally add the round icon of the current round */}
                        {currentRound?.round &&
                          currentRound.data.icon !== '' && (
                            <span className='text-xl text-gray-600 font-bold ml-1'>
                              {currentRound.data.icon}
                            </span>
                          )}
                        {player.player.pga_displayName || ''}
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
                <div className='p-1 pt-2 bg-gray-50'>
                  <div className='flex justify-between items-stretch gap-x-4 px-3'>
                    {/* RND label*/}
                    <div className='flex items-center flex-shrink-0 border-r border-gray-400 h-full'>
                      <div className='text-sm font-medium text-gray-500 min-w-[65px]'>
                        <Label>Round {currentRound.round.slice(1)}</Label>
                      </div>
                    </div>

                    {/* RND */}
                    <div className='text-sm text-gray-500 text-left whitespace-nowrap'>
                      <Label>{currentRound.round}</Label>{' '}
                      <span className='font-medium text-gray-700 ml-1'>
                        {currentRound.data.holes?.total}
                      </span>
                    </div>

                    {/* PTS */}
                    <div className='text-sm text-gray-500 text-left whitespace-nowrap'>
                      <Label>PTS</Label>{' '}
                      <span className='font-medium text-gray-700 ml-1'>
                        {currentRound.data.total}
                      </span>
                    </div>

                    {/* % */}
                    <div className='text-sm text-gray-500 flex-1 min-w-0 text-center py-1'>
                      <div className='flex items-center w-full'>
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
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
    </div>
  );
};
