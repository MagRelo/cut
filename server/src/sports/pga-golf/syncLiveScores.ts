import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { fetchLeaderboardRaw } from "../../lib/pgaLeaderboard.js";
import { fetchScorecardRaw } from "../../lib/pgaScorecard.js";
import {
  applyGolfRoundIcons,
  golfShouldSyncLiveScores,
  parseGolfEventMetadata,
  PGA_GOLF_SPORT_ID,
  transformGolfParticipantScores,
  type GolfParticipantScoreUpdate,
  type GolfRoundIconConfig,
} from "@cut/sport-pga-golf";
import type { ScorecardData } from "../../schemas/scorecard.js";

const CONCURRENCY = 15;
const SCORECARD_TIMEOUT_MS = 15_000;

function roundIconConfigFromEnv(): GolfRoundIconConfig {
  const flame = parseFloat(process.env.ICON_FLAME_PERCENTILE ?? "");
  const snow = parseFloat(process.env.ICON_SNOW_PERCENTILE ?? "");
  const config: GolfRoundIconConfig = {};
  if (Number.isFinite(flame)) config.flamePercentile = flame;
  if (Number.isFinite(snow)) config.snowPercentile = snow;
  return config;
}

async function fetchScorecardWithTimeout(
  playerId: string,
  tournamentId: string,
): Promise<ScorecardData | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SCORECARD_TIMEOUT_MS);
  try {
    return await fetchScorecardRaw(playerId, tournamentId, controller.signal);
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function scoreDataFromPayload(
  existing: unknown,
  payload: GolfParticipantScoreUpdate,
): Record<string, unknown> {
  const prior =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};

  return {
    ...prior,
    leaderboardPosition: payload.leaderboardPosition,
    leaderboardTotal: payload.leaderboardTotal,
    cut: payload.cut,
    bonus: payload.bonus,
    stableford: payload.stableford,
    r1: payload.r1,
    r2: payload.r2,
    r3: payload.r3,
    r4: payload.r4,
    rCurrent: payload.rCurrent,
  };
}

interface PendingUpdate {
  eventParticipantId: string;
  existingScoreData: unknown;
  payload: GolfParticipantScoreUpdate;
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

  const golfMeta = parseGolfEventMetadata(event.metadata);
  const pgaTourId = event.externalId || golfMeta?.pgaTourId;
  if (!pgaTourId) {
    throw new Error(`Golf event ${eventId} has no PGA Tour external id`);
  }

  const currentRound = golfMeta?.currentRound ?? 1;
  const rawLeaderboard = await fetchLeaderboardRaw();
  const byPgaId = new Map(
    rawLeaderboard.players
      .filter((row) => row.player?.id)
      .map((row) => [row.player!.id, row]),
  );

  const eventParticipants = await prisma.eventParticipant.findMany({
    where: { eventId: event.id },
    include: { participant: true },
  });

  const pending: PendingUpdate[] = [];

  for (let i = 0; i < eventParticipants.length; i += CONCURRENCY) {
    const chunk = eventParticipants.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map(async (eventParticipant) => {
        const playerPgaId = eventParticipant.participant.externalId;
        if (!playerPgaId) {
          return null;
        }

        const leaderboardRow = byPgaId.get(playerPgaId);
        if (!leaderboardRow) {
          return null;
        }

        const scorecardRaw = await fetchScorecardWithTimeout(playerPgaId, pgaTourId);
        if (!scorecardRaw) {
          console.warn(
            `[pga-golf] Failed to fetch scorecard for PGA id ${playerPgaId}, skipping update`,
          );
          return null;
        }

        const payload = transformGolfParticipantScores(
          leaderboardRow,
          scorecardRaw,
          rawLeaderboard.players,
          currentRound,
        );
        if (!payload) {
          return null;
        }

        return {
          eventParticipantId: eventParticipant.id,
          existingScoreData: eventParticipant.scoreData,
          payload,
        };
      }),
    );

    for (const result of chunkResults) {
      if (result) pending.push(result);
    }
  }

  applyGolfRoundIcons(
    pending.map((entry) => entry.payload),
    roundIconConfigFromEnv(),
  );

  for (const { eventParticipantId, existingScoreData, payload } of pending) {
    await prisma.eventParticipant.update({
      where: { id: eventParticipantId },
      data: {
        total: payload.total,
        scoreData: scoreDataFromPayload(
          existingScoreData,
          payload,
        ) as Prisma.InputJsonValue,
      },
    });
  }

  console.log(`[pga-golf] Synced live scores for ${pending.length} participants on ${eventId}`);
}
