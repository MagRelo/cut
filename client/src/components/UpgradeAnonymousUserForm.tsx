import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

const upgradeUserSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

type UpgradeUserFormData = z.infer<typeof upgradeUserSchema>;

export function UpgradeAnonymousUserForm() {
  const { upgradeAnonymousUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<UpgradeUserFormData>({
    resolver: zodResolver(upgradeUserSchema),
  });

  const onSubmit = async (data: UpgradeUserFormData) => {
    try {
      await upgradeAnonymousUser(data.email, data.password, data.name);
      setSuccess(true);
      setError(null);
      reset();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to upgrade account'
      );
      setSuccess(false);
    }
  };

  return (
    <div className='mt-4'>
      {success && (
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
            Name
          </label>
          <input
            type='text'
            {...register('name')}
            className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm'
          />
          {errors.name && (
            <p className='mt-1 text-sm text-red-600'>{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700'>
            Email
          </label>
          <input
            type='email'
            {...register('email')}
            className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm'
          />
          {errors.email && (
            <p className='mt-1 text-sm text-red-600'>{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700'>
            Password
          </label>
          <input
            type='password'
            {...register('password')}
            className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm'
          />
          {errors.password && (
            <p className='mt-1 text-sm text-red-600'>
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type='submit'
          disabled={isSubmitting}
          className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50'>
          {isSubmitting ? 'Upgrading...' : 'Upgrade Account'}
        </button>
      </form>
    </div>
  );
}
