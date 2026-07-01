/** Pure golf live-score transform (leaderboard + scorecard → persisted scoreData shape). */

export interface GolfFormattedHoles {
  round: number;
  par: number[];
  scores: (number | null)[];
  stableford: (number | null)[];
  total: number;
}

export interface GolfRoundScoreUpdate {
  holes: GolfFormattedHoles;
  total: number;
  ratio: number;
  icon: string;
}

export interface GolfParticipantScoreUpdate {
  leaderboardPosition: string | null;
  leaderboardTotal: string | null;
  cut: number | null;
  bonus: number | null;
  stableford: number | null;
  total: number | null;
  r1: GolfRoundScoreUpdate | null;
  r2: GolfRoundScoreUpdate | null;
  r3: GolfRoundScoreUpdate | null;
  r4: GolfRoundScoreUpdate | null;
  rCurrent: GolfRoundScoreUpdate | null;
}

export interface GolfLeaderboardRowInput {
  scoringData?: {
    position?: string;
    total?: string | number;
  } | null;
}

export interface GolfScorecardHoleInput {
  par: number | string;
  score?: string | null;
}

export interface GolfScorecardNineInput {
  holes: GolfScorecardHoleInput[];
}

export interface GolfScorecardRoundInput {
  roundNumber: number | string;
  firstNine: GolfScorecardNineInput | null;
  secondNine: GolfScorecardNineInput | null;
  total?: number;
}

export interface GolfScorecardInput {
  roundScores?: GolfScorecardRoundInput[];
}

export interface GolfRoundIconConfig {
  minRatioForIcon?: number;
  flamePercentile?: number;
  snowPercentile?: number;
}

const DEFAULT_MIN_RATIO_FOR_ICON = 0.1675;
const DEFAULT_FLAME_PERCENTILE = 0.1;
const DEFAULT_SNOW_PERCENTILE = 0.1;

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

function parsePar(par: number | string): number {
  return typeof par === "string" ? parseInt(par, 10) : par;
}

export function formatHolesFromRoundScores(
  roundScores: GolfScorecardRoundInput[],
  roundNumber: number,
): GolfFormattedHoles | null {
  const round = roundScores.find((r) => Number(r.roundNumber) === roundNumber);
  if (!round?.firstNine?.holes || !round?.secondNine?.holes) return null;
  const allHoles = [...round.firstNine.holes, ...round.secondNine.holes];
  const total = typeof round.total === "number" ? round.total : 0;
  return {
    round: roundNumber,
    par: allHoles.map((h) => parsePar(h.par)),
    scores: allHoles.map((h) => (h.score === "-" || !h.score ? null : parseInt(h.score, 10))),
    stableford: allHoles.map((h) =>
      calculateStableford(parsePar(h.par), h.score ?? "-"),
    ),
    total,
  };
}

function roundTotalFromHoles(holes: GolfFormattedHoles): number {
  return holes.stableford.reduce<number>((acc, val) => acc + (val ?? 0), 0);
}

function holesRemainingRatio(holes: GolfFormattedHoles, position?: string): number {
  if (position === "WD") return 1;
  const played = holes.stableford.filter((s) => s !== null).length;
  return holes.stableford.length > 0 ? played / holes.stableford.length : 0;
}

function calcPointsPerHole(round: GolfRoundScoreUpdate): number {
  return round.ratio > 0 ? round.total / round.ratio / 18 : 0;
}

function getPercentileCutoff(
  direction: "top" | "bottom",
  percent: number,
  values: number[],
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

function buildRoundUpdate(
  roundNumber: number,
  holes: GolfFormattedHoles | null,
  position?: string,
): GolfRoundScoreUpdate {
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
    ratio: holesRemainingRatio(holes, position),
    icon: "",
  };
}

export function positionBonus(position: string): number {
  if (position === "1" || position === "T1") return 10;
  if (position === "2" || position === "T2") return 5;
  if (position === "3" || position === "T3") return 3;
  return 0;
}

