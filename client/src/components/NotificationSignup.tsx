import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  notificationSignupSchema,
  NotificationSignupFormData,
} from '../validations/notificationSignup';
import { notificationService } from '../services/notificationService';

export const NotificationSignup = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<NotificationSignupFormData>({
    resolver: zodResolver(notificationSignupSchema),
  });

  const handleChangeContact = () => {
    setIsVerifying(false);
    setError(null);
    setSuccess(null);
    reset({ contact: '' });
  };

  const onSubmit = async (data: NotificationSignupFormData) => {
    try {
      setError(null);
      setSuccess(null);

      if (!isVerifying) {
        // Request verification code
        const response = await notificationService.requestVerification(
          data.contact
        );
        if (response.success) {
          setIsVerifying(true);
          setSuccess(
            'Verification code sent! Please check your email or phone.'
          );
        }
      } else {
        // Verify code
        const response = await notificationService.verifyCode(data);
        if (response.success) {
          setSuccess('Successfully signed up for notifications!');
          setIsVerifying(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className='max-w-md mx-auto p-6 bg-white rounded-lg shadow-md'>
      <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
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
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
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
          className='w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'>
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
