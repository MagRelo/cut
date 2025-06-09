import React, { useState } from 'react';
import type {
  PlayerWithTournamentData,
  RoundData,
  TournamentPlayerData,
} from '../../types.new/player';
import { PlayerScorecard } from './PlayerScorecard';

interface PlayerCardsProps {
  player: PlayerWithTournamentData;
  roundDisplay: string;
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

export const PlayerCard: React.FC<PlayerCardsProps> = ({
  player,
  roundDisplay,
}) => {
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  const getCurrentRound = (player: PlayerWithTournamentData) => {
    if (!player?.tournamentData) return null;

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
    return null;
  };

  const calculateScoreToPar = (roundData: RoundData): string => {
    if (roundData.ratio === 0) return '-';

    const totalScore = roundData?.holes?.scores.reduce(
      (sum: number, score: number | null) => sum + (score || 0),
      0
    );

    const totalPar = roundData?.holes?.scores.reduce(
      (sum: number, score: number | null, index: number) =>
        score !== null ? sum + (roundData.holes?.par[index] || 0) : sum,
      0
    );

    const scoreToPar = totalScore && totalPar ? totalScore - totalPar : 0;

    if (scoreToPar === 0) return 'E';
    return scoreToPar > 0 ? `+${scoreToPar}` : `${scoreToPar}`;
  };

  const currentRound = getCurrentRound(player);

  return (
    <div
      onClick={() =>
        setExpandedPlayerId(expandedPlayerId === player.id ? null : player.id)
      }
      className='bg-white shadow-md overflow-hidden'
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
        expandedPlayerId === player.id ? 'Hide scorecard' : 'Show scorecard'
      }>
      {/* Top Row */}
      <div className='px-4 py-3 border-b border-gray-200'>
        <div className='flex items-center space-x-4'>
          {player.pga_imageUrl && (
            <div className='flex-shrink-0'>
              <img
                className='h-14 w-14 rounded-full object-cover ring-2 ring-white'
                src={player.pga_imageUrl}
                alt={player.pga_displayName || ''}
              />
            </div>
          )}
          <div className='flex-1 min-w-0'>
            <div className='flex items-center justify-between'>
              <div className='text-lg font-semibold text-gray-600 truncate'>
                {player.pga_displayName || ''}
                {/* optionally add the round icon of the current round */}
                {currentRound?.round && currentRound.data.icon !== '' && (
                  <span className='text-xl text-gray-600 font-bold ml-2'>
                    {currentRound.data.icon}
                  </span>
                )}
              </div>
              <div className='flex items-center'>
                <span className='text-xl text-gray-600 font-bold ml-1'>
                  {(player.tournamentData.total || 0) +
                    (player.tournamentData.cut || 0) +
                    (player.tournamentData.bonus || 0)}
                </span>
              </div>
            </div>

            {/* Position*/}
            <div className='flex items-center space-x-6 mt-1'>
              <div className='text-sm text-gray-500'>
                <Label>POS</Label>
                <span className='font-bold text-gray-600 ml-1'>
                  {player.tournamentData.leaderboardPosition || '–'}
                </span>
              </div>

              {/* Total */}
              <div className='text-sm text-gray-500 flex items-center'>
                <Label>TOT</Label>
                <span
                  className={`font-bold ml-1 ${
                    player.tournamentData.leaderboardTotal === 'E' ||
                    !player.tournamentData.leaderboardTotal?.startsWith('-')
                      ? 'text-gray-600'
                      : 'text-red-600'
                  }`}>
                  {player.tournamentData.leaderboardTotal || '–'}
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
              <span className='font-bold text-gray-600 ml-2'>
                {currentRound.data.holes?.scores
                  ? calculateScoreToPar(currentRound.data)
                  : '-'}
              </span>
            </div>

            {/* PTS */}
            <div className='text-sm text-gray-500 text-left whitespace-nowrap flex items-center'>
              <Label>PTS</Label>{' '}
              <span className='font-bold text-gray-600 ml-2'>
                {currentRound.data.total}
              </span>
            </div>

            {/* % */}
            <div className='text-sm text-gray-500 flex-1 min-w-0 text-center py-1 flex items-center'>
              <Label className='text-xs font-bold text-gray-400 mr-2 -mt-px'>
                %
              </Label>
              <div className='w-full h-2 bg-gray-200 rounded-full relative'>
                <div
                  className='h-2 bg-emerald-600/70 rounded-full transition-all duration-300'
                  style={{
                    width: `${
                      player.tournamentData.leaderboardPosition === 'CUT' ||
                      player.tournamentData.leaderboardPosition === 'DQ'
                        ? 100
                        : Math.round((currentRound.data.ratio || 0) * 100)
                    }%`,
                  }}
                  aria-label='Round completion'
                />
                <span className='sr-only'>
                  {player.tournamentData.leaderboardPosition === 'CUT' ||
                  player.tournamentData.leaderboardPosition === 'DQ'
                    ? 100
                    : Math.round((currentRound.data.ratio || 0) * 100)}
                  % complete
                </span>
              </div>
            </div>
          </div>

          {/* Expanded Scorecard Section */}
          {expandedPlayerId === player.id && (
            <div
              className='mt-2  shadow-sm'
              onClick={(e) => e.stopPropagation()}>
              <PlayerScorecard
                player={player}
                roundDisplay={currentRound.round}
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
