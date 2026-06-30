import { parseGolfEventMetadata } from "@cut/sport-pga-golf";
import { prisma } from "../lib/prisma.js";
import { requireSportModule } from "../sports/registry.js";
import { lineupPicksInclude } from "../utils/prismaIncludes.js";
import { getActiveEvents } from "./events/getActiveEvents.js";

export async function updateContestLineupsForEvent(
  eventId: string,
  sportId: string,
): Promise<void> {
  const module = requireSportModule(sportId);

  const contestLineups = await prisma.contestLineup.findMany({
    where: {
      contest: { eventId },
    },
    include: {
      contest: {
        select: { id: true },
      },
      lineup: {
        include: lineupPicksInclude,
      },
    },
  });

  if (contestLineups.length === 0) {
    return;
  }

  for (const contestLineup of contestLineups) {
    const eventParticipantIds = contestLineup.lineup.picks.map(
      (pick) => pick.eventParticipantId,
    );
    const totalScore = await module.aggregateLineupScore(eventId, eventParticipantIds);
    contestLineup.score = totalScore;
    await prisma.contestLineup.update({
      where: { id: contestLineup.id },
      data: { score: totalScore },
    });
  }

  const contestLineupsByContest = contestLineups.reduce(
    (acc, lineup) => {
      const contestId = lineup.contestId;
      if (!acc[contestId]) {
        acc[contestId] = [];
      }
      acc[contestId].push(lineup);
      return acc;
    },
    {} as Record<string, typeof contestLineups>,
  );

  for (const lineups of Object.values(contestLineupsByContest)) {
    const ranked = module.rankEntries(
      lineups
        .filter((lineup) => lineup.entryId)
        .map((lineup) => ({
          entryId: lineup.entryId!,
          score: lineup.score,
          prediction: lineup.lineup.prediction,
          createdAt: lineup.createdAt,
        })),
    );
    const positionByEntryId = new Map(ranked.map((row) => [row.entryId, row.position]));

    await Promise.all(
      lineups.map((lineup) => {
        const position = lineup.entryId
          ? (positionByEntryId.get(lineup.entryId) ?? 999)
          : 999;
        lineup.position = position;
        return prisma.contestLineup.update({
          where: { id: lineup.id },
          data: { position },
        });
      }),
    );
  }

  const event = await prisma.competitionEvent.findUnique({
    where: { id: eventId },
    select: { metadata: true, sportId: true },
  });
  const golfMeta = parseGolfEventMetadata(event?.metadata);
  const metadataRecord =
    event?.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
      ? (event.metadata as Record<string, unknown>)
      : null;
  const currentRound =
    golfMeta?.currentRound ??
    (typeof metadataRecord?.currentRound === "number" ? metadataRecord.currentRound : 1);
  const timestamp = new Date();

  const timelineSnapshots = contestLineups.map((contestLineup) => ({
    contestLineupId: contestLineup.id,
    contestId: contestLineup.contestId,
    timestamp,
    roundNumber: currentRound,
    score: contestLineup.score ?? 0,
    position: contestLineup.position ?? 999,
    sharePrice: null,
  }));

  await prisma.contestLineupTimeline.createMany({
    data: timelineSnapshots,
  });
}

export async function updateContestLineups(): Promise<void> {
  const events = await getActiveEvents();
  for (const event of events) {
    await updateContestLineupsForEvent(event.id, event.sportId);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  updateContestLineups()
    .then(() => {
      console.log("ContestLineups update completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("ContestLineups update failed:", error);
      process.exit(1);
    });
}
