import {
  adjustPickScore,
  defaultPayoutVector,
  normalizePopularityRules,
  type PopularityRules,
} from "@cut/sport-sdk";
import { rankGolfEntries } from "./ranking.js";
import { remainingCapacity, DEFAULT_MAX_PTS_PER_HOLE } from "./remainingCapacity.js";

export interface DecisiveCandidateEntry {
  entryId: string;
  prediction: unknown | null;
  createdAt: Date;
  eventParticipantIds: string[];
}

export interface DecisiveCandidateParticipant {
  eventParticipantId: string;
  displayName: string;
  scoreData: unknown;
  /** Live external pick total `e_i` (`EventParticipant.total`). */
  total: number;
}

export interface AnalyzeDecisiveCandidatesOptions {
  maxPtsPerHole?: number;
  /** Override contention slack (points below paid cut). */
  slackOverride?: number;
  /** Floor for derived slack. Default 8. */
  minSlack?: number;
  /** Cap for derived slack. Default unlimited. */
  maxSlack?: number;
}

export interface AnalyzeDecisiveCandidatesInput {
  contestId: string;
  eventId: string;
  currentPeriod?: number | null;
  entries: DecisiveCandidateEntry[];
  participants: DecisiveCandidateParticipant[];
  /** Sport `ScoringRules.popularity` (weight 0 = raw sum). */
  popularity?: PopularityRules | null;
  /**
   * Frozen contest pick rates `o(i)` keyed by eventParticipantId.
   * Used when `popularity.weight ≠ 0`. Missing rates are treated as 0.
   */
  pickRates?: Record<string, number> | null;
  options?: AnalyzeDecisiveCandidatesOptions;
}

export interface ContentionSummary {
  entryIds: string[];
  slackUsed: number;
  leaderScore: number;
  cutScore: number;
  paidCount: number;
}

export interface DecisiveAffectsEntry {
  entryId: string;
  positionNow: number;
  owns: boolean;
}

export interface DecisiveCandidateRow {
  eventParticipantId: string;
  displayName: string;
  ownership: string;
  ownersCount: number;
  contentionSize: number;
  holesLeft: number;
  maxRemaining: number;
  minSwingToFlip: number | null;
  flipShare: number;
  affects: DecisiveAffectsEntry[];
}

export interface ConsensusCandidateRow {
  eventParticipantId: string;
  displayName: string;
  ownership: string;
  reason: string;
}

export interface DecisiveCandidatesReport {
  contestId: string;
  eventId: string;
  period: number | null;
  paidCount: number;
  /** Effective popularity weight used for scoring. */
  popularityWeight: number;
  contention: ContentionSummary;
  decisive: DecisiveCandidateRow[];
  consensus: ConsensusCandidateRow[];
  notes: string[];
}

interface ScoredEntry {
  entryId: string;
  score: number;
  prediction: unknown | null;
  createdAt: Date;
  eventParticipantIds: string[];
}

const DEFAULT_MIN_SLACK = 8;

function paidSetKey(entryIds: string[]): string {
  return [...entryIds].sort().join(",");
}

/** Contest lineup finalScore from live pick totals + popularity. */
export function scoreLineupFromTotals(
  eventParticipantIds: readonly string[],
  totalsById: Map<string, number>,
  pickRates: Record<string, number> | null | undefined,
  popularity: PopularityRules | null | undefined,
): number {
  const rules = normalizePopularityRules(popularity);
  let sum = 0;
  for (const epId of eventParticipantIds) {
    const e = totalsById.get(epId) ?? 0;
    const o = pickRates?.[epId] ?? 0;
    sum += adjustPickScore(e, o, rules).adjustedScore;
  }
  return sum;
}

function scoreEntries(
  entries: DecisiveCandidateEntry[],
  totalsById: Map<string, number>,
  pickRates: Record<string, number> | null | undefined,
  popularity: PopularityRules | null | undefined,
): ScoredEntry[] {
  return entries.map((e) => ({
    ...e,
    score: scoreLineupFromTotals(
      e.eventParticipantIds,
      totalsById,
      pickRates,
      popularity,
    ),
  }));
}

