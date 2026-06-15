// Legacy tournament-player cron (pre-platform). Uses the same transform as syncGolfLiveScores.

import { Prisma } from "@prisma/client";
import {
  applyGolfRoundIcons,
  transformGolfParticipantScores,
  type GolfParticipantScoreUpdate,
  type GolfRoundIconConfig,
} from "@cut/sport-pga-golf";
import { prisma } from "../lib/prisma.js";
import { fetchScorecardRaw } from "../lib/pgaScorecard.js";
import { fetchLeaderboardRaw } from "../lib/pgaLeaderboard.js";
import type { PlayerRowV3 } from "../schemas/leaderboard.js";
import type { ScorecardData } from "../schemas/scorecard.js";

const CONCURRENCY = 15;
const SCORECARD_TIMEOUT_MS = 15_000;

export type TournamentPlayerUpdate = GolfParticipantScoreUpdate;

function roundIconConfigFromEnv(): GolfRoundIconConfig {
  const flame = parseFloat(process.env.ICON_FLAME_PERCENTILE ?? "");
  const snow = parseFloat(process.env.ICON_SNOW_PERCENTILE ?? "");
  const config: GolfRoundIconConfig = {};
  if (Number.isFinite(flame)) config.flamePercentile = flame;
  if (Number.isFinite(snow)) config.snowPercentile = snow;
  return config;
}

export const transformTournamentPlayer = transformGolfParticipantScores;

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

interface TransformResult {
  tournamentId: string;
  playerId: string;
  payload: TournamentPlayerUpdate;
}

async function transformOnePlayer(
  tournamentPlayer: { playerId: string; player: { pga_pgaTourId: string | null } },
  currentTournament: { id: string; pgaTourId: string; currentRound: number | null },
  rawLeaderboard: { players: PlayerRowV3[] },
): Promise<TransformResult | null> {
  const pgaTourId = tournamentPlayer.player.pga_pgaTourId;
  if (!pgaTourId) {
    console.warn(`[CRON] No PGA Tour ID for player ${tournamentPlayer.playerId}`);
    return null;
  }

  const leaderboardRow = rawLeaderboard.players.find((p) => p.player.id === pgaTourId);
  if (!leaderboardRow) {
    console.warn(`[CRON] No leaderboard row for PGA id ${pgaTourId}`);
    return null;
  }

  const scorecardRaw = await fetchScorecardWithTimeout(pgaTourId, currentTournament.pgaTourId);
  if (!scorecardRaw) {
    console.warn(`[CRON] Failed to fetch scorecard for PGA id ${pgaTourId}, skipping update`);
    return null;
  }

  const currentRound = currentTournament.currentRound ?? 1;
  const payload = transformGolfParticipantScores(
    leaderboardRow,
    scorecardRaw,
    rawLeaderboard.players,
    currentRound,
  );
  if (!payload) return null;

  return {
    tournamentId: currentTournament.id,
    playerId: tournamentPlayer.playerId,
    payload,
  };
}

async function persistOnePlayer(result: TransformResult): Promise<string> {
  const { tournamentId, playerId, payload } = result;
  const data = {
    cut: payload.cut,
    bonus: payload.bonus,
    leaderboardPosition: payload.leaderboardPosition,
    leaderboardTotal: payload.leaderboardTotal,
    stableford: payload.stableford,
    total: payload.total,
    r1: (payload.r1 == null ? Prisma.JsonNull : payload.r1) as unknown as Prisma.InputJsonValue,
    r2: (payload.r2 == null ? Prisma.JsonNull : payload.r2) as unknown as Prisma.InputJsonValue,
    r3: (payload.r3 == null ? Prisma.JsonNull : payload.r3) as unknown as Prisma.InputJsonValue,
    r4: (payload.r4 == null ? Prisma.JsonNull : payload.r4) as unknown as Prisma.InputJsonValue,
    rCurrent: (payload.rCurrent == null
      ? Prisma.JsonNull
      : payload.rCurrent) as unknown as Prisma.InputJsonValue,
  };
  await prisma.tournamentPlayer.update({
    where: {
      tournamentId_playerId: { tournamentId, playerId },
    },
    data,
  });
  return playerId;
}

export async function updateTournamentPlayerScores() {
  const currentTournament = await prisma.tournament.findFirst({
    where: { manualActive: true },
  });
  if (!currentTournament) {
    console.error("[CRON] No current tournament found");
    return;
  }

  const tournamentPlayers = await prisma.tournamentPlayer.findMany({
    where: { tournamentId: currentTournament.id },
    include: { player: true },
  });

  const rawLeaderboard = await fetchLeaderboardRaw();

  const results: TransformResult[] = [];
  for (let i = 0; i < tournamentPlayers.length; i += CONCURRENCY) {
    const chunk = tournamentPlayers.slice(i, i + CONCURRENCY);
    type TournamentPlayerItem = Parameters<typeof transformOnePlayer>[0];
    const chunkResults = await Promise.all(
      chunk.map((tp: TournamentPlayerItem) =>
        transformOnePlayer(tp, currentTournament, rawLeaderboard),
      ),
    );
    for (const r of chunkResults) {
      if (r) results.push(r);
    }
  }

  applyGolfRoundIcons(
    results.map((r) => r.payload),
    roundIconConfigFromEnv(),
  );

  for (const result of results) {
    await persistOnePlayer(result);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  updateTournamentPlayerScores()
    .then(() => {
      console.log("Tournament player scores update completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Tournament player scores update failed:", error);
      process.exit(1);
    });
}
