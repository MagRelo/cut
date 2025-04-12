import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Home: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className='min-h-[60vh] md:min-h-screen flex flex-col items-center justify-center bg-gray-50 pt-16 md:py-12'>
      <img
        src='/cut-logo.png'
        alt='Cut Logo'
        className='w-48 h-48 mb-6 border-2 border-amber-400 shadow-[0_2px_4px_rgba(0,0,0,0.1)]'
      />
      <h1 className='text-6xl font-bold text-emerald-600 mb-8'>the Cut</h1>
      <p className='text-xl text-gray-600 mb-8'>
        The Ultimate Golf Tournament Pool
      </p>
      <div className='space-x-4'>
        {user ? (
          <Link
            to='/leagues'
            className='inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500'>
            View Leagues
          </Link>
        ) : (
          <>
            <Link
              to='/login'
              className='inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500'>
              Login
            </Link>
            <Link
              to='/register'
              className='inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500'>
              Register
            </Link>
          </>
        )}
      </div>
    </div>
  );
};
