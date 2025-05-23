import React from 'react';
import { Link } from 'react-router-dom';
// import { useAuth } from '../contexts/AuthContext';

export const Home: React.FC = () => {
  // const { openInstructions } = useAuth();

  return (
    <div className='flex-1 w-full flex flex-col items-center justify-center bg-gray-50 pt-16 md:py-12'>
      <img
        src='/cut-logo2.jpeg'
        alt='Cut Logo'
        className='w-48 h-48 mb-6 rounded-full border-2 border-gray-400 shadow-[0_4px_5px_rgba(0,0,0,0.2)]'
      />
      <h1 className='text-6xl font-bold text-black mb-8'>the Cut</h1>

      <p className='inline-flex items-center justify-center mb-2 mx-10 text-center text-lg font-medium'>
        Free Weekly Fantasy Golf
      </p>

      {/* Instructions button "how to play" */}
      {/* <button
        onClick={() => {
          openInstructions();
        }}
        className='inline-flex items-center px-1 pt-1 text-lg font-lg text-gray-500 hover:text-gray-700'>
        What is the Cut?
      </button> */}

      <hr className='w-full border-gray-200 my-4' />

      <div className='flex flex-col md:flex-row gap-4 mt-4'>
        <Link
          to='/public/team'
          className='inline-flex items-center px-4 py-2 text-base font-medium text-white shadow-md transition bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2'>
          My Team
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
