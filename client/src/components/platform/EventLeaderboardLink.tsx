import { ListBulletIcon } from "@heroicons/react/24/outline";
import { Link, useLocation } from "react-router-dom";
import type { CompetitionEventShell } from "@cut/sport-sdk";
import { leaderboardLinkState, leaderboardPath } from "../../lib/contestNavigation";

export function useIsOnEventLeaderboard(event: { sportId: string; id: string }): boolean {
  const { pathname } = useLocation();
  return pathname === leaderboardPath(event.sportId, event.id);
}

export function EventLeaderboardLink({ event }: { event: CompetitionEventShell }) {
  return (
    <Link
      to={leaderboardPath(event.sportId, event.id)}
      state={leaderboardLinkState(event)}
      className="inline-flex items-center gap-1.5 text-blue-500 hover:text-blue-600"
    >
      <ListBulletIcon className="h-4 w-4 shrink-0" aria-hidden />
      Leaderboard
    </Link>
  );
}
