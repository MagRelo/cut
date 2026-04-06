import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { isOnboardingDismissed } from "../../lib/onboardingSettings";

const EXCLUDED_PATHS = new Set(["/onboarding", "/connect"]);

/**
 * Authenticated users who have not dismissed onboarding are sent to /onboarding once.
 * Excludes `/onboarding` and `/connect` so login and the flow itself still work.
 */
export function OnboardingRedirectGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <>{children}</>;
  }

  if (
    user &&
    !isOnboardingDismissed(user.settings) &&
    !EXCLUDED_PATHS.has(location.pathname)
  ) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
