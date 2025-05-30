import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRegisterForm } from '../../components/UserRegisterForm';
import { UserSettings } from './UserSettings';
import { PageHeader } from '../../components/common/PageHeader';

export function UserPage() {
  const { user } = useAuth();
  return (
    <div className='p-4'>
      <PageHeader title='User Profile' />
      <div className='mt-4'>
        {user?.isAnonymous ? <UserRegisterForm /> : <UserSettings />}
      </div>
    </div>
  );
}
