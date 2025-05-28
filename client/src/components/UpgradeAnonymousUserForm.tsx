import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import {
  contactVerificationSchema,
  ContactVerificationFormData,
} from '../validations/notificationSignup';

export function UpgradeAnonymousUserForm() {
  const { upgradeAnonymousUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

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
    setSuccess(false);
    reset({ contact: '' });
  };

  const onSubmit = async (data: ContactVerificationFormData) => {
    try {
      if (!isVerifying) {
        // Request verification code
        await upgradeAnonymousUser(data.contact);
        setIsVerifying(true);
        setSuccess(true);
        setError(null);
      } else {
        // Verify code and complete upgrade
        await upgradeAnonymousUser(data.contact, data.verificationCode);
        setSuccess(true);
        setError(null);
        reset();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to upgrade account'
      );
      setSuccess(false);
    }
  };

  return (
    <div className='mt-4'>
      {success && !isVerifying && (
        <div className='mb-4 p-2 bg-emerald-50 text-emerald-700 rounded'>
          Account upgraded successfully!
        </div>
      )}

      {error && (
        <div className='mb-4 p-2 bg-red-50 text-red-700 rounded'>{error}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
        <p className='text-gray-700 font-medium mb-3'>
          Verify your account to:
        </p>
        <ul className='space-y-2'>
          <li className='flex items-center text-gray-600'>
            <svg
              className='w-5 h-5 mr-2 text-green-500'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                d='M5 13l4 4L19 7'
              />
            </svg>
            <p>Manage your team from any device</p>
          </li>
          <li className='flex items-center text-gray-600'>
            <svg
              className='w-5 h-5 mr-2 text-green-500'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                d='M5 13l4 4L19 7'
              />
            </svg>
            <p>Create & join private leagues</p>
          </li>
        </ul>

        <div>
          <label className='block text-sm font-medium text-gray-700'>
            Email or Phone Number
          </label>
          <input
            type='text'
            {...register('contact')}
            disabled={isVerifying}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm ${
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

        {isVerifying && (
          <div>
            <label className='block text-sm font-medium text-gray-700'>
              Verification Code
            </label>
            <input
              type='text'
              {...register('verificationCode')}
              className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm'
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

        <button
          type='submit'
          disabled={isSubmitting}
          className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50'>
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
}
