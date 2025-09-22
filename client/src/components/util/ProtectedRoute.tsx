import { Navigate, useLocation } from "react-router-dom";
import { usePortoAuth } from "../../contexts/PortoAuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = usePortoAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to connect page with the current location as return URL
    return <Navigate to="/connect" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
