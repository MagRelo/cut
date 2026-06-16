import type { Prisma } from "@prisma/client";

export const lineupDetailInclude = {
  picks: {
    orderBy: { slotIndex: "asc" },
    include: {
      eventParticipant: {
        include: {
          participant: true,
        },
      },
    },
  },
} satisfies Prisma.LineupInclude;

export type LineupWithPicks = Prisma.LineupGetPayload<{
  include: typeof lineupDetailInclude;
}>;

export function formatLineupResponse(lineup: LineupWithPicks) {
  const picks = lineup.picks.map((pick) => ({
    id: pick.id,
    slotIndex: pick.slotIndex,
    eventParticipantId: pick.eventParticipantId,
    participant: pick.eventParticipant.participant
      ? {
          id: pick.eventParticipant.participant.id,
          displayName: pick.eventParticipant.participant.displayName,
          externalId: pick.eventParticipant.participant.externalId,
          metadata: pick.eventParticipant.participant.metadata,
        }
      : null,
    scoreData: pick.eventParticipant.scoreData,
    total: pick.eventParticipant.total,
  }));

  const score = picks.reduce((sum, pick) => sum + (pick.total ?? 0), 0);

  return {
    id: lineup.id,
    eventId: lineup.eventId,
    name: lineup.name,
    prediction: lineup.prediction,
    picks,
    score,
    createdAt: lineup.createdAt,
    updatedAt: lineup.updatedAt,
  };
}
