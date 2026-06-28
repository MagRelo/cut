import type { Candidate } from "@cut/sport-sdk";
import type { F1ParticipantMetadata, F1ScoreData } from "./metadata.js";
import { buildF1SortKeys } from "./f1SortKeys.js";

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

export function buildF1Candidates(rows: EventParticipantRow[]): Candidate[] {
  return rows.map((row) => {
    const participantMeta = parseParticipantMetadata(row.participant.metadata);
    const scoreData = parseScoreData(row.scoreData);
    const displayName = row.participant.displayName ?? "Unknown";

    return {
      eventParticipantId: row.id,
      participantId: row.participantId,
      displayName,
      sortKeys: buildF1SortKeys({
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
