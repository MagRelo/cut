export type AccessAccount = {
  userType: string;
  settings: Record<string, unknown> | null;
};

export type Access<TAccount extends AccessAccount = AccessAccount> =
  | { kind: "starting"; authenticated: boolean }
  | { kind: "anonymous" }
  | { kind: "account"; account: TAccount }
  | { kind: "blocked"; message: string };

export type AccessInput<TAccount extends AccessAccount = AccessAccount> = {
  privyReady: boolean;
  authenticated: boolean;
  walletAddress: string | null;
  account?: TAccount;
  /** Set when the account query failed and there is no account. */
  accountError: string | null;
  accountPending: boolean;
};

/** Privy and the profile query stay behind this. A missing wallet stays `starting`. */
export function readAccess<TAccount extends AccessAccount>(
  input: AccessInput<TAccount>,
): Access<TAccount> {
  if (!input.privyReady) return { kind: "starting", authenticated: false };
  if (!input.authenticated) return { kind: "anonymous" };
  if (input.account) return { kind: "account", account: input.account };
  if (!input.walletAddress || input.accountPending) {
    return { kind: "starting", authenticated: true };
  }
  if (input.accountError) return { kind: "blocked", message: input.accountError };
  return { kind: "starting", authenticated: true };
}

export type RouteDecision =
  | { kind: "render" }
  | { kind: "wait" }
  | { kind: "redirect"; to: "/connect" | "/onboarding" | "/account" };

/** Protected pages stay mounted while access is still resolving. */
export function protectedDecision(access: Access): RouteDecision {
  if (access.kind === "anonymous" || access.kind === "blocked") {
    return { kind: "redirect", to: "/connect" };
  }
  return { kind: "render" };
}

/** New accounts are stored with `onboardingDismissed: false`. A missing key does not redirect. */
export function onboardingDecision(access: Access, pathname: string): RouteDecision {
  if (access.kind !== "account") return { kind: "render" };
  if (pathname === "/connect" || pathname === "/onboarding") return { kind: "render" };
  if (access.account.settings?.onboardingDismissed === false) {
    return { kind: "redirect", to: "/onboarding" };
  }
  return { kind: "render" };
}

/** Staff routes render nothing while access is starting. The overlay covers that wait. */
export function adminDecision(access: Access): RouteDecision {
  if (access.kind === "anonymous" || access.kind === "blocked") {
    return { kind: "redirect", to: "/connect" };
  }
  if (access.kind === "starting") return { kind: "wait" };
  if (access.account.userType === "ADMIN" || access.account.userType === "SUPER_ADMIN") {
    return { kind: "render" };
  }
  return { kind: "redirect", to: "/account" };
}
