import React from 'react';

import { PageHeader } from '../components/util/PageHeader';
import { ContestList } from '../components/contest/ContestList';
import { CreateContestForm } from '../components/contest/CreateContestForm';

export const Contests: React.FC = () => {
  return (
    <div className='space-y-4 p-4'>
      <PageHeader title='Contests' className='mb-3' />
      <ContestList />

      <div className='bg-white rounded-lg shadow p-4'>
        <CreateContestForm />
      </div>
    </div>
  );
};
