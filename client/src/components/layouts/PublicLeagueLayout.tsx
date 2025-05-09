import React from 'react';
import { Outlet } from 'react-router-dom';
import { TournamentInfoCard } from '../common/TournamentInfoCard';

export const PublicLeagueLayout: React.FC = () => {
  return (
    <div className='container mx-auto md:py-8'>
      <div className='max-w-2xl mx-auto'>
        <div className='md:mb-6'>
          <TournamentInfoCard />
        </div>
        <Outlet />
      </div>
    </div>
  );
};
