import { appPath } from "../appUrl.js";
import { resolveEventIdForEmail } from "../data/event.js";
import { loadContestAnnouncementSource } from "../data/contestAnnouncement.js";
import type { ContestAnnouncementEmailData } from "../emails/contestAnnouncement.js";
import type { PlayerWithdrawalEmailData } from "../emails/playerWithdrawal.js";

const PREVIEW_DEFAULT_SPORT_ID = "pga-golf";

export async function fixtureContestAnnouncement(): Promise<ContestAnnouncementEmailData> {
  const eventId = await resolveEventIdForEmail(PREVIEW_DEFAULT_SPORT_ID);
  const data = await loadContestAnnouncementSource(eventId);
  if (!data) {
    throw new Error(`Event not found: ${eventId}`);
  }

  return {
    eventName: data.eventName,
    leagueName: "Sunday Swings",
    memberCount: 12,
    buyInLabel: "$20",
    contestHref: appPath("/contest/preview"),
    announcement: data.announcement,
  };
}

export function fixturePlayerWithdrawal(): PlayerWithdrawalEmailData {
  return {
    tournamentName: "Charles Schwab Challenge",
    playerName: "Scottie Scheffler",
    lineupNames: ["Lineup #1", "Lineup #2"],
  };
}

export type PreviewKind = "contest-announcement" | "player-withdrawal" | "minimal";

export const PREVIEW_KINDS: PreviewKind[] = [
  "contest-announcement",
  "player-withdrawal",
  "minimal",
];