export function cutBonus(position: string, cutHasBeenMade: boolean): number {
  const losePointPositions = ["CUT", "WD"] as const;
  const valid = !losePointPositions.includes(position as (typeof losePointPositions)[number]);
  return cutHasBeenMade && valid ? 3 : 0;
}

/**
 * Combines leaderboard row + scorecard into the scoreData shape persisted on EventParticipant.
 */
export function transformGolfParticipantScores(
  leaderboardRow: GolfLeaderboardRowInput,
  scorecardRaw: GolfScorecardInput | null,
  allLeaderboardPlayers: GolfLeaderboardRowInput[],
  currentPeriod: number,
): GolfParticipantScoreUpdate | null {
  const position = leaderboardRow.scoringData?.position ?? "";
  const cutHasBeenMade = allLeaderboardPlayers.some((p) => p.scoringData?.position === "CUT");

  const leaderboardTotalRaw = leaderboardRow.scoringData?.total;
  const leaderboardTotal =
    leaderboardTotalRaw === undefined || leaderboardTotalRaw === null
      ? null
      : String(leaderboardTotalRaw);

  const update: GolfParticipantScoreUpdate = {
    leaderboardPosition: position || null,
    leaderboardTotal,
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

  const roundScores = scorecardRaw?.roundScores;
  if (!roundScores?.length) {
    update.total = (update.cut ?? 0) + (update.bonus ?? 0);
    return update;
  }

  const R1 = buildRoundUpdate(1, formatHolesFromRoundScores(roundScores, 1), position);
  const R2 = buildRoundUpdate(2, formatHolesFromRoundScores(roundScores, 2), position);
  const R3 = buildRoundUpdate(3, formatHolesFromRoundScores(roundScores, 3), position);
  const R4 = buildRoundUpdate(4, formatHolesFromRoundScores(roundScores, 4), position);
  update.r1 = R1;
  update.r2 = R2;
  update.r3 = R3;
  update.r4 = R4;
  const roundMap: Record<number, GolfRoundScoreUpdate> = { 1: R1, 2: R2, 3: R3, 4: R4 };
  const roundNum = Math.min(4, Math.max(1, Math.round(currentPeriod)));
  update.rCurrent = roundMap[roundNum] ?? null;

  const stablefordTotal = R1.total + R2.total + R3.total + R4.total;
  update.stableford = stablefordTotal;
  update.total = (update.cut ?? 0) + (update.bonus ?? 0) + stablefordTotal;

  return update;
}

/** Sets rCurrent.icon using percentile-based cutoffs (top = fire, bottom = snow). */
export function applyGolfRoundIcons(
  payloads: GolfParticipantScoreUpdate[],
  config: GolfRoundIconConfig = {},
): void {
  const minRatio = config.minRatioForIcon ?? DEFAULT_MIN_RATIO_FOR_ICON;
  const flamePercentile = config.flamePercentile ?? DEFAULT_FLAME_PERCENTILE;
  const snowPercentile = config.snowPercentile ?? DEFAULT_SNOW_PERCENTILE;

  const valueArray = payloads
    .filter((p) => p.leaderboardPosition !== "CUT")
    .filter((p) => p.rCurrent && p.rCurrent.ratio > minRatio)
    .map((p) => calcPointsPerHole(p.rCurrent!));

  if (valueArray.length === 0) return;

  const flameCutoff = getPercentileCutoff("top", flamePercentile, valueArray);
  const snowCutoff = getPercentileCutoff("bottom", snowPercentile, valueArray);

  for (const payload of payloads) {
    const wasCut = payload.leaderboardPosition === "CUT";
    const rCur = payload.rCurrent;
    const tooEarly = !rCur || rCur.ratio <= minRatio;
    if (wasCut || tooEarly) continue;

    const pph = calcPointsPerHole(rCur);
    if (pph > flameCutoff) rCur.icon = "🔥";
    else if (pph < snowCutoff) rCur.icon = "❄️";
    else rCur.icon = "";
  }
}
