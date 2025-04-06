import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UnverifiedEmail } from './UnverifiedEmail';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerification?: boolean;
}

export function ProtectedRoute({
  children,
  requireVerification = true,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900'></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login but save the attempted location
    return <Navigate to='/login' state={{ from: location }} replace />;
  }

  // Check email verification if required
  if (requireVerification && !user.emailVerified) {
    return <UnverifiedEmail />;
  }

  return <>{children}</>;
}
