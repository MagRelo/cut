import React from 'react';
import type { Team } from '../../types/team';
import { PlayerTable } from '../player/PlayerTable';

interface TeamCardProps {
  team: Team;
  roundDisplay?: string;
}

interface LabelProps {
  children: React.ReactNode;
  className?: string;
}

interface RoundIconProps {
  currentRound: { round: string; data: { icon?: string } } | null;
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

const Label: React.FC<LabelProps> = ({ children, className = '' }) => (
  <span className={`text-sm font-medium text-gray-400 pr-1 ${className}`}>
    {children}
  </span>
);

export const TeamCard: React.FC<TeamCardProps> = ({ team, roundDisplay }) => {
  const [expanded, setExpanded] = React.useState(false);

  // Calculate team total
  const teamTotal = team.players.reduce(
    (sum, player) =>
      sum + (player.total || 0) + (player.cut || 0) + (player.bonus || 0),
    0
  );

  // Get current round data for each player
  const getCurrentRound = (player: Team['players'][0]) => {
    if (roundDisplay !== undefined) {
      const roundNumber = roundDisplay.replace('R', '');
      const roundData = player[`r${roundNumber}` as keyof typeof player];
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

  // Calculate team's average ratio for the current round
  const getTeamRatio = () => {
    const ratios = team.players.map((player) => {
      // if the player postition is "CUT" or "DQ" or then return 1
      if (
        player.leaderboardPosition === 'CUT' ||
        player.leaderboardPosition === 'DQ'
      ) {
        return 1;
      }

      const round = getCurrentRound(player);
      return round?.data.ratio || 0;
    });

    if (ratios.length === 0) return 0;
    return ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
  };

  return (
    <div>
      <div
        onClick={() => setExpanded((prev) => !prev)}
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
                style={{ backgroundColor: team.color }}
                aria-label='Team color'
              />
              <span className='text-xl font-bold text-gray-900'>
                {team.name}
              </span>
            </div>
            <div className='flex items-center'>
              <span className='text-xl text-gray-600 font-bold'>
                {teamTotal}
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
                  <Label className='ml-1'>TEAM</Label>
                </div>
              </div>
            </div>

            {/* Player Round Icons */}
            <div className='flex items-center space-x-2 h-8'>
              {[...Array(4)].map((_, index) => {
                const player = team.players.sort((a, b) => {
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
                })[index];

                if (!player) {
                  return <div key={index} className='flex-shrink-0 w-5 h-8' />;
                }

                const currentRound = getCurrentRound(player);
                return (
                  <RoundIcon
                    key={index}
                    currentRound={currentRound}
                    leaderboardPosition={player.leaderboardPosition}
                  />
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className='flex-1 min-w-0 text-center flex items-center h-8'>
              <div className='flex items-center w-full'>
                <Label className='text-sm text-gray-400 mr-1 -mt-px'>
                  {roundDisplay}
                </Label>
                <div className='w-full h-2 bg-gray-200 rounded-full relative'>
                  <div
                    className='h-2 bg-emerald-600/70 rounded-full transition-all duration-300'
                    style={{
                      width: `${Math.round(getTeamRatio() * 100)}%`,
                    }}
                    aria-label='Team round completion'
                  />
                  <span className='sr-only'>
                    {Math.round(getTeamRatio() * 100)}% complete
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Expanded Player Table */}
      {expanded && (
        <div className='width-full border border-gray-200 bg-white rounded-b-lg'>
          <PlayerTable
            players={team.players}
            roundDisplay={roundDisplay || ''}
          />
        </div>
      )}
    </div>
  );
};
