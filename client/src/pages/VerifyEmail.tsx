import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function VerifyEmail() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { verifyEmail, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setError('Invalid verification link');
        setLoading(false);
        return;
      }

      try {
        await verifyEmail(token);
        navigate('/');
      } catch {
        setError('Failed to verify email. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token, verifyEmail, navigate]);

  const handleResendVerification = async () => {
    try {
      await resendVerificationEmail();
      setError('');
    } catch {
      setError('Failed to resend verification email. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-md w-full space-y-8'>
          <div className='flex justify-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900'></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8'>
        <div>
          <h2 className='mt-6 text-center text-3xl font-extrabold text-gray-900'>
            Email Verification
          </h2>
        </div>
        {error && (
          <div className='rounded-md bg-red-50 p-4'>
            <div className='text-sm text-red-700'>{error}</div>
          </div>
        )}
        <div className='text-center'>
          <p className='text-sm text-gray-600'>
            Didn't receive the verification email?{' '}
            <button
              onClick={handleResendVerification}
              className='font-medium text-indigo-600 hover:text-indigo-500'>
              Resend verification email
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
