import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { onboardingDecision } from "../../lib/access";

/**
 * Accounts stored with `onboardingDismissed: false` go to /onboarding.
 * `/onboarding` and `/connect` stay put so login and the flow itself still work.
 */
export function OnboardingRedirectGate({ children }: { children: React.ReactNode }) {
  const { access } = useAuth();
  const location = useLocation();
  const decision = onboardingDecision(access, location.pathname);

  if (decision.kind === "redirect") {
    return <Navigate to={decision.to} replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
