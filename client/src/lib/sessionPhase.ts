export type SessionPhase =
  | "booting"
  | "signedOut"
  | "needsWallet"
  | "syncingProfile"
  | "sessionError"
  | "ready";

export interface SessionPhaseInput {
  privyReady: boolean;
  authenticated: boolean;
  profileBlocked: boolean;
  /** Wagmi `useAccount().status`. Anything other than `disconnected` still counts as connecting. */
  wagmiStatus: string;
  hasAddress: boolean;
  /** Profile fetch failed and no profile is loaded. */
  profileError: boolean;
  hasUser: boolean;
}

/** First match wins. Bootstrap requests inside the profile query are not phases. */
export function readSessionPhase(input: SessionPhaseInput): SessionPhase {
  if (!input.privyReady) return "booting";
  if (!input.authenticated || input.profileBlocked) return "signedOut";
  if (!input.hasAddress) {
    return input.wagmiStatus === "disconnected" ? "signedOut" : "needsWallet";
  }
  if (input.hasUser) return "ready";
  if (input.profileError) return "sessionError";
  return "syncingProfile";
}

export function sessionPhaseIsLoading(phase: SessionPhase): boolean {
  return phase === "booting" || phase === "needsWallet" || phase === "syncingProfile";
}