function buildContentionSet(
  entries: ScoredEntry[],
  paidCount: number,
  participantCapacity: Map<string, number>,
  options: AnalyzeDecisiveCandidatesOptions,
): { contention: ScoredEntry[]; slackUsed: number; leaderScore: number; cutScore: number } {
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const leaderScore = sorted[0]?.score ?? 0;
  const cutIndex = Math.min(paidCount, sorted.length) - 1;
  const cutScore = sorted[Math.max(0, cutIndex)]?.score ?? 0;

  const topBand = sorted.slice(0, Math.max(paidCount, 1));
  const topBandPickIds = new Set(topBand.flatMap((e) => e.eventParticipantIds));
  let derivedSlack = 0;
  for (const id of topBandPickIds) {
    derivedSlack = Math.max(derivedSlack, participantCapacity.get(id) ?? 0);
  }

  const minSlack = options.minSlack ?? DEFAULT_MIN_SLACK;
  let slackUsed =
    options.slackOverride ?? Math.max(minSlack, derivedSlack);
  if (options.maxSlack != null) {
    slackUsed = Math.min(slackUsed, options.maxSlack);
  }

  const threshold = cutScore - slackUsed;
  const contention = sorted.filter((e) => e.score >= threshold);

  return { contention, slackUsed, leaderScore, cutScore };
}

/**
 * Identify golf contest candidates whose remaining scores can still change
 * winner / paid-set outcomes among lineups still in contention.
 *
 * Lineup scores are recomputed from live `EventParticipant.total` values run
 * through the same popularity adjustment as contest scoring (when weight ≠ 0).
 * Remaining-point sweeps add *R* to that player’s external total, then re-score.
 */
