import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { adminDecision } from "../../lib/access";

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * After login: only `ADMIN` / `SUPER_ADMIN` may view (must be nested under `ProtectedRoute`).
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { access } = useAuth();
  const decision = adminDecision(access);

  if (decision.kind === "redirect") {
    return <Navigate to={decision.to} replace />;
  }

  if (decision.kind === "wait") {
    return null;
  }

  return <>{children}</>;
}
