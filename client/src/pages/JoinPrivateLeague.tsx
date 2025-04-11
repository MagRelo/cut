import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export function JoinPrivateLeague() {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const membership = await api.joinLeagueWithInviteCode(inviteCode);
      navigate(`/league-lobby/${membership.leagueId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join league');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8'>
        <div>
          <h2 className='mt-6 text-center text-3xl font-extrabold text-gray-900'>
            Join Private League
          </h2>
          <p className='mt-2 text-center text-sm text-gray-600'>
            Enter the invite code to join the league
          </p>
        </div>
        <form className='mt-8 space-y-6' onSubmit={handleSubmit}>
          {error && (
            <div className='rounded-md bg-red-50 p-4'>
              <div className='text-sm text-red-700'>{error}</div>
            </div>
          )}
          <div className='rounded-md shadow-sm -space-y-px'>
            <div>
              <label htmlFor='invite-code' className='sr-only'>
                Invite Code
              </label>
              <input
                id='invite-code'
                name='inviteCode'
                type='text'
                required
                className='appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm'
                placeholder='Enter invite code'
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type='submit'
              disabled={isSubmitting}
              className='group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-emerald-400'>
              {isSubmitting ? 'Joining...' : 'Join League'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