export function analyzeDecisiveCandidates(
  input: AnalyzeDecisiveCandidatesInput,
): DecisiveCandidatesReport {
  const notes: string[] = [];
  const options = input.options ?? {};
  const maxPtsPerHole = options.maxPtsPerHole ?? DEFAULT_MAX_PTS_PER_HOLE;
  const period = input.currentPeriod ?? null;
  const popularityRules = normalizePopularityRules(input.popularity);
  const pickRates = input.pickRates ?? null;

  const entries = input.entries.filter((e) => e.entryId);
  const paidCount = Math.max(1, defaultPayoutVector(entries.length).length);

  if (period != null && period < 4) {
    notes.push(
      `currentPeriod=${period}; sensitivity is most informative in R4 when remaining capacity is small.`,
    );
  }

  if (popularityRules.weight !== 0) {
    notes.push(
      `popularity.weight=${popularityRules.weight} (${popularityRules.mode}); remaining sweeps re-score through popularity adjustment.`,
    );
    if (!pickRates || Object.keys(pickRates).length === 0) {
      notes.push(
        "No pickRates provided while popularity.weight ≠ 0; pick rates default to 0 (max contrarian bonus for positive weight).",
      );
    }
  }

  const participantById = new Map(
    input.participants.map((p) => [p.eventParticipantId, p]),
  );

  const totalsById = new Map<string, number>();
  const participantCapacity = new Map<string, number>();
  const participantHolesLeft = new Map<string, number>();
  for (const p of input.participants) {
    totalsById.set(p.eventParticipantId, p.total);
    const cap = remainingCapacity(p.scoreData, {
      maxPtsPerHole,
      currentPeriod: period,
    });
    participantCapacity.set(p.eventParticipantId, cap.maxRemaining);
    participantHolesLeft.set(p.eventParticipantId, cap.holesLeft);
  }

  if (entries.length === 0) {
    return {
      contestId: input.contestId,
      eventId: input.eventId,
      period,
      paidCount,
      popularityWeight: popularityRules.weight,
      contention: {
        entryIds: [],
        slackUsed: 0,
        leaderScore: 0,
        cutScore: 0,
        paidCount,
      },
      decisive: [],
      consensus: [],
      notes: [...notes, "No contest entries to analyze."],
    };
  }

  const scored = scoreEntries(entries, totalsById, pickRates, input.popularity);

  const { contention, slackUsed, leaderScore, cutScore } = buildContentionSet(
    scored,
    paidCount,
    participantCapacity,
    options,
  );

  const contentionSize = contention.length;
  const positionNowByEntryId = new Map(
    rankGolfEntries(
      contention.map((e) => ({
        entryId: e.entryId,
        score: e.score,
        prediction: e.prediction,
        createdAt: e.createdAt,
      })),
    ).map((r) => [r.entryId, r.position]),
  );

  const ownersByParticipant = new Map<string, Set<string>>();
  for (const entry of contention) {
    for (const pid of entry.eventParticipantIds) {
      let owners = ownersByParticipant.get(pid);
      if (!owners) {
        owners = new Set();
        ownersByParticipant.set(pid, owners);
      }
      owners.add(entry.entryId);
    }
  }

  const consensus: ConsensusCandidateRow[] = [];
  const differentiators: string[] = [];

  for (const [pid, owners] of ownersByParticipant) {
    const ownersCount = owners.size;
    if (ownersCount === contentionSize && contentionSize > 0) {
      const p = participantById.get(pid);
      consensus.push({
        eventParticipantId: pid,
        displayName: p?.displayName ?? pid,
        ownership: `${ownersCount}/${contentionSize}`,
        reason: "owned by all contention lineups",
      });
    } else if (ownersCount > 0 && ownersCount < contentionSize) {
      differentiators.push(pid);
    }
  }

  const decisive: DecisiveCandidateRow[] = [];

  for (const pid of differentiators) {
    const owners = ownersByParticipant.get(pid)!;
    const maxRemaining = participantCapacity.get(pid) ?? 0;
    const holesLeft = participantHolesLeft.get(pid) ?? 0;
    const p = participantById.get(pid);

    const baselineRanked = rankGolfEntries(
      contention.map((e) => ({
        entryId: e.entryId,
        score: e.score,
        prediction: e.prediction,
        createdAt: e.createdAt,
      })),
    );
    const baselineWinner = baselineRanked[0]?.entryId ?? null;
    const baselinePaid = paidSetKey(
      baselineRanked.slice(0, paidCount).map((r) => r.entryId),
    );

    let flips = 0;
    let minSwingToFlip: number | null = null;
    const sweepMax = Math.max(0, maxRemaining);

    for (let R = 0; R <= sweepMax; R++) {
      const totalsWithR = new Map(totalsById);
      totalsWithR.set(pid, (totalsWithR.get(pid) ?? 0) + R);

      const ranked = rankGolfEntries(
        contention.map((e) => ({
          entryId: e.entryId,
          score: scoreLineupFromTotals(
            e.eventParticipantIds,
            totalsWithR,
            pickRates,
            input.popularity,
          ),
          prediction: e.prediction,
          createdAt: e.createdAt,
        })),
      );
      const winner = ranked[0]?.entryId ?? null;
      const paid = paidSetKey(ranked.slice(0, paidCount).map((r) => r.entryId));
      const changed = winner !== baselineWinner || paid !== baselinePaid;
      if (changed) {
        flips += 1;
        if (R > 0 && minSwingToFlip === null) {
          minSwingToFlip = R;
        }
      }
    }

    const steps = sweepMax + 1;
    const flipShare = steps > 0 ? flips / steps : 0;

    decisive.push({
      eventParticipantId: pid,
      displayName: p?.displayName ?? pid,
      ownership: `${owners.size}/${contentionSize}`,
      ownersCount: owners.size,
      contentionSize,
      holesLeft,
      maxRemaining,
      minSwingToFlip,
      flipShare,
      affects: contention.map((e) => ({
        entryId: e.entryId,
        positionNow: positionNowByEntryId.get(e.entryId) ?? 0,
        owns: owners.has(e.entryId),
      })),
    });
  }

  decisive.sort((a, b) => {
    if (b.flipShare !== a.flipShare) return b.flipShare - a.flipShare;
    const aSwing = a.minSwingToFlip ?? Number.POSITIVE_INFINITY;
    const bSwing = b.minSwingToFlip ?? Number.POSITIVE_INFINITY;
    if (aSwing !== bSwing) return aSwing - bSwing;
    return a.displayName.localeCompare(b.displayName);
  });

  if (decisive.every((d) => d.maxRemaining === 0) && decisive.length > 0) {
    notes.push(
      "All differentiators are finished (maxRemaining=0); report is structural ownership only.",
    );
  }

  return {
    contestId: input.contestId,
    eventId: input.eventId,
    period,
    paidCount,
    popularityWeight: popularityRules.weight,
    contention: {
      entryIds: contention.map((e) => e.entryId),
      slackUsed,
      leaderScore,
      cutScore,
      paidCount,
    },
    decisive,
    consensus,
    notes,
  };
}
