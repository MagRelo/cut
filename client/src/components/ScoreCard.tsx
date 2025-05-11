import React from 'react';

interface Player {
  name: string;
  score: number;
}

interface ScoreCardProps {
  player1: Player;
  player2: Player;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({ player1, player2 }) => {
  return (
    <div className='bg-white rounded shadow-sm mb-2 overflow-hidden'>
      <div
        className={`grid grid-cols-2 ${
          player1.score > 0 ? 'bg-green-50' : ''
        }`}>
        <div className='p-3 font-semibold'>{player1.name}</div>
        <div className='p-3 text-right'>{player1.score}</div>
      </div>
      <div
        className={`grid grid-cols-2 border-t ${
          player2.score > 0 ? 'bg-green-50' : ''
        }`}>
        <div className='p-3 font-semibold'>{player2.name}</div>
        <div className='p-3 text-right'>{player2.score}</div>
      </div>
    </div>
  );
};
