/** Stored in `user.settings`; when true, skip redirect to /onboarding */
export const ONBOARDING_DISMISSED_KEY = "onboardingDismissed" as const;

export function isOnboardingDismissed(settings: Record<string, unknown> | null | undefined): boolean {
  return Boolean(settings?.[ONBOARDING_DISMISSED_KEY]);
}
