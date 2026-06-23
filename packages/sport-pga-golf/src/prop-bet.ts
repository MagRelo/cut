import type { PropBetGrade } from "@cut/sport-sdk";

export type GolfPropBetSelection = {
  hitsRequired: number;
  topN: number;
  decimalOdds: number;
  americanDisplay: string;
};

export type GolfPropBetMarketMetadata =
  | {
      kind: "open";
      tour: string;
      dgEventId: number;
      dgEventName: string;
      dgFieldLastUpdated: string;
      dgOddsLastUpdated: string;
      selections: GolfPropBetSelection[];
    }
  | {
      kind: "unavailable";
      reason: string;
      tour: string;
    };

export type GolfPropBetTicketMetadata = {
  hitsRequired: number;
  topN: number;
  eventParticipantIds: string[];
};

export type GolfPropBetResultsMetadata = {
  /** Leaderboard positions aligned to sorted `eventParticipantIds` on the ticket. */
  leaderboardPositions: (string | null)[];
};

/**
 * Official finish position vs top-N threshold.
 * `null` = cannot grade conservatively (unknown position string).
 */
export function isGolfFinishInTopN(
  leaderboardPosition: string | null | undefined,
  topN: number,
): boolean | null {
  if (leaderboardPosition == null || leaderboardPosition === "") return null;
  const normalized = leaderboardPosition.trim().toUpperCase();
  if (normalized === "CUT" || normalized === "WD" || normalized === "DQ" || normalized === "MDF" || normalized === "DNS") {
    return false;
  }
  const match = normalized.match(/^T?(\d+)$/);
  if (!match) return null;
  const position = parseInt(match[1]!, 10);
  if (!Number.isFinite(position)) return null;
  return position <= topN;
}

export function gradeGolfPropTicket(
  ticket: GolfPropBetTicketMetadata,
  results: GolfPropBetResultsMetadata,
): PropBetGrade {
  const { hitsRequired, topN, eventParticipantIds } = ticket;
  if (eventParticipantIds.length !== 4) {
    return "VOID";
  }
  if (results.leaderboardPositions.length !== 4) {
    return "VOID";
  }

  const graded = results.leaderboardPositions.map((position) =>
    isGolfFinishInTopN(position, topN),
  );
  if (graded.some((value) => value === null)) {
    return "VOID";
  }

  const hits = graded.filter((value) => value === true).length;
  return hits >= hitsRequired ? "WON" : "LOST";
}
