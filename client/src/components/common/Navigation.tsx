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
              <span className='text-2xl font-semibold text-gray-700 font-display'>
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
          </div>
        </div>
      </div>
    </footer>
  );
};
