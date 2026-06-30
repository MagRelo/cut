import type { Candidate } from "@cut/sport-sdk";
import type { CommodityParticipantMetadata, CommodityScoreData } from "@cut/sport-commodities";
import { totalToDisplayScore } from "@cut/sport-commodities";

export type CommodityCandidateMetadata = {
  participant?: CommodityParticipantMetadata;
  total?: number;
  scoreData?: CommodityScoreData;
};

export function parseCommodityCandidateMetadata(candidate: Candidate): CommodityCandidateMetadata {
  if (!candidate.metadata || typeof candidate.metadata !== "object") {
    return {};
  }
  return candidate.metadata as CommodityCandidateMetadata;
}

export function candidateDisplayScore(candidate: Candidate): number {
  const meta = parseCommodityCandidateMetadata(candidate);
  if (typeof meta.total === "number") {
    return totalToDisplayScore(meta.total);
  }
  const points = candidate.sortKeys.points;
  if (typeof points === "number") {
    return totalToDisplayScore(-points);
  }
  return 0;
}

export function formatPctReturn(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatDisplayScore(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}

export function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatVolume(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export function formatCommoditiesEventStatusLabel(status: string | undefined): string {
  if (!status) return "Scheduled";
  return status.charAt(0) + status.slice(1).toLowerCase();
}
