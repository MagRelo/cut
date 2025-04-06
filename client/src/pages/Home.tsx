import React from 'react';
import { Link } from 'react-router-dom';

export const Home: React.FC = () => {
  return (
    <div className='min-h-screen flex flex-col items-center justify-center bg-gray-50'>
      <h1 className='text-6xl font-bold text-indigo-600 mb-8'>Bet the Cut</h1>
      <p className='text-xl text-gray-600 mb-8'>
        The Ultimate Golf Tournament Pool
      </p>
      <div className='space-x-4'>
        <Link
          to='/login'
          className='inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'>
          Login
        </Link>
        <Link
          to='/register'
          className='inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'>
          Register
        </Link>
      </div>
    </div>
  );
};
