import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { sessionPhase } = useAuth();
  const location = useLocation();

  if (sessionPhase === "signedOut" || sessionPhase === "sessionError") {
    return <Navigate to="/connect" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
