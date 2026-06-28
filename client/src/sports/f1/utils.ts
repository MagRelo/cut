import type { Candidate } from "@cut/sport-sdk";
import type { F1ParticipantMetadata, F1ScoreData } from "@cut/sport-f1";

export type F1CandidateMetadata = {
  participant?: F1ParticipantMetadata;
  total?: number;
  scoreData?: F1ScoreData;
};

export type F1EventMetadataView = {
  name?: string;
  f1?: {
    season?: number;
    round?: number;
    raceName?: string;
    circuitId?: string;
    raceStart?: string;
    classificationComplete?: boolean;
  };
};

export function parseF1CandidateMetadata(candidate: Candidate): F1CandidateMetadata {
  if (!candidate.metadata || typeof candidate.metadata !== "object") {
    return {};
  }
  return candidate.metadata as F1CandidateMetadata;
}

export function parseF1EventMetadataView(metadata: unknown): F1EventMetadataView {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata as F1EventMetadataView;
}

export function formatTeamColor(colour: string | null | undefined): string | null {
  if (!colour?.trim()) return null;
  const c = colour.trim();
  return c.startsWith("#") ? c : `#${c}`;
}

export function formatOrdinal(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const n = Math.round(value);
  if (n <= 0) return "—";
  const j = n % 10;
  const k = n % 100;
  const suffix =
    j === 1 && k !== 11 ? "st" : j === 2 && k !== 12 ? "nd" : j === 3 && k !== 13 ? "rd" : "th";
  return `${n}${suffix}`;
}

export function formatDriverStatus(status: F1ScoreData["status"] | undefined): string {
  switch (status) {
    case "running":
      return "Running";
    case "finished":
      return "Finished";
    case "dnf":
      return "DNF";
    case "dns":
      return "DNS";
    case "dsq":
      return "DSQ";
    default:
      return "—";
  }
}

export function candidatePoints(candidate: Candidate): number {
  const meta = parseF1CandidateMetadata(candidate);
  if (typeof meta.total === "number") return meta.total;
  const points = candidate.sortKeys.points;
  if (typeof points === "number") return -points;
  return 0;
}

export function formatF1EventStatusLabel(status: string | undefined): string {
  if (!status) return "Scheduled";
  return status.charAt(0) + status.slice(1).toLowerCase();
}
