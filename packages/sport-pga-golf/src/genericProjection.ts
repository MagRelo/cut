export interface GenericHoleOutcome {
  par: number;
  stableford: number;
  strokesToPar: number;
}

export interface GenericScoringModel {
  byPar: Record<string, GenericHoleOutcome[]>;
  all: GenericHoleOutcome[];
  sampleCount: number;
}

export interface RemainingRoundPlan {
  round: number;
  pars: number[];
}

export interface SampledGolfOutcome {
  stableford: number;
  strokesToPar: number;
}

const FALLBACK_WEIGHTS: Array<[stableford: number, strokesToPar: number, weight: number]> = [
  [-3, 2, 18],
  [-1, 1, 155],
  [0, 0, 624],
  [2, -1, 198],
  [5, -2, 5],
  [10, -2, 1],
  [15, -3, 1],
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function roundHoles(scoreData: unknown, round: number): Record<string, unknown> | null {
  const data = asRecord(scoreData);
  const roundData = asRecord(data?.[`r${round}`]);
  return asRecord(roundData?.holes);
}

function fallbackOutcomes(): GenericHoleOutcome[] {
  const outcomes: GenericHoleOutcome[] = [];
  for (const par of [3, 4, 5]) {
    for (const [stableford, strokesToPar, weight] of FALLBACK_WEIGHTS) {
      for (let i = 0; i < weight; i++) {
        outcomes.push({ par, stableford, strokesToPar });
      }
    }
  }
  return outcomes;
}

export function extractGenericHoleOutcomes(
  scoreDataRows: readonly unknown[],
): GenericHoleOutcome[] {
  const outcomes: GenericHoleOutcome[] = [];
  for (const scoreData of scoreDataRows) {
    for (let round = 1; round <= 4; round++) {
      const holes = roundHoles(scoreData, round);
      const pars = Array.isArray(holes?.par) ? holes.par : [];
      const scores = Array.isArray(holes?.scores) ? holes.scores : [];
      const stableford = Array.isArray(holes?.stableford) ? holes.stableford : [];
      const length = Math.min(pars.length, scores.length, stableford.length);
      for (let i = 0; i < length; i++) {
        const par = pars[i];
        const score = scores[i];
        const points = stableford[i];
        if (
          typeof par === "number" &&
          typeof score === "number" &&
          typeof points === "number" &&
          Number.isFinite(par) &&
          Number.isFinite(score) &&
          Number.isFinite(points)
        ) {
          outcomes.push({
            par,
            stableford: points,
            strokesToPar: score - par,
          });
        }
      }
    }
  }
  return outcomes;
}

export function buildGenericScoringModel(
  outcomes: readonly GenericHoleOutcome[],
): GenericScoringModel {
  const source = outcomes.length > 0 ? [...outcomes] : fallbackOutcomes();
  const byPar: Record<string, GenericHoleOutcome[]> = {};
  for (const outcome of source) {
    const key = String(outcome.par);
    (byPar[key] ??= []).push(outcome);
  }
  return {
    byPar,
    all: source,
    sampleCount: outcomes.length,
  };
}

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleGenericHole(
  par: number,
  model: GenericScoringModel,
  random: () => number,
): GenericHoleOutcome {
  const pool = model.byPar[String(par)] ?? model.all;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]!;
}

/**
 * Returns unplayed holes in the current round plus all scheduled future rounds.
 * A prior round supplies the course par template when future scorecards are empty.
 */
export function remainingRoundPlan(
  scoreData: unknown,
  currentPeriod: number | null | undefined,
): RemainingRoundPlan[] {
  const data = asRecord(scoreData);
  const position =
    typeof data?.leaderboardPosition === "string"
      ? data.leaderboardPosition.toUpperCase()
      : "";
  if (position === "CUT" || position === "WD") return [];
  if (
    typeof currentPeriod !== "number" ||
    currentPeriod < 1 ||
    currentPeriod > 4
  ) {
    return [];
  }

  let template: number[] = [];
  for (let round = 1; round <= 4; round++) {
    const holes = roundHoles(scoreData, round);
    const pars = Array.isArray(holes?.par)
      ? holes.par.filter((par): par is number => typeof par === "number")
      : [];
    if (pars.length >= 18) {
      template = pars.slice(0, 18);
      break;
    }
  }
  if (template.length === 0) {
    template = [4, 4, 3, 4, 5, 4, 3, 4, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4];
  }

  const plans: RemainingRoundPlan[] = [];
  for (let round = Math.round(currentPeriod); round <= 4; round++) {
    const holes = roundHoles(scoreData, round);
    const pars = Array.isArray(holes?.par) ? holes.par : template;
    const stableford = Array.isArray(holes?.stableford)
      ? holes.stableford
      : Array(pars.length).fill(null);
    const remainingPars: number[] = [];
    for (let i = 0; i < Math.max(pars.length, template.length); i++) {
      const par =
        typeof pars[i] === "number" ? (pars[i] as number) : template[i] ?? 4;
      if (stableford[i] === null || stableford[i] === undefined) {
        remainingPars.push(par);
      }
    }
    if (remainingPars.length > 0) {
      plans.push({ round, pars: remainingPars });
    }
  }
  return plans;
}

export function sampleRoundPlan(
  plans: readonly RemainingRoundPlan[],
  model: GenericScoringModel,
  random: () => number,
): Map<number, SampledGolfOutcome> {
  const sampled = new Map<number, SampledGolfOutcome>();
  for (const plan of plans) {
    let stableford = 0;
    let strokesToPar = 0;
    for (const par of plan.pars) {
      const outcome = sampleGenericHole(par, model, random);
      stableford += outcome.stableford;
      strokesToPar += outcome.strokesToPar;
    }
    sampled.set(plan.round, { stableford, strokesToPar });
  }
  return sampled;
}

export function quantile(values: readonly number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, (sorted.length - 1) * percentile),
  );
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return Math.round(sorted[lower]! + (sorted[upper]! - sorted[lower]!) * weight);
}
