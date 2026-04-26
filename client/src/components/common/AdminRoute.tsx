import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * After login: only `ADMIN` / `SUPER_ADMIN` may view (must be nested under `ProtectedRoute`).
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return <>{children}</>;
  }

  if (!user) {
    return <Navigate to="/connect" replace />;
  }

  if (!isAdmin()) {
    return <Navigate to="/account" replace />;
  }

  return <>{children}</>;
}
