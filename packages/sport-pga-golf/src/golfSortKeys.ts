import type { GolfParticipantMetadata, GolfScoreData } from "./metadata.js";

export const GOLF_LEADERBOARD_SORT_BUCKET = {
  noData: 205,
  wd: 203,
  cut: 202,
  noPosition: 201,
} as const;

export const GOLF_MISSING_RANK = 9999;
export const GOLF_MISSING_POSITION = 99999;

function parseScoreData(scoreData: unknown): GolfScoreData {
  if (!scoreData || typeof scoreData !== "object" || Array.isArray(scoreData)) {
    return {};
  }
  return scoreData as GolfScoreData;
}

function parseParticipantMetadata(metadata: unknown): GolfParticipantMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata as GolfParticipantMetadata;
}

export function golfLeaderboardScoreSortKey(scoreData: GolfScoreData): number {
  const score = scoreData.leaderboardTotal?.trim();
  const position = scoreData.leaderboardPosition?.trim().toUpperCase();

  if (!score) return GOLF_LEADERBOARD_SORT_BUCKET.noData;
  if (position === "WD") return GOLF_LEADERBOARD_SORT_BUCKET.wd;
  if (position === "CUT") return GOLF_LEADERBOARD_SORT_BUCKET.cut;
  if (position === "-") return GOLF_LEADERBOARD_SORT_BUCKET.noPosition;
  if (score === "E") return 0;

  const numericScore = Number.parseInt(score, 10);
  return Number.isNaN(numericScore) ? GOLF_LEADERBOARD_SORT_BUCKET.noData : numericScore;
}

export function golfLeaderboardPositionSortKey(scoreData: GolfScoreData): number {
  const rawPosition = scoreData.leaderboardPosition?.trim().toUpperCase() || "";
  const normalizedPosition = rawPosition.startsWith("T") ? rawPosition.slice(1) : rawPosition;
  const parsedPosition = Number.parseInt(normalizedPosition, 10);
  return Number.isNaN(parsedPosition) ? GOLF_MISSING_POSITION : parsedPosition;
}

export function golfNameSortKeys(participantMeta: GolfParticipantMetadata, displayName: string): {
  lastName: string;
  firstName: string;
  name: string;
} {
  const lastName = (participantMeta.lastName || "").trim().toLowerCase();
  const firstName = (participantMeta.firstName || displayName).trim().toLowerCase();
  return {
    lastName,
    firstName,
    name: displayName.toLowerCase(),
  };
}

function owgrFromParticipantMeta(participantMeta: GolfParticipantMetadata): string | null {
  if (typeof participantMeta.owgr === "string" && participantMeta.owgr.trim()) {
    return participantMeta.owgr.trim();
  }
  if (participantMeta.standings && typeof participantMeta.standings === "object") {
    const owgr = participantMeta.standings.owgr;
    if (typeof owgr === "string" && owgr.trim()) return owgr.trim();
  }
  const performance = participantMeta.performance;
  if (performance && typeof performance === "object" && !Array.isArray(performance)) {
    const standings = (performance as Record<string, unknown>).standings;
    if (standings && typeof standings === "object" && !Array.isArray(standings)) {
      const owgr = (standings as Record<string, unknown>).owgr;
      if (typeof owgr === "string" && owgr.trim()) return owgr.trim();
    }
  }
  return null;
}

function dataGolfRankFromParticipantMeta(participantMeta: GolfParticipantMetadata): number | undefined {
  const dataGolf = participantMeta.dataGolf;
  if (dataGolf && typeof dataGolf === "object" && !Array.isArray(dataGolf)) {
    const rank = (dataGolf as Record<string, unknown>).dg_rank;
    if (typeof rank === "number") return rank;
  }
  const performance = participantMeta.performance;
  if (performance && typeof performance === "object" && !Array.isArray(performance)) {
    const legacy = (performance as Record<string, unknown>).dataGolfRanking;
    if (legacy && typeof legacy === "object" && !Array.isArray(legacy)) {
      const rank = (legacy as Record<string, unknown>).dg_rank;
      if (typeof rank === "number") return rank;
    }
  }
  return undefined;
}

export function golfCandidateHasDisplayName(candidate: {
  displayName: string;
  metadata: unknown;
}): boolean {
  if (!candidate.metadata || typeof candidate.metadata !== "object" || Array.isArray(candidate.metadata)) {
    return Boolean(candidate.displayName.trim());
  }
  const participant = (candidate.metadata as Record<string, unknown>).participant;
  if (!participant || typeof participant !== "object" || Array.isArray(participant)) {
    return Boolean(candidate.displayName.trim());
  }
  const lastName = (participant as { lastName?: string | null }).lastName;
  return Boolean((lastName || "").trim() || candidate.displayName.trim());
}

export function buildGolfSortKeys(input: {
  displayName: string;
  participantMetadata: unknown;
  scoreData: unknown;
  total: number | null;
}): Record<string, number | string> {
  const participantMeta = parseParticipantMetadata(input.participantMetadata);
  const scoreData = parseScoreData(input.scoreData);
  const names = golfNameSortKeys(participantMeta, input.displayName);

  const owgrRaw = owgrFromParticipantMeta(participantMeta);
  const owgrRank = owgrRaw ? Number(owgrRaw) : Number.NaN;
  const dgRank = dataGolfRankFromParticipantMeta(participantMeta) ?? Number.NaN;

  return {
    owgr: Number.isFinite(owgrRank) ? owgrRank : GOLF_MISSING_RANK,
    dataGolf: Number.isFinite(dgRank) ? dgRank : GOLF_MISSING_RANK,
    leaderboardScore: golfLeaderboardScoreSortKey(scoreData),
    leaderboardPosition: golfLeaderboardPositionSortKey(scoreData),
    lastName: names.lastName,
    firstName: names.firstName,
    name: names.name,
    stableford: input.total ?? scoreData.stableford ?? 0,
  };
}
