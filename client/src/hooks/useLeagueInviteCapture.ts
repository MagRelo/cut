import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { setPendingLeagueInviteCode } from "../lib/leagueInviteCapture";

const LEAGUE_JOIN_PATH = /^\/leagues\/join\/([^/]+)/;
const LEGACY_LEAGUE_JOIN_PATH = /^\/user-groups\/join\/([^/]+)/;

/** Persist league invite code from the URL before auth redirects (onboarding resume). */
export function useLeagueInviteCapture(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    const match =
      pathname.match(LEAGUE_JOIN_PATH) ?? pathname.match(LEGACY_LEAGUE_JOIN_PATH);
    const code = match?.[1]?.trim();
    if (!code) return;
    setPendingLeagueInviteCode(code);
  }, [pathname]);
}
