// Service runs periodically to keep tournament player scores up to date.
// All bonuses, icons, and player transform live in transformTournamentPlayer() in this file.

import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { fetchScorecardRaw } from "../lib/pgaScorecard.js";
import { fetchLeaderboardRaw } from "../lib/pgaLeaderboard.js";
import type { PlayerRowV3 } from "../schemas/leaderboard.js";
import type { ScorecardData, RoundScore, FormattedHoles } from "../schemas/scorecard.js";

const CONCURRENCY = 15;
const SCORECARD_TIMEOUT_MS = 15_000;
/** Minimum holes-played ratio for round icon eligibility (~3 holes). */
const MIN_RATIO_FOR_ICON = 0.1675;

function parsePercentFromEnv(key: string, defaultVal: number): number {
  const raw = process.env[key];
  if (raw == null || raw === "") return defaultVal;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : defaultVal;
}

/** Top percentile for flame icon (e.g. 0.1 = top 10%). Env: ICON_FLAME_PERCENTILE. */
const ICON_FLAME_PERCENTILE = parsePercentFromEnv("ICON_FLAME_PERCENTILE", 0.1);
/** Bottom percentile for snow icon (e.g. 0.1 = bottom 10%). Env: ICON_SNOW_PERCENTILE. */
const ICON_SNOW_PERCENTILE = parsePercentFromEnv("ICON_SNOW_PERCENTILE", 0.1);

// ---- Types ----

export interface TournamentPlayerUpdate {
  leaderboardPosition: string | null;
  leaderboardTotal: string | null;
  cut: number | null;
  bonus: number | null;
  /** Total Stableford points from rounds (r1–r4) only. */
  stableford: number | null;
  /** Total = cut bonus + position bonus + stableford. */
  total: number | null;
  r1: RoundUpdate | null;
  r2: RoundUpdate | null;
  r3: RoundUpdate | null;
  r4: RoundUpdate | null;
  /** Current round data (alias of r1–r4 based on tournament currentRound). */
  rCurrent: RoundUpdate | null;
}

interface RoundUpdate {
  holes: FormattedHoles;
  total: number;
  ratio: number;
  icon: string;
}

// ---- Stableford & round helpers (single place for all transform logic) ----

function calculateStableford(par: number, score: string): number | null {
  if (score === "-") return null;
  const numericScore = parseInt(score, 10);
  if (Number.isNaN(numericScore)) return null;
  if (numericScore === 1) return 10;
  const scoreDiff = numericScore - par;
  switch (scoreDiff) {
    case -4:
    case -3:
      return 15;
    case -2:
      return 5;
    case -1:
      return 2;
    case 0:
      return 0;
    case 1:
      return -1;
    default:
      return -3;
  }
}

function formatHolesFromRoundScores(
  roundScores: RoundScore[],
  roundNumber: number
): FormattedHoles | null {
  const round = roundScores.find((r) => r.roundNumber === roundNumber);
  if (!round?.firstNine?.holes || !round?.secondNine?.holes) return null;
  const allHoles = [...round.firstNine.holes, ...round.secondNine.holes];
  const total = typeof round.total === "number" ? round.total : 0;
  return {
    round: roundNumber,
    par: allHoles.map((h) => (typeof h.par === "string" ? parseInt(h.par, 10) : h.par)),
    scores: allHoles.map((h) =>
      h.score === "-" || !h.score ? null : parseInt(h.score, 10)
    ),
    stableford: allHoles.map((h) =>
      calculateStableford(
        typeof h.par === "string" ? parseInt(h.par, 10) : h.par,
        h.score ?? "-"
      )
    ),
    total,
  };
}

function roundTotalFromHoles(holes: FormattedHoles): number {
  return holes.stableford.reduce(
    (acc: number, val: number | null) => acc + (val ?? 0),
    0
  );
}

function holesRemainingRatio(holes: FormattedHoles): number {
  const played = holes.stableford.filter((s) => s !== null).length;
  return holes.stableford.length > 0 ? played / holes.stableford.length : 0;
}

/** Points per hole (PPH): projected round total per 18 holes. */
function calcPointsPerHole(round: RoundUpdate): number {
  return round.ratio > 0 ? (round.total / round.ratio) / 18 : 0;
}

function getPercentileCutoff(
  direction: "top" | "bottom",
  percent: number,
  values: number[]
): number {
  if (values.length === 0) return 0;
  const ascending = (a: number, b: number) => a - b;
  const descending = (a: number, b: number) => b - a;
  const sortFn = direction === "bottom" ? descending : ascending;
  const sorted = [...values].sort(sortFn);
  const n = sorted.length;
  const rank = (1 - percent) * (n - 1);
  const lowerI = Math.min(n - 1, Math.max(0, Math.floor(rank)));
  const upperI = Math.min(n - 1, Math.max(0, Math.ceil(rank)));
  const weight = rank - Math.floor(rank);
  const lo = sorted[lowerI]!;
  const hi = sorted[upperI]!;
  return lo + (hi - lo) * weight;
}

/**
 * Sets rCurrent.icon on each payload using percentile-based cutoffs (top 10% = fire, bottom 10% = snow).
 * Only eligible players get an icon: not CUT, and ratio > MIN_RATIO_FOR_ICON.
 */
