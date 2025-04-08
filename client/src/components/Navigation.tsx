import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className='bg-white shadow-sm'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between h-16'>
          <div className='flex'>
            <div className='flex-shrink-0 flex items-center'>
              <Link to='/' className='text-xl font-bold text-blue-600'>
                Bet the Cut
              </Link>
            </div>
            {user && (
              <div className='hidden sm:ml-6 sm:flex sm:space-x-8'>
                <Link
                  to='/order'
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/order')
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}>
                  Place Order
                </Link>
                <Link
                  to='/leagues'
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/leagues')
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}>
                  Leagues
                </Link>
              </div>
            )}
          </div>
          <div className='flex items-center'>
            {user ? (
              <button
                onClick={logout}
                className='ml-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700'>
                Logout
              </button>
            ) : (
              <div className='space-x-4'>
                <Link
                  to='/login'
                  className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'>
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
