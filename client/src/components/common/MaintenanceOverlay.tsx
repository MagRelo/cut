import React from 'react';

export const MaintenanceOverlay: React.FC = () => {
  return (
    <div className='fixed inset-0 bg-gray-900 bg-opacity-90 z-[9999] flex items-center justify-center'>
      <div className='text-center p-8 max-w-lg'>
        <h1 className='text-4xl font-bold text-white mb-6'>Site Maintenance</h1>
        <p className='text-xl text-gray-200 mb-4'>No Live Data! 😢</p>
        <p className='text-gray-300'>
          PGA is still busting my chops but I have a new plan – <br />
          check back on Saturday...
        </p>
      </div>
    </div>
  );
};
