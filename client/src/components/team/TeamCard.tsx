import React from 'react';
import type {
  PlayerWithTournamentData,
  RoundData,
  TournamentLineup,
  TournamentPlayerData,
} from '../../types.new/player';
import { PlayerTable } from '../player/PlayerTable';

interface RoundIconProps {
  currentRound: { round: string; data: RoundData } | null;
  leaderboardPosition?: string;
}
const RoundIcon: React.FC<RoundIconProps> = ({
  currentRound,
  leaderboardPosition,
}) => {
  if (leaderboardPosition === 'CUT') {
    return (
      <div className='flex-shrink-0 flex items-center h-8'>
        <svg
          className='w-5 h-5 text-gray-400'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'>
          <line x1='18' y1='6' x2='6' y2='18' />
          <line x1='6' y1='6' x2='18' y2='18' />
        </svg>
      </div>
    );
  }

  return (
    <div className='flex-shrink-0 flex items-center h-8'>
      {currentRound?.data.icon ? (
        <span className='text-xl text-gray-600 font-bold'>
          {currentRound.data.icon}
        </span>
      ) : (
        <span className='text-xl text-gray-400'>⚪</span>
      )}
    </div>
  );
};

interface LabelProps {
  children: React.ReactNode;
  className?: string;
}
const Label: React.FC<LabelProps> = ({ children, className = '' }) => (
  <span className={`text-sm font-medium text-gray-400 pr-1 ${className}`}>
    {children}
  </span>
);

interface LineupCardProps {
  lineup: TournamentLineup;
  roundDisplay?: string;
  tournamentStatus?: string;
}
export const LineupCard: React.FC<LineupCardProps> = ({
  lineup,
  roundDisplay,
  tournamentStatus,
}) => {
  const [expanded, setExpanded] = React.useState(false);

  // disable the lineup card expanded button if the tournament is not active
  const isTournamentActive = tournamentStatus !== 'NOT_STARTED';

  // Calculate lineup total
  const lineupTotal = lineup.players.reduce(
    (sum, player) =>
      sum +
      (player.tournamentData.total || 0) +
      (player.tournamentData.cut || 0) +
      (player.tournamentData.bonus || 0),
    0
  );

  // Get current round data for each player
  const getCurrentRound = (player: PlayerWithTournamentData) => {
    if (roundDisplay !== undefined) {
      const roundNumber = roundDisplay.replace('R', '');
      const roundData =
        player.tournamentData[`r${roundNumber}` as keyof TournamentPlayerData];
      if (
        roundData &&
        typeof roundData === 'object' &&
        'total' in roundData &&
        roundData.total !== undefined
      ) {
        return { round: `R${roundNumber}`, data: roundData };
      }
    }

    for (let round = 4; round >= 1; round--) {
      const roundData = player[`r${round}` as keyof typeof player];
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

  // Calculate lineup's average ratio for the current round
  const getLineupRatio = () => {
    const ratios = lineup.players.map((player) => {
      // if the player postition is "CUT" or "DQ" or then return 1
      if (
        player.tournamentData.leaderboardPosition === 'CUT' ||
        player.tournamentData.leaderboardPosition === 'DQ'
      ) {
        return 1;
      }

      const round = getCurrentRound(player);
      // Only access ratio if data is RoundData
      return round?.data && 'ratio' in round.data ? round.data.ratio || 0 : 0;
    });

    if (ratios.length === 0) return 0;
    return ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
  };

  return (
    <div>
      <div
        onClick={() => isTournamentActive && setExpanded((prev) => !prev)}
        className='bg-white shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer'
        role='button'
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setExpanded((prev) => !prev);
          }
        }}
        aria-label={expanded ? 'Hide players' : 'Show players'}>
        {/* Top Row */}
        <div className='px-4 py-3 pb-2 border-b border-gray-200'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center'>
              <span
                className='inline-block w-4 h-4 rounded-full mr-2'
                // style={{ backgroundColor: user.color }}
                style={{ backgroundColor: '#00FF00' }}
                aria-label='Lineup color'
              />
              <span className='text-xl font-bold text-gray-900'>
                {/* {user.name} */}
                [TODO: user.name & color]
              </span>
            </div>
            <div className='flex items-center'>
              <span className='text-xl text-gray-600 font-bold'>
                {lineupTotal}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className='p-1 bg-gray-50'>
          <div className='flex justify-between items-center gap-x-4 px-3'>
            {/* RND label with chevron */}
            <div className='flex items-center flex-shrink-0'>
              <div className='text-sm font-medium text-gray-500 min-w-[65px] flex items-center'>
                <div className='flex items-center w-full p-1 rounded'>
                  {isTournamentActive && (
                    <>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                          expanded ? 'rotate-180' : ''
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
                      <Label className='ml-1'>LINEUP</Label>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Player Round Icons */}
            <div className='flex items-center space-x-2 h-8'>
              {[...Array(4)].map((_, index) => {
                const player = lineup.players.sort((a, b) => {
                  // Handle cases where position might be "-" or undefined
                  const getPosition = (pos: string | undefined) => {
                    if (!pos || pos === '-') return Infinity;
                    if (pos === 'CUT') return Infinity;
                    // Remove "T" prefix if present and convert to number
                    return parseInt(pos.replace('T', ''));
                  };

                  // If both players are CUT, sort by total points
                  if (
                    a.tournamentData.leaderboardPosition === 'CUT' &&
                    b.tournamentData.leaderboardPosition === 'CUT'
                  ) {
                    return (
                      (b.tournamentData.total || 0) +
                      (b.tournamentData.cut || 0) +
                      (b.tournamentData.bonus || 0) -
                      ((a.tournamentData.total || 0) +
                        (a.tournamentData.cut || 0) +
                        (a.tournamentData.bonus || 0))
                    );
                  }

                  return (
                    getPosition(a.tournamentData.leaderboardPosition) -
                    getPosition(b.tournamentData.leaderboardPosition)
                  );
                })[index];

                if (!player) {
                  return <div key={index} className='flex-shrink-0 w-5 h-8' />;
                }

                const currentRound = getCurrentRound(player);
                return (
                  <RoundIcon
                    key={index}
                    currentRound={currentRound}
                    leaderboardPosition={
                      player.tournamentData.leaderboardPosition
                    }
                  />
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className='flex-1 min-w-0 text-center flex items-center h-8'>
              <div className='w-full h-2 bg-gray-200 rounded-full relative'>
                <div
                  className='h-2 bg-emerald-600/70 rounded-full transition-all duration-300'
                  style={{
                    width: `${Math.round(getLineupRatio() * 100)}%`,
                  }}
                  aria-label='Round completion'
                />
                <span className='sr-only'>
                  {Math.round(getLineupRatio() * 100)}% complete
                </span>
              </div>
            </div>
          </div>

          {/* Expanded Players Section */}
          {expanded && (
            <div className='mt-2' onClick={(e) => e.stopPropagation()}>
              <PlayerTable
                players={lineup.players}
                roundDisplay={roundDisplay || ''}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
