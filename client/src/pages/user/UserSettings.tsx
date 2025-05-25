import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';

const passwordResetSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type PasswordResetFormData = z.infer<typeof passwordResetSchema>;

export function UserSettings() {
  const { user, logout, changePassword } = useAuth();
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetSchema),
  });

  const onSubmit = async (data: PasswordResetFormData) => {
    try {
      await changePassword(data.currentPassword, data.newPassword);
      reset();
      setSuccessMessage('Password updated successfully');
    } catch (error) {
      setSuccessMessage(null);
      setError('root', {
        message:
          error instanceof Error ? error.message : 'Failed to change password',
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  if (user.isAnonymous) {
    return (
      <div className='min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-3xl mx-auto'>
          <div className='bg-white shadow rounded-lg p-6'>
            <h1 className='text-2xl font-bold text-gray-900 mb-6'>
              User Settings
            </h1>
            <p className='text-gray-600'>
              Please log in to access user settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-3xl mx-auto'>
        <div className='bg-white shadow rounded-lg p-6'>
          <h1 className='text-2xl font-bold text-gray-900 mb-6'>
            User Settings
          </h1>

          <div className='space-y-8'>
            <div>
              <h2 className='text-lg font-medium text-gray-900'>
                Profile Information
              </h2>
              <div className='mt-4 space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Name
                  </label>
                  <div className='mt-1 text-gray-900'>{user.name}</div>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Email
                  </label>
                  <div className='mt-1 text-gray-900'>{user.email}</div>
                </div>

                {user.teams.length > 0 && (
                  <div>
                    <dt className='text-sm font-medium text-gray-500'>Teams</dt>
                    {user.teams.map((team) => (
                      <div key={team.id} className='mt-1 text-gray-900'>
                        {team.name} ({team.leagueName})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <button
                onClick={handleLogout}
                className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'>
                Logout
              </button>
            </div>

            <div className='relative'>
              <div
                className='absolute inset-0 flex items-center'
                aria-hidden='true'>
                <div className='w-full border-t border-gray-300'></div>
              </div>
              <div className='relative flex justify-center'>
                <span className='bg-white px-3 text-sm text-gray-500'>
                  Advanced Settings
                </span>
              </div>
            </div>

            <div>
              <h2 className='text-lg font-medium text-gray-900 mb-4'>
                Change Password
              </h2>
              <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
                {successMessage && (
                  <div className='rounded-md bg-emerald-50 p-4'>
                    <p className='text-sm text-emerald-700'>{successMessage}</p>
                  </div>
                )}
                {errors.root && (
                  <div className='rounded-md bg-red-50 p-4'>
                    <p className='text-sm text-red-700'>
                      {errors.root.message}
                    </p>
                  </div>
                )}

                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Current Password
                  </label>
                  <input
                    type='password'
                    {...register('currentPassword')}
                    className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
                  />
                  {errors.currentPassword && (
                    <p className='mt-1 text-sm text-red-600'>
                      {errors.currentPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    New Password
                  </label>
                  <input
                    type='password'
                    {...register('newPassword')}
                    className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
                  />
                  {errors.newPassword && (
                    <p className='mt-1 text-sm text-red-600'>
                      {errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Confirm New Password
                  </label>
                  <input
                    type='password'
                    {...register('confirmPassword')}
                    className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
                  />
                  {errors.confirmPassword && (
                    <p className='mt-1 text-sm text-red-600'>
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <button
                  type='submit'
                  disabled={isSubmitting}
                  className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50'>
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
