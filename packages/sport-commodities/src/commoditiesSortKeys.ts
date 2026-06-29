import type { CommodityParticipantMetadata, CommodityScoreData } from "./metadata.js";

const SECTOR_ORDER: Record<string, number> = {
  energy: 1,
  precious: 2,
  metals: 3,
  ag: 4,
  softs: 5,
};

export const COMMODITIES_MISSING_RANK = 999_999;

export function commoditiesCandidateHasDisplayName(candidate: {
  displayName?: string | null;
}): boolean {
  return Boolean(candidate.displayName?.trim());
}

export function buildCommoditiesSortKeys(input: {
  displayName: string;
  participantMetadata: unknown;
  scoreData: unknown;
  total: number | null;
}): Record<string, string | number> {
  const participant =
    input.participantMetadata && typeof input.participantMetadata === "object"
      ? (input.participantMetadata as CommodityParticipantMetadata)
      : {};
  const score =
    input.scoreData && typeof input.scoreData === "object"
      ? (input.scoreData as CommodityScoreData)
      : {};

  const sector = participant.sector ?? "softs";
  const sectorRank = SECTOR_ORDER[sector] ?? 99;
  const pctReturn = score.pctReturn ?? 0;
  const points = input.total ?? 0;

  return {
    sector: sectorRank,
    sectorName: sector,
    pctReturn: -pctReturn,
    points: -points,
    displayName: input.displayName.toLowerCase(),
  };
}
