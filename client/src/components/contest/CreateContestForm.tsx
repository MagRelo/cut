import { useState } from 'react';
import { useContestApi } from '../../services/contestApi';
import { type CreateContestInput } from '../../types.new/contest';

export const CreateContestForm = () => {
  const [formData, setFormData] = useState<CreateContestInput>({
    name: '',
    description: '',
    tournamentId: '',
    userGroupId: '',
    startDate: new Date(),
    endDate: new Date(),
    settings: {},
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contestApi = useContestApi();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await contestApi.createContest(formData);
      // Reset form after successful submission
      setFormData({
        name: '',
        description: '',
        tournamentId: '',
        userGroupId: '',
        startDate: new Date(),
        endDate: new Date(),
        settings: {},
      });
    } catch (err) {
      console.error('Error creating contest:', err);
      setError('Failed to create contest');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4 max-w-2xl mx-auto p-4'>
      <h2 className='text-2xl font-bold mb-6'>Create New Contest</h2>

      {error && <div className='text-red-500 mb-4'>{error}</div>}

      <div className='space-y-2'>
        <label htmlFor='name' className='block font-medium'>
          Contest Name
        </label>
        <input
          type='text'
          id='name'
          name='name'
          value={formData.name}
          onChange={handleChange}
          required
          className='w-full p-2 border rounded-md'
        />
      </div>

      {/* <div className='space-y-2'>
        <label htmlFor='description' className='block font-medium'>
          Description
        </label>
        <textarea
          id='description'
          name='description'
          value={formData.description}
          onChange={handleChange}
          className='w-full p-2 border rounded-md'
          rows={3}
        />
      </div> */}

      {/* <div className='space-y-2'>
        <label htmlFor='tournamentId' className='block font-medium'>
          Tournament ID
        </label>
        <input
          type='text'
          id='tournamentId'
          name='tournamentId'
          value={formData.tournamentId}
          onChange={handleChange}
          required
          className='w-full p-2 border rounded-md'
        />
      </div> */}

      <div className='space-y-2'>
        <label htmlFor='userGroupId' className='block font-medium'>
          User Group ID
        </label>
        <input
          type='text'
          id='userGroupId'
          name='userGroupId'
          value={formData.userGroupId}
          onChange={handleChange}
          required
          className='w-full p-2 border rounded-md'
        />
      </div>
      {/* 
      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-2'>
          <label htmlFor='startDate' className='block font-medium'>
            Start Date
          </label>
          <input
            type='datetime-local'
            id='startDate'
            name='startDate'
            value={formData.startDate.toISOString().slice(0, 16)}
            onChange={handleChange}
            required
            className='w-full p-2 border rounded-md'
          />
        </div>

        <div className='space-y-2'>
          <label htmlFor='endDate' className='block font-medium'>
            End Date
          </label>
          <input
            type='datetime-local'
            id='endDate'
            name='endDate'
            value={formData.endDate.toISOString().slice(0, 16)}
            onChange={handleChange}
            required
            className='w-full p-2 border rounded-md'
          />
        </div>
      </div> */}

      <button
        type='submit'
        disabled={loading}
        className='w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed'>
        {loading ? 'Creating...' : 'Create Contest'}
      </button>
    </form>
  );
};
