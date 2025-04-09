import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function UserSettings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  return (
    <div className='min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-3xl mx-auto'>
        <div className='bg-white shadow rounded-lg p-6'>
          <h1 className='text-2xl font-bold text-gray-900 mb-6'>
            User Settings
          </h1>

          <div className='space-y-6'>
            <div>
              <h2 className='text-lg font-medium text-gray-900'>
                Profile Information
              </h2>
              <div className='mt-4 space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Name
                  </label>
                  <div className='mt-1 text-gray-900'>{user.name}</div>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Email
                  </label>
                  <div className='mt-1 text-gray-900'>{user.email}</div>
                  {!user.emailVerified && (
                    <p className='mt-1 text-sm text-red-600'>
                      Email not verified
                    </p>
                  )}
                </div>

                {user.teamId && (
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>
                      Team ID
                    </label>
                    <div className='mt-1 text-gray-900'>{user.teamId}</div>
                  </div>
                )}
              </div>
            </div>

            <div className='pt-6'>
              <button
                onClick={handleLogout}
                className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
