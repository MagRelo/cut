import type { GolfParticipantMetadata } from "@cut/sport-pga-golf";

type PickWithParticipant = {
  eventParticipant: {
    total: number | null;
    participant: {
      metadata: unknown;
    };
  };
};

function parseParticipantLastName(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const record = metadata as GolfParticipantMetadata;
  return typeof record.lastName === "string" && record.lastName.length > 0
    ? record.lastName
    : null;
}

export function sortedPlayerLastNamesFromPicks(picks: PickWithParticipant[]): string[] {
  return [...picks]
    .sort(
      (a, b) => (b.eventParticipant.total ?? 0) - (a.eventParticipant.total ?? 0),
    )
    .map((pick) => parseParticipantLastName(pick.eventParticipant.participant.metadata))
    .filter((name): name is string => Boolean(name));
}
