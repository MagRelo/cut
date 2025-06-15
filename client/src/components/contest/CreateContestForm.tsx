import { useState } from 'react';
import { useContestApi } from '../../services/contestApi';
import { type CreateContestInput } from '../../types.new/contest';
import { useBalance } from 'wagmi';
import { paymentTokenAddress } from '../../utils/contracts/sepolia.json';
import { useAccount } from 'wagmi';

export const CreateContestForm = () => {
  const { address } = useAccount();

  const [formData, setFormData] = useState<CreateContestInput>({
    name: '',
    description: '',
    tournamentId: '',
    userGroupId: '',
    startDate: new Date(),
    endDate: new Date(),
    settings: {
      fee: 10,
      maxEntry: 50,
      contestType: 'PUBLIC',
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contestApi = useContestApi();

  const paymentTokenBalance = useBalance({
    address,
    token: paymentTokenAddress as `0x${string}`,
  });

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
        settings: {
          fee: 10,
          maxEntry: 50,
          contestType: 'PUBLIC',
        },
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
    <form onSubmit={handleSubmit} className='space-y-2 max-w-2xl mx-auto p-4'>
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
      </div> */}
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

      <div className='grid grid-cols-2 gap-2'>
        <div className='space-y-2'>
          <label htmlFor='settings.maxEntry' className='block font-medium'>
            Maximum Entries
          </label>
          <input
            type='number'
            id='settings.maxEntry'
            name='settings.maxEntry'
            value={formData.settings?.maxEntry ?? 0}
            onChange={(e) => {
              setFormData((prev) => ({
                ...prev,
                settings: {
                  maxEntry: Number(e.target.value),
                  fee: prev.settings?.fee ?? 0,
                  contestType: prev.settings?.contestType ?? 'PUBLIC',
                },
              }));
            }}
            min='0'
            required
            className='w-full p-2 border rounded-md'
          />
        </div>

        <div className='space-y-2'>
          <label htmlFor='settings.fee' className='block font-medium'>
            Entry Fee
          </label>
          <div className='relative'>
            <input
              type='number'
              id='settings.fee'
              name='settings.fee'
              value={formData.settings?.fee ?? 0}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  settings: {
                    fee: Number(e.target.value),
                    maxEntry: prev.settings?.maxEntry ?? 0,
                    contestType: prev.settings?.contestType ?? 'PUBLIC',
                  },
                }));
              }}
              min='0'
              step='0.01'
              required
              className='w-full p-2 border rounded-md pr-12'
            />
            <div className='absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500'>
              {paymentTokenBalance?.data?.symbol}
            </div>
          </div>
        </div>
      </div>

      <div>
        <button
          type='submit'
          disabled={loading}
          className='w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed mt-2'>
          {loading ? 'Creating...' : 'Create Contest'}
        </button>
      </div>

      {error && (
        <div className='text-red-500 mb-4'>
          <hr className='my-2' />
          <div className='text-red-500'>{error}</div>
        </div>
      )}
    </form>
  );
};
