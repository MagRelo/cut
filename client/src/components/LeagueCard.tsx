import React from 'react';
import { Link } from 'react-router-dom';
import { type League } from '../types/league';

interface LeagueCardProps {
  league: League;
}

export const LeagueCard: React.FC<LeagueCardProps> = ({ league }) => (
  <div className='group'>
    <Link
      to={`/public/league/${league.id}`}
      className='block bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 p-4 rounded-lg transition-all duration-200 hover:shadow-sm'>
      <div className='flex justify-between items-center'>
        <div>
          <h3 className='text-lg font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors'>
            {league.name}
          </h3>
          {league.description && (
            <p className='text-gray-600 mt-1 text-sm'>{league.description}</p>
          )}
        </div>
        <div className='text-gray-400 group-hover:text-emerald-500 transition-colors'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-5 w-5'
            viewBox='0 0 20 20'
            fill='currentColor'>
            <path
              fillRule='evenodd'
              d='M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z'
              clipRule='evenodd'
            />
          </svg>
        </div>
      </div>
    </Link>
  </div>
);
