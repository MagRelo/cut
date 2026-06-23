import type { Candidate } from "@cut/sport-sdk";
import type { GolfParticipantMetadata, GolfScoreData } from "./metadata.js";
import { buildGolfSortKeys } from "./golfSortKeys.js";

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

function parseParticipantMetadata(metadata: unknown): GolfParticipantMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata as GolfParticipantMetadata;
}

function parseScoreData(scoreData: unknown): GolfScoreData {
  if (!scoreData || typeof scoreData !== "object" || Array.isArray(scoreData)) {
    return {};
  }
  return scoreData as GolfScoreData;
}

export function buildGolfCandidates(rows: EventParticipantRow[]): Candidate[] {
  return rows.map((row) => {
    const participantMeta = parseParticipantMetadata(row.participant.metadata);
    const scoreData = parseScoreData(row.scoreData);
    const displayName =
      row.participant.displayName ??
      participantMeta.displayName ??
      participantMeta.shortName ??
      "Unknown";

    return {
      eventParticipantId: row.id,
      participantId: row.participantId,
      displayName,
      sortKeys: buildGolfSortKeys({
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
