import { useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { publicLeagueApi } from '../services/publicLeagueApi';

// Validation schema
const createLeagueSchema = z.object({
  name: z
    .string()
    .min(3, 'League name must be at least 3 characters')
    .max(50, 'League name cannot exceed 50 characters'),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
});

type CreateLeagueFormData = z.infer<typeof createLeagueSchema>;

export function PublicCreateLeague() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateLeagueFormData>({
    resolver: zodResolver(createLeagueSchema),
    defaultValues: {},
  });

  const onSubmit: SubmitHandler<CreateLeagueFormData> = useCallback(
    async (data) => {
      try {
        await publicLeagueApi.createLeague(data);
        navigate('/public/leagues');
      } catch (error) {
        console.error('Failed to create league:', error);
        // You might want to add proper error handling/toast here
      }
    },
    [navigate]
  );

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='max-w-2xl mx-auto'>
        <h1 className='text-3xl font-bold text-gray-900 mb-8'>
          Create New Public League
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              League Name *
            </label>
            <input
              type='text'
              {...register('name')}
              className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
              placeholder='Enter league name'
            />
            {errors.name && (
              <p className='mt-1 text-sm text-red-600'>{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Description
            </label>
            <textarea
              {...register('description')}
              rows={4}
              className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
              placeholder='Enter league description'
            />
            {errors.description && (
              <p className='mt-1 text-sm text-red-600'>
                {errors.description.message}
              </p>
            )}
          </div>

          <div className='flex justify-end space-x-4'>
            <button
              type='button'
              onClick={() => navigate('/public/leagues')}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500'>
              Cancel
            </button>
            <button
              type='submit'
              disabled={isSubmitting}
              className='px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50'>
              {isSubmitting ? 'Creating...' : 'Create League'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
