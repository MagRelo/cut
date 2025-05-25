import React from 'react';
import { Link } from 'react-router-dom';
// import InfoScorecard from '../components/common/InfoScorecard';

export const Home: React.FC = () => {
  // const { openInstructions } = useAuth();

  return (
    <div className='flex-1 w-full flex flex-col items-center  bg-gray-50 pt-16 md:py-12 pb-20'>
      <img
        src='/cut-logo2.jpeg'
        alt='Cut Logo'
        className='w-48 h-48 mb-6 rounded-full border-2 border-gray-400 shadow-[0_4px_5px_rgba(0,0,0,0.2)]'
      />
      <h1 className='text-6xl font-bold text-black mb-4'>the Cut</h1>

      <h4 className='text-2xl font-bold text-gray-800 mb-3'>
        keep the group chat alive
      </h4>
      <h4 className='text-2xl font-bold text-emerald-600 mb-2'>
        (fantasy golf)
      </h4>

      <hr className='w-full border-gray-200 my-8' />
      {/* Instructions */}

      {/* How to play */}
      <div>
        <h3 className='text-4xl font-bold text-gray-400 mb-6'>how to play</h3>
      </div>

      <div className='flex flex-col items-center text-center gap-8 mt-4'>
        <div>
          <h3 className='text-2xl font-bold text-gray-800 mb-2'>
            weekly tournament
          </h3>
          <p className='text-gray-700 max-w-xs'>
            Every week is a new competition. Play every week or skip a week - no
            big deal.
          </p>
        </div>
        <div>
          <h3 className='text-2xl font-bold text-gray-800 mb-2'>
            set your lineup
          </h3>
          <p className='text-gray-700 max-w-xs'>
            Select any four players from the tournament field each week. Join a
            league to compete with your friends.
          </p>
        </div>
        <div>
          <h3 className='text-2xl font-bold text-gray-800 mb-2'>
            throw it in the group chat
          </h3>
          <p className='text-gray-700 max-w-xs'>
            It's a good excuse to stay in touch and talk about golf - each and
            every week.
          </p>
        </div>
      </div>

      <hr className='w-full border-gray-200 my-8' />

      {/* How to play */}
      <div>
        <h3 className='text-4xl font-bold text-gray-400 mb-8'>get started</h3>
      </div>

      {/* CTA buttons */}
      <div className='flex flex-row flex-wrap gap-4 justify-center'>
        <Link
          to='/public/team'
          className='inline-flex items-center px-4 py-2 text-base font-medium text-white shadow-md transition bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2'>
          My Team
        </Link>

        <Link
          to='public/leagues'
          className='inline-flex items-center px-4 py-2 text-base font-medium text-white shadow-md transition bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2'>
          Leagues
        </Link>
      </div>
      {/* 
      <div className='mt-8'>
        <InfoScorecard />
      </div> */}

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
