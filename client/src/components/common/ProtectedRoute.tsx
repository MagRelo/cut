import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { protectedDecision } from "../../lib/access";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { access } = useAuth();
  const location = useLocation();
  const decision = protectedDecision(access);

  if (decision.kind === "redirect") {
    return <Navigate to={decision.to} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
