import { Navigate, useLocation } from "react-router-dom";
import { usePortoAuth } from "../../contexts/PortoAuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = usePortoAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    // Redirect to connect page with the current location as return URL
    return <Navigate to="/connect" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
