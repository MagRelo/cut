import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const Navigation: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <footer className='bg-white border-t border-gray-200 w-full'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between h-16 items-center'>
          <div className='flex items-center gap-4'>
            <Link to='/' className='flex items-center gap-2'>
              <img
                src='/cut-logo2.png'
                alt='logo'
                className='w-10 h-10 rounded-full border border-gray-400'
              />
              <span className='text-2xl font-semibold text-black font-display'>
                the Cut
              </span>
            </Link>
          </div>
          <div className='flex items-center gap-4'>
            {user && isAdmin() && (
              <Link
                to='/admin'
                className={`text-lg font-medium ${
                  isActive('/admin')
                    ? 'text-emerald-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
                Admin
              </Link>
            )}
            {!user?.isAnonymous && (
              <Link
                to='/settings'
                className={`p-2 rounded-full hover:bg-gray-100 ${
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
