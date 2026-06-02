import type { BehindTheScenesEmailData } from "../emails/behindTheScenes.js";
import { DEFAULT_BTS_PARAGRAPHS } from "../emails/behindTheScenes.js";
import { loadNewTournamentEmailData } from "../data/newTournament.js";
import { getManualActiveTournamentId } from "../data/tournament.js";
import type { NewTournamentEmailData } from "../emails/newTournament.js";
import type { ReminderNoContestEmailData } from "../emails/reminderNoContest.js";
import type { TournamentRecapEmailData } from "../emails/tournamentRecap.js";
import type { PlayerWithdrawalEmailData } from "../emails/playerWithdrawal.js";
import type { WelcomeEmailData } from "../emails/welcome.js";

export async function fixtureNewTournament(): Promise<NewTournamentEmailData> {
  const tournamentId = await getManualActiveTournamentId();
  if (!tournamentId) {
    throw new Error(
      "No manualActive tournament; set one in the DB or run: pnpm --filter server run service:init-tournament -- R{pgaTourId}",
    );
  }

  const data = await loadNewTournamentEmailData(tournamentId);
  if (!data) {
    throw new Error(`Tournament not found: ${tournamentId}`);
  }

  return data;
}

export function fixtureWelcome(): WelcomeEmailData {
  return {
    tournamentName: "Charles Schwab Challenge",
  };
}

export function fixtureReminder(): ReminderNoContestEmailData {
  return {
    userName: "Alex",
    tournamentName: "Charles Schwab Challenge",
    lockLabel: "Thursday, May 22 at 7:00 AM EDT",
    groupNames: ["Sunday Swings"],
    openContests: [
      { name: "Main Event", buyInLabel: "$10 buy-in" },
      { name: "Friends League", buyInLabel: "$5 buy-in", groupName: "Sunday Swings" },
    ],
  };
}

export function fixtureRecap(): TournamentRecapEmailData {
  return {
    tournamentName: "Charles Schwab Challenge",
    subtitle: "Colonial Country Club · Fort Worth, Texas",
    highlights: [
      { label: "Main Event", value: "Winner: Jordan T." },
      { label: "Field", value: "Cut at +2" },
    ],
    personalResults: [
      { label: "Main Event", value: "#4 · 142 pts" },
      { label: "Friends League", value: "#1 · 156 pts" },
    ],
    nextWeekTeaser: "Next week's tournament opens soon on Play The Cut.",
  };
}

export function fixtureBehindTheScenes(): BehindTheScenesEmailData {
  return {
    campaignLabel: "2026-05",
    bodyParagraphs: DEFAULT_BTS_PARAGRAPHS,
  };
}

export function fixturePlayerWithdrawal(): PlayerWithdrawalEmailData {
  return {
    tournamentName: "Charles Schwab Challenge",
    playerName: "Scottie Scheffler",
    lineupNames: ["Lineup #1", "Lineup #2"],
  };
}

export type PreviewKind =
  | "welcome"
  | "new-tournament"
  | "reminder"
  | "recap"
  | "behind-the-scenes"
  | "player-withdrawal"
  | "minimal";

export const PREVIEW_KINDS: PreviewKind[] = [
  "welcome",
  "new-tournament",
  "reminder",
  "recap",
  "behind-the-scenes",
  "player-withdrawal",
  "minimal",
];
