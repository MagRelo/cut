import type { Candidate } from "./types.js";

/**
 * Platform lineup/contest pick: identity + sport live record + contest points.
 *
 * `scoreData` is the opaque sport live record (golf scorecard, F1 race
 * classification, commodities session/period scores). The platform copies
 * `EventParticipant.scoreData` through and does not inspect it.
 */
export type LineupPickView = {
  eventParticipantId: string;
  slotIndex?: number | null;
  participant: {
    id: string;
    displayName: string | null;
    metadata: unknown;
  } | null;
  scoreData: unknown;
  total: number | null;
};

/** Nested metadata shape sport `parse*CandidateMetadata` helpers already expect. */
export type CandidatePickMetadata = {
  participant: unknown;
  scoreData: unknown;
  total: number | null;
};

/**
 * Lift a lineup pick into a `Candidate` so ParticipantRow / ParticipantDetail
 * work without joining the field roster.
 */
export function candidateFromLineupPick(pick: LineupPickView): Candidate | null {
  if (!pick.participant) return null;
  const displayName = pick.participant.displayName?.trim() || "";
  const metadata: CandidatePickMetadata = {
    participant: pick.participant.metadata,
    scoreData: pick.scoreData,
    total: pick.total,
  };
  return {
    eventParticipantId: pick.eventParticipantId,
    participantId: pick.participant.id,
    displayName,
    sortKeys: {},
    metadata,
  };
}

/** Slot order; skips picks with no participant. */
export function candidatesFromLineupPicks(picks: LineupPickView[]): Candidate[] {
  return [...picks]
    .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0))
    .map(candidateFromLineupPick)
    .filter((candidate): candidate is Candidate => candidate != null);
}
