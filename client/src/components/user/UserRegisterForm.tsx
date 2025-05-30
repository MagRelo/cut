import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import {
  contactVerificationSchema,
  ContactVerificationFormData,
} from '../../validations/notificationSignup';
import { useAuth } from '../../contexts/AuthContext';
import { isApiError } from '../../utils/apiError';

export const UserRegisterForm = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [contact, setContact] = useState('');
  const { requestVerification, verifyAndRegister, getCurrentUser } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactVerificationFormData>({
    resolver: zodResolver(contactVerificationSchema),
  });

  const handleChangeContact = () => {
    setIsVerifying(false);
    setError(null);
    setSuccess(null);
    reset({ contact: '' });
  };

  const onSubmit = async (data: ContactVerificationFormData) => {
    try {
      setError(null);
      setSuccess(null);

      if (!data.termsAccepted) {
        setError('You must accept the terms and conditions');
        return;
      }

      if (!isVerifying) {
        // Request verification code
        await requestVerification(data.contact);
        setIsVerifying(true);
        setContact(data.contact);
        setSuccess('Verification code sent! Please check your email or phone.');
      } else {
        // Verify code and register
        if (!data.verificationCode) {
          setError('Verification code is required');
          return;
        }
        const currentUser = getCurrentUser();
        const anonymousGuid = currentUser.isAnonymous
          ? currentUser.guid
          : undefined;
        await verifyAndRegister(
          contact,
          data.verificationCode,
          'User',
          anonymousGuid
        );
        setSuccess('Successfully registered!');
        setIsVerifying(false);
      }
    } catch (err) {
      if (isApiError(err)) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div className='max-w-md mx-auto p-6 bg-white rounded-lg shadow-md'>
      <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
        {/* title */}
        <h2 className='text-xl font-medium text-gray-900 mb-2'>
          Register or Sign In
        </h2>
        <p className=' text-gray-800'>We will send you a 6-digit code.</p>

        <div>
          <label
            htmlFor='contact'
            className='block text-sm font-medium text-gray-700 mb-1'>
            Email or Phone Number
          </label>
          <input
            {...register('contact')}
            type='text'
            id='contact'
            disabled={isVerifying}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              isVerifying ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            placeholder='Enter your email or phone number'
          />
          {errors.contact && (
            <p className='mt-1 text-sm text-red-600'>
              {errors.contact.message}
            </p>
          )}
        </div>

        <div className='flex items-start'>
          <div className='flex items-center h-5'>
            <input
              {...register('termsAccepted')}
              type='checkbox'
              id='termsAccepted'
              disabled={isVerifying}
              className={`w-4 h-4 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 ${
                isVerifying ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            />
          </div>
          <div className='ml-3 text-sm'>
            <label
              htmlFor='termsAccepted'
              className={`font-medium text-gray-700 ${
                isVerifying ? 'text-gray-500' : ''
              }`}>
              I accept the{' '}
              <Link
                to='/terms'
                className='text-emerald-600 hover:text-emerald-500'>
                terms and conditions
              </Link>
            </label>
            {errors.termsAccepted && (
              <p className='mt-1 text-sm text-red-600'>
                {errors.termsAccepted.message}
              </p>
            )}
          </div>
        </div>

        {isVerifying && (
          <div className='mt-4'>
            <label
              htmlFor='verificationCode'
              className='block text-sm font-medium text-gray-700 mb-1'>
              Verification Code
            </label>
            <input
              {...register('verificationCode')}
              type='text'
              id='verificationCode'
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500'
              placeholder='Enter 6-digit code'
              maxLength={6}
            />
            {errors.verificationCode && (
              <p className='mt-1 text-sm text-red-600'>
                {errors.verificationCode.message}
              </p>
            )}
          </div>
        )}

        {error && <p className='text-sm text-red-600'>{error}</p>}

        {success && <p className='text-sm text-green-600'>{success}</p>}

        <button
          type='submit'
          disabled={isSubmitting}
          className='w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'>
          {isSubmitting
            ? 'Processing...'
            : isVerifying
            ? 'Verify Code'
            : 'Request Code'}
        </button>

        {isVerifying && (
          <button
            type='button'
            onClick={handleChangeContact}
            className='w-full text-sm text-gray-600 hover:text-gray-800 mt-2'>
            Change contact information
          </button>
        )}
      </form>
    </div>
  );
};
