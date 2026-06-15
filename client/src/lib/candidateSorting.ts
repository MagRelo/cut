import type { Candidate } from "@cut/sport-sdk";

const SORT_BUCKET = {
  noData: 205,
  wd: 203,
  cut: 202,
  noPosition: 201,
} as const;

function scoreDataFromCandidate(candidate: Candidate): {
  leaderboardPosition?: string | null;
  leaderboardTotal?: string | null;
} {
  if (!candidate.metadata || typeof candidate.metadata !== "object" || Array.isArray(candidate.metadata)) {
    return {};
  }
  const scoreData = (candidate.metadata as Record<string, unknown>).scoreData;
  if (!scoreData || typeof scoreData !== "object" || Array.isArray(scoreData)) {
    return {};
  }
  return scoreData as {
    leaderboardPosition?: string | null;
    leaderboardTotal?: string | null;
  };
}

function participantFromCandidate(candidate: Candidate): {
  firstName?: string | null;
  lastName?: string | null;
} {
  if (!candidate.metadata || typeof candidate.metadata !== "object" || Array.isArray(candidate.metadata)) {
    return {};
  }
  const participant = (candidate.metadata as Record<string, unknown>).participant;
  if (!participant || typeof participant !== "object" || Array.isArray(participant)) {
    return {};
  }
  return participant as { firstName?: string | null; lastName?: string | null };
}

function getCandidateSortIndex(candidate: Candidate): number {
  const { leaderboardTotal, leaderboardPosition } = scoreDataFromCandidate(candidate);
  const score = leaderboardTotal?.trim();
  const position = leaderboardPosition?.trim().toUpperCase();

  if (!score) return SORT_BUCKET.noData;
  if (position === "WD") return SORT_BUCKET.wd;
  if (position === "CUT") return SORT_BUCKET.cut;
  if (position === "-") return SORT_BUCKET.noPosition;
  if (score === "E") return 0;

  const numericScore = Number.parseInt(score, 10);
  return Number.isNaN(numericScore) ? SORT_BUCKET.noData : numericScore;
}

function getNumericPosition(candidate: Candidate): number {
  const rawPosition =
    scoreDataFromCandidate(candidate).leaderboardPosition?.trim().toUpperCase() || "";
  const normalizedPosition = rawPosition.startsWith("T") ? rawPosition.slice(1) : rawPosition;
  const parsedPosition = Number.parseInt(normalizedPosition, 10);
  return Number.isNaN(parsedPosition) ? Number.POSITIVE_INFINITY : parsedPosition;
}

function compareCandidatesByName(a: Candidate, b: Candidate): number {
  const aParticipant = participantFromCandidate(a);
  const bParticipant = participantFromCandidate(b);
  const aLastName = (aParticipant.lastName || "").trim();
  const bLastName = (bParticipant.lastName || "").trim();
  const lastNameDiff = aLastName.localeCompare(bLastName);
  if (lastNameDiff !== 0) return lastNameDiff;

  const aFirstName = (aParticipant.firstName || a.displayName || "").trim();
  const bFirstName = (bParticipant.firstName || b.displayName || "").trim();
  return aFirstName.localeCompare(bFirstName);
}

export function candidateHasDisplayName(candidate: Candidate): boolean {
  const participant = participantFromCandidate(candidate);
  return Boolean((participant.lastName || "").trim() || candidate.displayName.trim());
}

export function participantLastName(candidate: Candidate): string {
  if (!candidate.metadata || typeof candidate.metadata !== "object" || Array.isArray(candidate.metadata)) {
    return candidate.displayName;
  }
  const participant = (candidate.metadata as Record<string, unknown>).participant;
  if (participant && typeof participant === "object" && !Array.isArray(participant)) {
    const lastName = (participant as { lastName?: string | null }).lastName;
    if (typeof lastName === "string" && lastName.trim()) {
      return lastName.trim();
    }
  }
  return candidate.displayName;
}

export function compareCandidatesByLeaderboard(
  a: Candidate,
  b: Candidate,
  options?: { sortByNameOnly?: boolean },
): number {
  if (!options?.sortByNameOnly) {
    const sortIndexDiff = getCandidateSortIndex(a) - getCandidateSortIndex(b);
    if (sortIndexDiff !== 0) return sortIndexDiff;

    const positionDiff = getNumericPosition(a) - getNumericPosition(b);
    if (positionDiff !== 0) return positionDiff;
  }

  return compareCandidatesByName(a, b);
}

export function sortCandidatesByLeaderboard(
  candidates: Candidate[],
  options?: { sortByNameOnly?: boolean },
): Candidate[] {
  return [...candidates].sort((a, b) => compareCandidatesByLeaderboard(a, b, options));
}

export function externalIdFromCandidate(candidate: Candidate): string | undefined {
  if (!candidate.metadata || typeof candidate.metadata !== "object" || Array.isArray(candidate.metadata)) {
    return undefined;
  }
  const externalId = (candidate.metadata as Record<string, unknown>).externalId;
  return typeof externalId === "string" ? externalId : undefined;
}
