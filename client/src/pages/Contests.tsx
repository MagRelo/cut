import React from 'react';

import { PageHeader } from '../components/util/PageHeader';

export const Contests: React.FC = () => {
  return (
    <div className='space-y-4 p-4'>
      <PageHeader title='Contests' className='mb-3' />
      <div className='bg-white rounded-lg shadow p-6'>
        <p className='text-gray-600'>Contest content will go here.</p>
      </div>
    </div>
  );
};
