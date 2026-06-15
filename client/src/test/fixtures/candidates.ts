import type { Candidate } from "@cut/sport-sdk";
import type { PlatformLineupPick } from "../../types/event";

export const FIXTURE_PARTICIPANT_IDS = {
  scheffler: "participant-scheffler",
  mcilroy: "participant-mcilroy",
  rahm: "participant-rahm",
  schauffele: "participant-schauffele",
} as const;

function buildCandidate(
  participantId: string,
  displayName: string,
  lastName: string,
  firstName: string,
  eventParticipantId: string,
  stableford: number,
  position: string,
  total: string,
): Candidate {
  return {
    eventParticipantId,
    participantId,
    displayName,
    sortKeys: {
      stableford,
      name: displayName.toLowerCase(),
      owgr: 9999,
      dataGolf: 9999,
    },
    metadata: {
      externalId: `pga-${participantId}`,
      participant: {
        firstName,
        lastName,
        country: "USA",
        imageUrl: null,
      },
      total: stableford,
      scoreData: {
        leaderboardPosition: position,
        leaderboardTotal: total,
        stableford,
      },
    },
  };
}

export const FIXTURE_CANDIDATES: Candidate[] = [
  buildCandidate(
    FIXTURE_PARTICIPANT_IDS.scheffler,
    "Scottie Scheffler",
    "Scheffler",
    "Scottie",
    "ep-scheffler",
    12,
    "T3",
    "-8",
  ),
  buildCandidate(
    FIXTURE_PARTICIPANT_IDS.mcilroy,
    "Rory McIlroy",
    "McIlroy",
    "Rory",
    "ep-mcilroy",
    10,
    "T5",
    "-6",
  ),
  buildCandidate(
    FIXTURE_PARTICIPANT_IDS.rahm,
    "Jon Rahm",
    "Rahm",
    "Jon",
    "ep-rahm",
    8,
    "T8",
    "-4",
  ),
  buildCandidate(
    FIXTURE_PARTICIPANT_IDS.schauffele,
    "Xander Schauffele",
    "Schauffele",
    "Xander",
    "ep-schauffele",
    6,
    "T12",
    "-2",
  ),
];

export function buildFixtureLineupPick(
  slotIndex: number,
  candidate: Candidate,
): PlatformLineupPick {
  const meta = candidate.metadata as Record<string, unknown>;
  return {
    id: `pick-${candidate.participantId}`,
    slotIndex,
    eventParticipantId: candidate.eventParticipantId,
    participant: {
      id: candidate.participantId,
      displayName: candidate.displayName,
      externalId: typeof meta.externalId === "string" ? meta.externalId : null,
      metadata: meta.participant ?? null,
    },
    scoreData: meta.scoreData ?? null,
    total: typeof meta.total === "number" ? meta.total : null,
  };
}

export function buildFixturePlatformLineup(
  id: string,
  name: string,
  picks: PlatformLineupPick[],
) {
  return {
    id,
    eventId: "tournament-1",
    name,
    prediction: null,
    picks,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
