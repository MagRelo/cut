import type { Candidate } from "@cut/sport-sdk";
import type { CommodityParticipantMetadata, CommodityScoreData } from "./metadata.js";
import { buildCommoditiesSortKeys } from "./commoditiesSortKeys.js";

export type EventParticipantRow = {
  id: string;
  participantId: string;
  total: number | null;
  scoreData: unknown;
  participant: {
    displayName: string | null;
    externalId: string | null;
    metadata: unknown;
  };
};

function parseParticipantMetadata(metadata: unknown): CommodityParticipantMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata as CommodityParticipantMetadata;
}

function parseScoreData(scoreData: unknown): CommodityScoreData {
  if (!scoreData || typeof scoreData !== "object" || Array.isArray(scoreData)) {
    return {};
  }
  return scoreData as CommodityScoreData;
}

export function buildCommoditiesCandidates(rows: EventParticipantRow[]): Candidate[] {
  return rows.map((row) => {
    const participantMeta = parseParticipantMetadata(row.participant.metadata);
    const scoreData = parseScoreData(row.scoreData);
    const displayName = row.participant.displayName ?? "Unknown";

    return {
      eventParticipantId: row.id,
      participantId: row.participantId,
      displayName,
      sortKeys: buildCommoditiesSortKeys({
        displayName,
        participantMetadata: row.participant.metadata,
        scoreData: row.scoreData,
        total: row.total,
      }),
      metadata: {
        externalId: row.participant.externalId,
        participant: participantMeta,
        scoreData,
        total: row.total,
      },
    };
  });
}
