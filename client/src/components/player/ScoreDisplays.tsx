import React from 'react';

interface StablefordDisplayProps {
  points: number;
}

export const StablefordDisplay: React.FC<StablefordDisplayProps> = ({
  points,
}) => {
  let pointsClass = 'text-gray-600';
  if (points > 0) pointsClass = 'text-emerald-600 font-semibold';
  else if (points < 0) pointsClass = 'text-red-600 font-semibold';

  return (
    <td
      className={`px-2 py-2 text-center text-xs ${pointsClass} min-w-[2.25rem] w-[2.25rem] border-t border-b border-gray-300`}>
      {points}
    </td>
  );
};

interface ScoreDisplayProps {
  score: number;
  par: number;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, par }) => {
  const scoreDiff = score - par;
  let content: React.ReactNode = score;

  if (scoreDiff < -1) {
    content = (
      <span className='inline-flex items-center justify-center w-6 h-6 border-2 border-emerald-500 rounded-full bg-emerald-100'>
        {score}
      </span>
    );
  } else if (scoreDiff === -1) {
    content = (
      <span className='inline-flex items-center justify-center w-6 h-6 border-2 border-emerald-500 rounded-full'>
        {score}
      </span>
    );
  } else if (scoreDiff === 1) {
    content = (
      <span className='inline-flex items-center justify-center w-6 h-6 border-2 border-red-400'>
        {score}
      </span>
    );
  } else if (scoreDiff > 1) {
    content = (
      <span className='inline-flex items-center justify-center w-6 h-6 border-2 border-red-400 bg-red-100'>
        {score}
      </span>
    );
  }

  return (
    <td className='px-2 py-2 text-center text-xs text-gray-600 min-w-[2.25rem] w-[2.25rem] border-t border-b border-gray-300'>
      {content}
    </td>
  );
};
