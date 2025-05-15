import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HelpButton } from './HelpButton';

export const Navigation: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <footer className='bg-white shadow-[0_-1px_2px_rgba(0,0,0,0.1)] border-t border-gray-200 mt-auto'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between h-16'>
          <div className='flex'>
            <div className='flex-shrink-0 flex items-center gap-4'>
              <Link
                to={user ? '/leagues' : '/'}
                className='text-xl font-bold text-black'>
                the Cut
              </Link>
              <HelpButton />
            </div>
            {user && (
              <div className='flex ml-4 sm:ml-6 space-x-4 sm:space-x-8 items-center'>
                <Link
                  to='/leagues'
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    isActive('/leagues')
                      ? 'text-emerald-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  Leagues
                </Link>
                {isAdmin() && (
                  <Link
                    to='/admin'
                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                      isActive('/admin')
                        ? 'text-emerald-500'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    Admin
                  </Link>
                )}
              </div>
            )}
          </div>
          <div className='flex items-center'>
            {user && (
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
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
