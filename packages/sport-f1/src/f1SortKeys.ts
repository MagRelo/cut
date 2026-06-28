import type { F1ParticipantMetadata, F1ScoreData } from "./metadata.js";

export const F1_MISSING_RANK = 9999;

function parseParticipantMetadata(metadata: unknown): F1ParticipantMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata as F1ParticipantMetadata;
}

function parseScoreData(scoreData: unknown): F1ScoreData {
  if (!scoreData || typeof scoreData !== "object" || Array.isArray(scoreData)) {
    return {};
  }
  return scoreData as F1ScoreData;
}

function numericRank(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : F1_MISSING_RANK;
}

export function f1CandidateHasDisplayName(candidate: {
  displayName: string;
  metadata: unknown;
}): boolean {
  return Boolean(candidate.displayName.trim());
}

export function buildF1SortKeys(input: {
  displayName: string;
  participantMetadata: unknown;
  scoreData: unknown;
  total: number | null;
}): Record<string, number | string> {
  const participantMeta = parseParticipantMetadata(input.participantMetadata);
  const scoreData = parseScoreData(input.scoreData);
  const driverName = input.displayName.trim().toLowerCase();
  const constructor = (participantMeta.teamName ?? "").trim().toLowerCase();
  const championship = numericRank(participantMeta.championshipPosition);
  const gridPosition = numericRank(participantMeta.gridPosition);
  const racePosition = numericRank(scoreData.position);
  const points = input.total ?? 0;

  return {
    championship,
    gridPosition,
    constructor,
    driverName,
    racePosition,
    points: -points,
  };
}
