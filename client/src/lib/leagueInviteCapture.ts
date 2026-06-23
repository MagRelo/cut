const PENDING_LEAGUE_INVITE_CODE_KEY = "cut_pending_league_invite_code";

export function getPendingLeagueInviteCode(): string | null {
  try {
    return sessionStorage.getItem(PENDING_LEAGUE_INVITE_CODE_KEY);
  } catch {
    return null;
  }
}

export function setPendingLeagueInviteCode(code: string): void {
  try {
    sessionStorage.setItem(PENDING_LEAGUE_INVITE_CODE_KEY, code.trim());
  } catch {
    // ignore quota / private mode
  }
}

export function clearPendingLeagueInviteCode(): void {
  try {
    sessionStorage.removeItem(PENDING_LEAGUE_INVITE_CODE_KEY);
  } catch {
    // ignore
  }
}
