import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function Register() {
  const [contact, setContact] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const { requestVerification, verifyAndRegister, getCurrentUser } = useAuth();
  const navigate = useNavigate();

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await requestVerification(contact);
      setCodeSent(true);
    } catch {
      setError('Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const currentUser = getCurrentUser();
      const anonymousGuid = currentUser.isAnonymous
        ? currentUser.guid
        : undefined;
      await verifyAndRegister(contact, code, name, anonymousGuid);
      navigate('/public/leagues', { replace: true });
    } catch {
      setError('Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-[60vh] md:min-h-screen flex items-center justify-center bg-gray-50 pt-16 md:py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8'>
        <div>
          <h2 className='mt-6 text-center text-3xl font-extrabold text-gray-900'>
            Create your account
          </h2>
        </div>
        {!codeSent ? (
          <form className='mt-8 space-y-6' onSubmit={handleRequestCode}>
            {error && (
              <div className='rounded-md bg-red-50 p-4'>
                <div className='text-sm text-red-700'>{error}</div>
              </div>
            )}
            <div className='rounded-md shadow-sm -space-y-px'>
              <div>
                <label htmlFor='name' className='sr-only'>
                  Full Name
                </label>
                <input
                  id='name'
                  name='name'
                  type='text'
                  required
                  className='appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm'
                  placeholder='Full Name'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor='contact' className='sr-only'>
                  Email or Phone
                </label>
                <input
                  id='contact'
                  name='contact'
                  type='text'
                  autoComplete='email'
                  required
                  className='appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm'
                  placeholder='Email or Phone Number'
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type='submit'
                disabled={loading}
                className='group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50'>
                {loading ? 'Sending Code...' : 'Send Verification Code'}
              </button>
            </div>
          </form>
        ) : (
          <form className='mt-8 space-y-6' onSubmit={handleVerify}>
            {error && (
              <div className='rounded-md bg-red-50 p-4'>
                <div className='text-sm text-red-700'>{error}</div>
              </div>
            )}
            <div className='rounded-md shadow-sm -space-y-px'>
              <div>
                <label htmlFor='code' className='sr-only'>
                  Verification Code
                </label>
                <input
                  id='code'
                  name='code'
                  type='text'
                  required
                  className='appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm'
                  placeholder='Enter 6-digit code'
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                />
              </div>
            </div>

            <div>
              <button
                type='submit'
                disabled={loading}
                className='group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50'>
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>

            <div className='text-center'>
              <button
                type='button'
                onClick={() => setCodeSent(false)}
                className='text-sm text-emerald-600 hover:text-emerald-500'>
                Use different email/phone
              </button>
            </div>
          </form>
        )}

        <div className='text-center'>
          <p className='text-sm text-gray-600'>
            Already have an account?{' '}
            <Link
              to='/login'
              className='font-medium text-emerald-600 hover:text-emerald-500'>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
