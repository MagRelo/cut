import { useAuth } from '../../contexts/AuthContext';
import { NotificationSettings } from './NotificationSettings';

export function UserSettings() {
  const { user, logout } = useAuth();

  // Utility to format phone numbers as (123) 456-7890
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    return phone;
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out:', error);
    }
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
    <>
      <div className='bg-white shadow rounded-lg p-4 mb-4'>
        <h2 className='text-xl font-medium text-gray-900 mb-4'>
          Notification Settings
        </h2>
        <NotificationSettings />
      </div>

      <div className='bg-white shadow rounded-lg p-4 mt-4'>
        <div>
          <h2 className='text-lg font-medium text-gray-900'>
            Profile Information
          </h2>
        </div>
        <div className='space-y-4'>
          {user.email && <div className='mt-1 text-gray-900'>{user.email}</div>}
          {user.phone && (
            <div className='mt-1 text-gray-900'>
              {formatPhoneNumber(user.phone)}
            </div>
          )}
        </div>

        <div className='mt-4'>
          <button
            onClick={handleLogout}
            className='text-sm text-gray-500 hover:text-red-600 focus:outline-none border border-gray-300 rounded px-4 py-1 hover:border-red-600'>
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
