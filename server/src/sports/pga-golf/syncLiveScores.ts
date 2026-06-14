import { prisma } from "../../lib/prisma.js";
import { fetchLeaderboardRaw } from "../../lib/pgaLeaderboard.js";
import { golfShouldSyncLiveScores, PGA_GOLF_SPORT_ID } from "@cut/sport-pga-golf";
import type { PlayerRowV3 } from "../../schemas/leaderboard.js";

function stablefordFromLeaderboardRow(row: PlayerRowV3): number {
  const scoringTotal = row.scoringData?.total;
  if (typeof scoringTotal === "number" && Number.isFinite(scoringTotal)) {
    return scoringTotal;
  }
  return 0;
}

export async function syncGolfLiveScores(eventId: string) {
  const event = await prisma.competitionEvent.findFirst({
    where: { id: eventId, sportId: PGA_GOLF_SPORT_ID },
  });

  if (!event) {
    throw new Error(`Golf event not found: ${eventId}`);
  }

  if (!golfShouldSyncLiveScores(event.metadata)) {
    console.log(`[pga-golf] Skipping live score sync for ${eventId} (event not live)`);
    return;
  }

  const rawLeaderboard = await fetchLeaderboardRaw();
  const byPgaId = new Map<string, PlayerRowV3>();
  for (const row of rawLeaderboard.players) {
    if (row.player?.id) {
      byPgaId.set(row.player.id, row);
    }
  }

  const eventParticipants = await prisma.eventParticipant.findMany({
    where: { eventId: event.id },
    include: { participant: true },
  });

  for (const eventParticipant of eventParticipants) {
    const pgaTourId = eventParticipant.participant.externalId;
    if (!pgaTourId) {
      continue;
    }

    const row = byPgaId.get(pgaTourId);
    if (!row) {
      continue;
    }

    const stableford = stablefordFromLeaderboardRow(row);
    const scoreData = {
      ...(typeof eventParticipant.scoreData === "object" && eventParticipant.scoreData
        ? eventParticipant.scoreData
        : {}),
      leaderboardPosition: row.scoringData?.position ?? null,
      leaderboardTotal: row.scoringData?.total ?? null,
      stableford,
    };

    await prisma.eventParticipant.update({
      where: { id: eventParticipant.id },
      data: {
        total: stableford,
        scoreData,
      },
    });
  }
}
