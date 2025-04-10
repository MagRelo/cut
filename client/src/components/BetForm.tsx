import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Asset {
  perp: string[];
  spot: string[];
}

interface Player {
  player: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface LeverageOption {
  value: string;
  label: string;
}

export const BetForm: React.FC = () => {
  const [assets, setAssets] = useState<Asset | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState({
    players: true,
    assets: true,
  });

  const leverageOptions: LeverageOption[] = [
    { value: 'No', label: 'No' },
    { value: '2X', label: '2X' },
    { value: '5X', label: '5X' },
    { value: '10X', label: '10X' },
  ];

  const [formData, setFormData] = useState({
    betType: 'Player Finish',
    golfer: '',
    finish: 'Win',
    betAmount: '',
    assetType: '',
    direction: 'Up',
    leverage: 'No',
  });

  useEffect(() => {
    // Fetch assets for the Asset Type dropdown
    const fetchAssets = async () => {
      try {
        const response = await api.getAssets();
        setAssets(response.assets);
      } catch (error) {
        console.error('Error fetching assets:', error);
      } finally {
        setIsLoading((prev) => ({ ...prev, assets: false }));
      }
    };

    // Fetch players for the Golfer dropdown
    const fetchPlayers = async () => {
      try {
        const response = await api.getLeaderboard();
        // Add validation to ensure we have the correct data structure
        const leaderboardPlayers =
          response?.props?.pageProps?.leaderboard?.players;
        if (!Array.isArray(leaderboardPlayers)) {
          console.error('Invalid players data structure:', response);
          setPlayers([]);
        } else {
          // Validate each player object has the required structure
          const validPlayers = leaderboardPlayers.filter(
            (player): player is Player =>
              Boolean(
                player?.player?.id &&
                  player?.player?.firstName &&
                  player?.player?.lastName
              )
          );
          setPlayers(validPlayers);
        }
      } catch (error) {
        console.error('Error fetching players:', error);
        setPlayers([]);
      } finally {
        setIsLoading((prev) => ({ ...prev, players: false }));
      }
    };

    fetchAssets();
    fetchPlayers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const orderData = {
        asset: formData.assetType,
        amountUsdc: parseFloat(formData.betAmount),
        leverage:
          formData.leverage === 'No'
            ? 1
            : parseInt(formData.leverage.replace('X', '')),
      };

      const response = await api.placeOrder(orderData);
      console.log('Order placed successfully:', response);
      // TODO: Add success notification
    } catch (error) {
      console.error('Error placing order:', error);
      // TODO: Add error notification
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-8'>
      {/* Bet Section */}
      <div className='bg-white p-6 rounded-lg shadow'>
        <h2 className='text-xl font-semibold mb-4'>Bet</h2>

        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700'>
              Bet Type
            </label>
            <select
              name='betType'
              value={formData.betType}
              onChange={handleInputChange}
              className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500'>
              <option value='Player Finish'>Player Finish</option>
            </select>
          </div>

          {formData.betType === 'Player Finish' && (
            <>
              <div>
                <label className='block text-sm font-medium text-gray-700'>
                  Golfer
                </label>
                <select
                  name='golfer'
                  value={formData.golfer}
                  onChange={handleInputChange}
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500'>
                  <option value=''>Select a golfer</option>
                  {!isLoading.players && players && players.length > 0 ? (
                    players.map((player) => (
                      <option key={player.player.id} value={player.player.id}>
                        {`${player.player.lastName}, ${player.player.firstName}`}
                      </option>
                    ))
                  ) : (
                    <option value='' disabled>
                      {isLoading.players
                        ? 'Loading players...'
                        : 'No players available'}
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700'>
                  Finish
                </label>
                <select
                  name='finish'
                  value={formData.finish}
                  onChange={handleInputChange}
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500'>
                  <option value='Win'>Win</option>
                  <option value='Top 5'>Top 5</option>
                  <option value='Top 10'>Top 10</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className='block text-sm font-medium text-gray-700'>
              Bet Amount (USD)
            </label>
            <input
              type='number'
              name='betAmount'
              value={formData.betAmount}
              onChange={handleInputChange}
              min='0'
              step='0.01'
              className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500'
              required
            />
          </div>
        </div>
      </div>

      {/* Volcano Bet Section */}
      <div className='bg-white p-6 rounded-lg shadow'>
        <h2 className='text-xl font-semibold mb-4'>Volcano Bet</h2>

        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700'>
              Asset Type
            </label>
            <select
              name='assetType'
              value={formData.assetType}
              onChange={handleInputChange}
              className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500'
              required>
              <option value=''>Select an asset</option>
              {!isLoading.assets && assets?.perp && assets.perp.length > 0 ? (
                assets.perp.map((asset) => (
                  <option key={asset} value={asset}>
                    {asset}
                  </option>
                ))
              ) : (
                <option value='' disabled>
                  {isLoading.assets
                    ? 'Loading assets...'
                    : 'No assets available'}
                </option>
              )}
            </select>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700'>
              Direction
            </label>
            <div className='mt-2 space-x-4'>
              <label className='inline-flex items-center'>
                <input
                  type='radio'
                  name='direction'
                  value='Up'
                  checked={formData.direction === 'Up'}
                  onChange={handleInputChange}
                  className='form-radio text-emerald-600'
                />
                <span className='ml-2'>Up</span>
              </label>
              <label className='inline-flex items-center'>
                <input
                  type='radio'
                  name='direction'
                  value='Down'
                  checked={formData.direction === 'Down'}
                  onChange={handleInputChange}
                  className='form-radio text-emerald-600'
                />
                <span className='ml-2'>Down</span>
              </label>
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700'>
              Leverage
            </label>
            <div className='mt-2 flex items-center space-x-4'>
              {leverageOptions && leverageOptions.length > 0 ? (
                leverageOptions.map((option) => (
                  <label
                    key={option.value}
                    className='inline-flex items-center'>
                    <input
                      type='radio'
                      name='leverage'
                      value={option.value}
                      checked={formData.leverage === option.value}
                      onChange={handleInputChange}
                      className='form-radio text-emerald-600'
                    />
                    <span className='ml-2'>{option.label}</span>
                  </label>
                ))
              ) : (
                <span className='text-gray-500'>
                  No leverage options available
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className='flex justify-end'>
        <button
          type='submit'
          className='bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2'>
          Place Order
        </button>
      </div>
    </form>
  );
};
