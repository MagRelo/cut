import React from 'react';
import { Link } from 'react-router-dom';
// import { useAuth } from '../contexts/AuthContext';

export const Home: React.FC = () => {
  // const { user } = useAuth();

  return (
    <div className='flex-1 w-full flex flex-col items-center justify-center bg-gray-50 pt-16 md:py-12'>
      <img
        src='/cut-logo2.jpeg'
        alt='Cut Logo'
        className='w-48 h-48 mb-6 border-2 border-black shadow-[0_2px_4px_rgba(0,0,0,0.1)]'
      />
      <h1 className='text-6xl font-bold text-black mb-8'>the Cut</h1>

      <div className='flex flex-col md:flex-row gap-4 mt-8'>
        <Link
          to='/public/team'
          className='inline-flex items-center px-4 py-2 rounded-lg text-base font-medium text-white shadow-md transition bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2'>
          My Team
        </Link>
        <Link
          to='/public/leagues'
          className='inline-flex items-center px-4 py-2 rounded-lg text-base font-medium text-white shadow-md transition bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2'>
          Leagues
        </Link>
      </div>

      {/* Keep this for later */}
      {/* 
      <div className='space-x-4'>
        {user ? (
          <Link
            to='/leagues'
            className='inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500'>
            View Leagues
          </Link>
        ) : (
          <div className='space-x-4 mb-8'>
            <Link
              to='/login'
              className='inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500'>
              Login
            </Link>
            <Link
              to='/register'
              className='inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500'>
              Register
            </Link>
          </div>
        )}
      </div> */}
    </div>
  );
};
