import type { Candidate } from "@cut/sport-sdk";
import type { GolfParticipantMetadata, GolfScoreData } from "./metadata.js";

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

    const owgrRank = participantMeta.owgr ? Number(participantMeta.owgr) : Number.NaN;
    const dgRank =
      participantMeta.dataGolf &&
      typeof participantMeta.dataGolf === "object" &&
      !Array.isArray(participantMeta.dataGolf) &&
      typeof (participantMeta.dataGolf as Record<string, unknown>).dg_rank === "number"
        ? ((participantMeta.dataGolf as Record<string, unknown>).dg_rank as number)
        : Number.NaN;

    return {
      eventParticipantId: row.id,
      participantId: row.participantId,
      displayName,
      sortKeys: {
        owgr: Number.isFinite(owgrRank) ? owgrRank : 9999,
        dataGolf: Number.isFinite(dgRank) ? dgRank : 9999,
        stableford: row.total ?? scoreData.stableford ?? 0,
        name: displayName.toLowerCase(),
      },
      metadata: {
        externalId: row.participant.externalId,
        participant: participantMeta,
        scoreData,
        total: row.total,
      },
    };
  });
}