function applyRoundIcons(
  payloads: TournamentPlayerUpdate[],
  _currentRound: number
): void {
  const valueArray = payloads
    .filter((p) => p.leaderboardPosition !== "CUT")
    .filter((p) => p.rCurrent && p.rCurrent.ratio > MIN_RATIO_FOR_ICON)
    .map((p) => calcPointsPerHole(p.rCurrent!));

  if (valueArray.length === 0) return;

  const flameCutoff = getPercentileCutoff("top", ICON_FLAME_PERCENTILE, valueArray);
  const snowCutoff = getPercentileCutoff("bottom", ICON_SNOW_PERCENTILE, valueArray);

  for (const payload of payloads) {
    const wasCut = payload.leaderboardPosition === "CUT";
    const rCur = payload.rCurrent;
    const tooEarly = !rCur || rCur.ratio <= MIN_RATIO_FOR_ICON;
    if (wasCut || tooEarly) continue;

    const pph = calcPointsPerHole(rCur);
    if (pph > flameCutoff) rCur.icon = "🔥";
    else if (pph < snowCutoff) rCur.icon = "❄️";
    else rCur.icon = "";
  }
}

function buildRoundUpdate(roundNumber: number, holes: FormattedHoles | null): RoundUpdate {
  if (!holes) {
    return {
      holes: { round: roundNumber, par: [], scores: [], stableford: [], total: 0 },
      total: 0,
      ratio: 0,
      icon: "",
    };
  }
  return {
    holes,
    total: roundTotalFromHoles(holes),
    ratio: holesRemainingRatio(holes),
    icon: "",
  };
}

// ---- Leaderboard-derived bonuses and icons ----

function positionBonus(position: string): number {
  if (position === "1" || position === "T1") return 10;
  if (position === "2" || position === "T2") return 5;
  if (position === "3" || position === "T3") return 3;
  return 0;
}

function cutBonus(position: string, cutHasBeenMade: boolean): number {
  const losePointPositions = ["CUT", "WD"] as const;
  const valid = !losePointPositions.includes(position as (typeof losePointPositions)[number]);
  return cutHasBeenMade && valid ? 3 : 0;
}

/**
 * Single place where leaderboard + scorecard are combined into the shape we persist.
 * All bonuses, icons, and Stableford logic are defined here.
 */
export function transformTournamentPlayer(
  leaderboardRow: PlayerRowV3,
  scorecardRaw: ScorecardData | null,
  allLeaderboardPlayers: PlayerRowV3[],
  currentRound: number
): TournamentPlayerUpdate | null {
  const position = leaderboardRow.scoringData.position;
  const cutHasBeenMade = allLeaderboardPlayers.some(
    (p) => p.scoringData?.position === "CUT"
  );

  const update: TournamentPlayerUpdate = {
    leaderboardPosition: position ?? null,
    leaderboardTotal: leaderboardRow.scoringData.total ?? null,
  cut: cutBonus(position, cutHasBeenMade),
  bonus: positionBonus(position),
  stableford: null,
  total: null,
  r1: null,
  r2: null,
  r3: null,
  r4: null,
  rCurrent: null,
  };

  if (!scorecardRaw?.roundScores?.length) {
    update.total = (update.cut ?? 0) + (update.bonus ?? 0);
    return update;
  }

  const R1 = buildRoundUpdate(1, formatHolesFromRoundScores(scorecardRaw.roundScores, 1));
  const R2 = buildRoundUpdate(2, formatHolesFromRoundScores(scorecardRaw.roundScores, 2));
  const R3 = buildRoundUpdate(3, formatHolesFromRoundScores(scorecardRaw.roundScores, 3));
  const R4 = buildRoundUpdate(4, formatHolesFromRoundScores(scorecardRaw.roundScores, 4));

  update.r1 = R1;
  update.r2 = R2;
  update.r3 = R3;
  update.r4 = R4;
  const stablefordTotal = R1.total + R2.total + R3.total + R4.total;
  update.stableford = stablefordTotal;
  update.total = (update.cut ?? 0) + (update.bonus ?? 0) + stablefordTotal;

  const roundMap: Record<number, RoundUpdate> = { 1: R1, 2: R2, 3: R3, 4: R4 };
  const roundNum = Math.min(4, Math.max(1, Math.round(currentRound)));
  update.rCurrent = roundMap[roundNum] ?? null;

  return update;
}

// ---- Fetch with timeout ----

async function fetchScorecardWithTimeout(
  playerId: string,
  tournamentId: string
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

// ---- Cron flow ----

interface TransformResult {
  tournamentId: string;
  playerId: string;
  payload: TournamentPlayerUpdate;
}

async function transformOnePlayer(
  tournamentPlayer: { playerId: string; player: { pga_pgaTourId: string | null } },
  currentTournament: { id: string; pgaTourId: string; currentRound: number | null },
  rawLeaderboard: { players: PlayerRowV3[] }
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
  const currentRound = currentTournament.currentRound ?? 1;
  const payload = transformTournamentPlayer(
    leaderboardRow,
    scorecardRaw,
    rawLeaderboard.players,
    currentRound
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
    rCurrent: (payload.rCurrent == null ? Prisma.JsonNull : payload.rCurrent) as unknown as Prisma.InputJsonValue,
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
  const currentRound = currentTournament.currentRound ?? 1;

  const results: TransformResult[] = [];
  for (let i = 0; i < tournamentPlayers.length; i += CONCURRENCY) {
    const chunk = tournamentPlayers.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map((tp) => transformOnePlayer(tp, currentTournament, rawLeaderboard))
    );
    for (const r of chunkResults) {
      if (r) results.push(r);
    }
  }

  const payloads = results.map((r) => r.payload);
  applyRoundIcons(payloads, currentRound);

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
