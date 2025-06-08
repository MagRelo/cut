import { usePortoAuth } from '../contexts/PortoAuthContext';
import { UserRegisterForm } from '../components/user/UserRegistrationForm';
import { UserSettings } from '../components/user/UserSettings';
import { PageHeader } from '../components/util/PageHeader';

export function UserPage() {
  const { user } = usePortoAuth();

  return (
    <div className='p-4'>
      <PageHeader title='User Profile' />
      <div className='mt-4'>
        {user?.isAnonymous ? <UserRegisterForm /> : <UserSettings />}
      </div>
    </div>
  );
}
