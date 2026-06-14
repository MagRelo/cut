import type { Candidate } from "@cut/sport-sdk";
import type { LineupPickShell } from "@cut/sport-sdk/ui";

type GolfCandidateMetadata = {
  participant?: {
    firstName?: string | null;
    lastName?: string | null;
    country?: string | null;
    countryFlag?: string | null;
    owgr?: string | null;
    imageUrl?: string | null;
  };
  total?: number;
  scoreData?: {
    leaderboardPosition?: string | null;
    leaderboardTotal?: string | null;
    stableford?: number | null;
  };
};

type GolfEventMetadata = {
  name?: string;
  course?: string;
  city?: string;
  state?: string;
  status?: string;
  roundDisplay?: string | null;
  roundStatusDisplay?: string | null;
  beautyImage?: string | null;
};

export function parseGolfCandidateMetadata(candidate: Candidate): GolfCandidateMetadata {
  if (!candidate.metadata || typeof candidate.metadata !== "object") {
    return {};
  }
  return candidate.metadata as GolfCandidateMetadata;
}

export function parseGolfPickMetadata(pick: LineupPickShell): GolfCandidateMetadata {
  if (!pick.metadata || typeof pick.metadata !== "object") {
    return {};
  }
  return pick.metadata as GolfCandidateMetadata;
}

export function parseGolfEventMetadata(metadata: unknown): GolfEventMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata as GolfEventMetadata;
}

export function formatGolfEventStatus(status: string | undefined): string {
  if (!status) return "Scheduled";
  return status
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function candidateStableford(candidate: Candidate): number {
  const meta = parseGolfCandidateMetadata(candidate);
  if (typeof meta.total === "number") return meta.total;
  if (typeof meta.scoreData?.stableford === "number") return meta.scoreData.stableford;
  const fromSort = candidate.sortKeys.stableford;
  return typeof fromSort === "number" ? fromSort : 0;
}
