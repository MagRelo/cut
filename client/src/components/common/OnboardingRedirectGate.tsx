import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ONBOARDING_DISMISSED_KEY } from "../../lib/onboardingSettings";

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

  const onboardingDismissedValue = user?.settings?.[ONBOARDING_DISMISSED_KEY];
  const shouldRedirectToOnboarding = onboardingDismissedValue === false;

  if (user && shouldRedirectToOnboarding && !EXCLUDED_PATHS.has(location.pathname)) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
