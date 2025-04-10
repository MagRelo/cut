import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Navigation: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className='bg-white shadow-sm border-b border-gray-200'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between h-16'>
          <div className='flex'>
            <div className='flex-shrink-0 flex items-center'>
              <Link to='/' className='text-xl font-bold text-emerald-600'>
                Bet the Cut
              </Link>
            </div>
            {user && (
              <div className='hidden sm:ml-6 sm:flex sm:space-x-8'>
                <Link
                  to='/leagues'
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/leagues')
                      ? 'border-emerald-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}>
                  Leagues
                </Link>
              </div>
            )}
          </div>
          <div className='flex items-center'>
            {user ? (
              <Link
                to='/settings'
                className={`ml-4 p-2 rounded-full hover:bg-gray-100 ${
                  isActive('/settings') ? 'bg-gray-100' : ''
                }`}>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='h-6 w-6 text-gray-600'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                  />
                </svg>
              </Link>
            ) : (
              <div className='space-x-4'>
                <Link
                  to='/login'
                  className='px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700'>
                  Login
                </Link>
                <Link
                  to='/register'
                  className='px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700'>
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
