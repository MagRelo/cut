import type {
  ContestCommentaryContext,
  ContestCommentaryLineup,
  ContestCommentaryStageId,
} from "./contestCommentary.js";
import {
  holeSeverity,
  isRareOutsizeHole,
  listNewOutsizeHoles,
  readScoreDataBoardState,
  type ContestFeedCompletedHole,
  type ContestFeedHoleState,
  type ContestFeedPlayerHoleState,
} from "./contestFeedHoles.js";

export type {
  ContestFeedCompletedHole,
  ContestFeedHoleLabel,
  ContestFeedHoleState,
  ContestFeedPlayerHoleState,
} from "./contestFeedHoles.js";
export {
  buildContestFeedHoleState,
  holeKey,
  holeSeverity,
  isOutsizeHole,
  isRareOutsizeHole,
  labelHoleOutcome,
  listCompletedHoles,
  listNewCompletedHoles,
  listNewOutsizeHoles,
  readScoreDataBoardState,
} from "./contestFeedHoles.js";

/** Max stories generated in a single feed pass. */
export const CONTEST_FEED_MAX_PER_PASS = 2;

/** Default subject cooldown for score_swing (ms). */
export const CONTEST_FEED_RECAP_COOLDOWN_MS = 20 * 60 * 1000;

/** Silence before emitting tournament_pulse when nothing else fires (ms). */
export const CONTEST_FEED_PULSE_GAP_MS = 60 * 60 * 1000;

/** Ranking priority for tournament_pulse (below swings / stage_recap). */
export const CONTEST_FEED_PULSE_PRIORITY = 40;

/** Max rows in a tournament_pulse board snapshot. */
export const CONTEST_FEED_TOURNAMENT_BOARD_CAP = 8;

/** Max hole events bundled into one score_swing story. */
export const CONTEST_FEED_SCORE_SWING_EVENT_CAP = 3;

/**
 * Plain birdies (non-rare outsize holes) only emit when an owning lineup
 * moves at least this many contest places, or crosses the paid cut.
 */
export const CONTEST_FEED_PLAIN_BIRDIE_MIN_POSITION_DELTA = 4;

/** Cap for race-impact contribution to score_swing priority. */
const SCORE_SWING_IMPACT_PRIORITY_CAP = 15;

export type ContestFeedStoryType =
  | "race_shakeup"
  | "score_swing"
  | "leverage_spike"
  | "shared_risk"
  | "route_narrowing"
  | "cut_tension"
  | "stage_recap"
  | "tournament_pulse"
  | "milestone";

/** Story types implemented in the classifier pass. */
export const CONTEST_FEED_ACTIVE_STORY_TYPES = [
  "score_swing",
  "stage_recap",
  "tournament_pulse",
] as const satisfies readonly ContestFeedStoryType[];

export type ContestFeedActiveStoryType = (typeof CONTEST_FEED_ACTIVE_STORY_TYPES)[number];

/** Copy length/tone tier for a classified story. */
export type ContestFeedStoryIntensity = "routine" | "notable" | "major";

export interface ContestFeedItemSubjects {
  entryIds?: string[];
  participantIds?: string[];
}

export interface ContestFeedItem {
  id: string;
  storyType: ContestFeedStoryType;
  priority: number;
  subjects: ContestFeedItemSubjects;
  text: string;
  generatedAt: string;
  /** Tournament round (period) the comment applies to, when known. */
  round?: number | null;
}

export interface ContestCommentaryFeedDocument {
  schemaVersion: 1;
  /** Newest items first; full tournament history. */
  items: ContestFeedItem[];
  /** Analysis snapshot used for next-pass deltas / cooldowns. */
  lastContext?: ContestCommentaryContext;
  /** Completed-hole fingerprint for contest-owned golfers (score_swing deltas). */
  lastHoleState?: ContestFeedHoleState;
  /** ISO timestamp of the last successful feed write. */
  updatedAt?: string;
}

/** Contest-owned golfer with scorecard + ownership for event-first stories. */
export interface ContestFeedContestPlayer {
  eventParticipantId: string;
  displayName: string;
  scoreData: unknown;
  ownerEntryIds: string[];
  ownerNames: string[];
}

export interface ContestFeedStoryCandidate {
  storyType: ContestFeedActiveStoryType;
  priority: number;
  intensity: ContestFeedStoryIntensity;
  subjects: ContestFeedItemSubjects;
  /** Stable key for cooldown / dedupe within a story type. */
  subjectKey: string;
  reason: string;
}

export interface ContestFeedRacePositionChange {
  entryId: string;
  displayName: string;
  previousPosition: number;
  currentPosition: number;
  previousScore: number;
  currentScore: number;
  /** True when the entry crossed into or out of paid places. */
  crossedPaidCut: boolean;
  positionDelta: number;
}

export type ContestFeedScoreSwingCause = "self" | "field";

export type ContestFeedScoreSwingEvent =
  | {
      kind: "hole";
      /** Set when bonusDelta is non-zero: the golfer's own hole moved the board. */
      cause?: ContestFeedScoreSwingCause;
      eventParticipantId: string;
      displayName: string;
      round: number;
      hole: number;
      par: number;
      strokes: number;
      strokesToPar: number;
      stableford: number;
      label: ContestFeedCompletedHole["label"];
      ownerEntryIds: string[];
      ownerNames: string[];
      previousLeaderboardPosition: string | null;
      leaderboardPosition: string | null;
      previousBonus: number | null;
      bonus: number;
      bonusDelta: number;
    }
  | {
      kind: "bonus_only";
      /** Field reshuffled the board with no new outsize hole from this golfer. */
      cause: "field";
      eventParticipantId: string;
      displayName: string;
      ownerEntryIds: string[];
      ownerNames: string[];
      previousLeaderboardPosition: string | null;
      leaderboardPosition: string | null;
      previousBonus: number | null;
      bonus: number;
      bonusDelta: number;
    };

export interface ContestFeedDelta {
  racePositionChanges: ContestFeedRacePositionChange[];
  stageChanged: boolean;
  previousStageId: ContestCommentaryStageId | null;
  currentStageId: ContestCommentaryStageId;
  hasPreviousContext: boolean;
}

export interface ClassifyContestFeedStoriesOptions {
  /** Existing feed items used for cooldown / dedupe. */
  existingItems?: readonly ContestFeedItem[];
  /** Wall clock for subject cooldowns (defaults to Date.now). */
  nowMs?: number;
  /** Override score_swing subject cooldown; default CONTEST_FEED_RECAP_COOLDOWN_MS. */
  recapCooldownMs?: number;
  /** Override tournament_pulse silence gap; default CONTEST_FEED_PULSE_GAP_MS. */
  pulseGapMs?: number;
  /**
   * Golf period actively in progress (or playoff). Required for tournament_pulse.
   * Detect passes this from event metadata; default false.
   */
  periodInProgress?: boolean;
  /** Max candidates returned after ranking; default CONTEST_FEED_MAX_PER_PASS. */
  maxPerPass?: number;
  /** Minimum absolute position move for birdie impact gating. */
  minPositionDelta?: number;
  /** Contest-owned golfers with live scorecards. */
  contestPlayers?: readonly ContestFeedContestPlayer[];
  /** Prior hole fingerprint from the feed document. */
  previousHoleState?: ContestFeedHoleState | null;
}

export interface BuildContestFeedFactPackOptions {
  contestPlayers?: readonly ContestFeedContestPlayer[];
  previousHoleState?: ContestFeedHoleState | null;
  minPositionDelta?: number;
}

export interface ContestFeedWordLimits {
  minWords: number;
  maxWords: number;
}

/** Notable-tier limits (default / backward-compatible export). */
export const CONTEST_FEED_WORD_LIMITS: Record<ContestFeedActiveStoryType, ContestFeedWordLimits> = {
  score_swing: { minWords: 45, maxWords: 75 },
  stage_recap: { minWords: 125, maxWords: 175 },
  tournament_pulse: { minWords: 40, maxWords: 70 },
};

const CONTEST_FEED_WORD_LIMITS_BY_INTENSITY: Record<
  ContestFeedActiveStoryType,
  Record<ContestFeedStoryIntensity, ContestFeedWordLimits>
> = {
  score_swing: {
    routine: { minWords: 25, maxWords: 45 },
    notable: { minWords: 45, maxWords: 75 },
    major: { minWords: 70, maxWords: 110 },
  },
  stage_recap: {
    routine: { minWords: 110, maxWords: 150 },
    notable: { minWords: 125, maxWords: 175 },
    major: { minWords: 150, maxWords: 200 },
  },
  tournament_pulse: {
    routine: { minWords: 40, maxWords: 70 },
    notable: { minWords: 40, maxWords: 70 },
    major: { minWords: 50, maxWords: 90 },
  },
};

/** Resolve word band from story type + intensity. */
export function resolveContestFeedWordLimits(
  storyType: ContestFeedActiveStoryType,
  intensity: ContestFeedStoryIntensity = "notable",
): ContestFeedWordLimits {
  return CONTEST_FEED_WORD_LIMITS_BY_INTENSITY[storyType][intensity];
}

/** Map score_swing priority to intensity. */
export function scoreSwingIntensityFromPriority(priority: number): ContestFeedStoryIntensity {
  if (priority < 95) return "routine";
  if (priority < 105) return "notable";
  return "major";
}

export interface ContestFeedTournamentBoardRow {
  eventParticipantId: string;
  displayName: string;
  leaderboardPosition: string | null;
  /** Strokes to par display from scoreData (e.g. "-8", "E"). */
  leaderboardTotal: string | null;
}

export type ContestFeedFactPack =
  | {
      storyType: "score_swing";
      stageId: ContestCommentaryStageId;
      period: number | null;
      paidCount: number;
      events: ContestFeedScoreSwingEvent[];
      impacts: ContestFeedRacePositionChange[];
    }
  | {
      storyType: "stage_recap";
      context: ContestCommentaryContext;
    }
  | {
      storyType: "tournament_pulse";
      stageId: ContestCommentaryStageId;
      period: number | null;
      eventProgress: ContestCommentaryContext["eventProgress"];
      tournamentBoard: ContestFeedTournamentBoardRow[];
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((entry): entry is string => typeof entry === "string");
  return items.length > 0 ? items : undefined;
}

function parseFeedItem(value: unknown): ContestFeedItem | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || !value.id.trim()) return null;
  if (typeof value.storyType !== "string" || !value.storyType.trim()) return null;
  if (typeof value.text !== "string") return null;
  if (typeof value.generatedAt !== "string") return null;
  if (typeof value.priority !== "number" || !Number.isFinite(value.priority)) {
    return null;
  }
  const subjects = isRecord(value.subjects) ? value.subjects : {};
  const item: ContestFeedItem = {
    id: value.id,
    storyType: value.storyType as ContestFeedStoryType,
    priority: value.priority,
    subjects: {
      ...(asStringArray(subjects.entryIds) ? { entryIds: asStringArray(subjects.entryIds) } : {}),
      ...(asStringArray(subjects.participantIds)
        ? { participantIds: asStringArray(subjects.participantIds) }
        : {}),
    },
    text: value.text,
    generatedAt: value.generatedAt,
  };
  if (value.round === null) {
    item.round = null;
  } else if (typeof value.round === "number" && Number.isFinite(value.round)) {
    item.round = value.round;
  }
  return item;
}

function parsePlayerHoleState(value: Record<string, unknown>): ContestFeedPlayerHoleState | null {
  if (typeof value.displayName !== "string") return null;
  const keys = asStringArray(value.completedKeys);
  if (!keys) return null;
  const state: ContestFeedPlayerHoleState = {
    displayName: value.displayName,
    completedKeys: keys,
  };
  if ("leaderboardPosition" in value) {
    state.leaderboardPosition =
      value.leaderboardPosition === null
        ? null
        : typeof value.leaderboardPosition === "string"
          ? value.leaderboardPosition.trim() || null
          : null;
  }
  if ("bonus" in value) {
    state.bonus = typeof value.bonus === "number" && Number.isFinite(value.bonus) ? value.bonus : 0;
  }
  return state;
}

function parseHoleState(raw: unknown): ContestFeedHoleState | undefined {
  if (!isRecord(raw)) return undefined;
  const state: ContestFeedHoleState = {};
  for (const [participantId, value] of Object.entries(raw)) {
    if (!participantId.trim() || !isRecord(value)) continue;
    const playerState = parsePlayerHoleState(value);
    if (!playerState) continue;
    state[participantId] = playerState;
  }
  return Object.keys(state).length > 0 ? state : undefined;
}

/** Empty feed document. */
export function emptyContestCommentaryFeedDocument(
  updatedAt?: string,
): ContestCommentaryFeedDocument {
  return {
    schemaVersion: 1,
    items: [],
    ...(updatedAt ? { updatedAt } : {}),
  };
}

/**
 * Normalize unknown DB / API JSON into a feed document.
 * Plain strings are ignored (legacy lives on Contest.commentary).
 */
export function parseContestCommentaryFeedDocument(raw: unknown): ContestCommentaryFeedDocument {
  if (!isRecord(raw)) return emptyContestCommentaryFeedDocument();
  const items = Array.isArray(raw.items)
    ? raw.items.map(parseFeedItem).filter((item): item is ContestFeedItem => item != null)
    : [];
  const document: ContestCommentaryFeedDocument = {
    schemaVersion: 1,
    items,
  };
  if (raw.lastContext != null && isRecord(raw.lastContext)) {
    document.lastContext = raw.lastContext as unknown as ContestCommentaryContext;
  }
  const holeState = parseHoleState(raw.lastHoleState);
  if (holeState) document.lastHoleState = holeState;
  if (typeof raw.updatedAt === "string" && raw.updatedAt.trim()) {
    document.updatedAt = raw.updatedAt;
  }
  return document;
}

function lineupByEntryId(context: ContestCommentaryContext): Map<string, ContestCommentaryLineup> {
  return new Map(context.contentionLineups.map((lineup) => [lineup.entryId, lineup]));
}

/**
 * Deterministic deltas between consecutive commentary analysis snapshots.
 */
export function computeContestFeedDelta(
  previous: ContestCommentaryContext | null | undefined,
  current: ContestCommentaryContext,
): ContestFeedDelta {
  const currentStageId = current.eventProgress.stageId;
  if (previous == null) {
    return {
      racePositionChanges: [],
      stageChanged: false,
      previousStageId: null,
      currentStageId,
      hasPreviousContext: false,
    };
  }

  const paidCount = current.paidCount;
  const prevLineups = lineupByEntryId(previous);
  const racePositionChanges: ContestFeedRacePositionChange[] = [];
  for (const lineup of current.contentionLineups) {
    const prior = prevLineups.get(lineup.entryId);
    if (!prior) continue;
    const positionDelta = prior.positionNow - lineup.positionNow;
    if (positionDelta === 0 && prior.scoreNow === lineup.scoreNow) continue;
    const wasPaid = prior.positionNow <= paidCount;
    const isPaid = lineup.positionNow <= paidCount;
    racePositionChanges.push({
      entryId: lineup.entryId,
      displayName: lineup.displayName,
      previousPosition: prior.positionNow,
      currentPosition: lineup.positionNow,
      previousScore: prior.scoreNow,
      currentScore: lineup.scoreNow,
      crossedPaidCut: wasPaid !== isPaid,
      positionDelta,
    });
  }

  return {
    racePositionChanges,
    stageChanged: previous.eventProgress.stageId !== currentStageId,
    previousStageId: previous.eventProgress.stageId,
    currentStageId,
    hasPreviousContext: true,
  };
}

/**
 * Feed item id: unique per generation timestamp so each pass appends a new
 * post instead of overwriting an earlier one for the same subject. Stable for
 * a given (story, subject, generatedAt) so retries of one pass stay idempotent.
 */
export function buildContestFeedItemId(
  storyType: ContestFeedStoryType,
  subjectKey: string,
  generatedAt: string,
): string {
  const generated = Date.parse(generatedAt);
  const stamp = Number.isFinite(generated) ? String(generated) : "unknown";
  return `${storyType}:${subjectKey}:${stamp}`;
}

function recentStoryKeys(
  items: readonly ContestFeedItem[],
  storyType: ContestFeedStoryType,
  cooldownMs: number,
  nowMs: number,
): Set<string> {
  const keys = new Set<string>();
  for (const item of items) {
    if (item.storyType !== storyType) continue;
    const generated = Date.parse(item.generatedAt);
    if (!Number.isFinite(generated)) continue;
    if (nowMs - generated > cooldownMs) continue;
    const subjectKey =
      [...(item.subjects.entryIds ?? []), ...(item.subjects.participantIds ?? [])]
        .sort()
        .join(",") || "all";
    keys.add(subjectKey);
    // Also treat whole-story cooldown for stage_recap.
    if (storyType === "stage_recap") keys.add("recap");
  }
  return keys;
}

function sortCandidates(candidates: ContestFeedStoryCandidate[]): ContestFeedStoryCandidate[] {
  return [...candidates].sort((left, right) => {
    if (right.priority !== left.priority) return right.priority - left.priority;
    return left.storyType.localeCompare(right.storyType);
  });
}

function materialRaceChanges(
  delta: ContestFeedDelta,
  minPositionDelta: number,
): ContestFeedRacePositionChange[] {
  return delta.racePositionChanges.filter(
    (change) => change.crossedPaidCut || Math.abs(change.positionDelta) >= minPositionDelta,
  );
}

function impactByEntryId(
  impacts: readonly ContestFeedRacePositionChange[],
): Map<string, ContestFeedRacePositionChange> {
  return new Map(impacts.map((impact) => [impact.entryId, impact]));
}

/** Plain birdies need a 4+ place move or paid-cut cross — not a cosmetic tick. */
function ownerHasPlainBirdieImpact(
  ownerEntryIds: readonly string[],
  impacts: Map<string, ContestFeedRacePositionChange>,
  minPositionDelta: number = CONTEST_FEED_PLAIN_BIRDIE_MIN_POSITION_DELTA,
): boolean {
  return ownerEntryIds.some((entryId) => {
    const impact = impacts.get(entryId);
    if (!impact) return false;
    return impact.crossedPaidCut || Math.abs(impact.positionDelta) >= minPositionDelta;
  });
}

function impactScoreForOwners(
  ownerEntryIds: readonly string[],
  impacts: Map<string, ContestFeedRacePositionChange>,
): number {
  let score = 0;
  for (const entryId of ownerEntryIds) {
    const impact = impacts.get(entryId);
    if (!impact) continue;
    score += Math.abs(impact.positionDelta) * 5;
    if (impact.crossedPaidCut) score += 10;
  }
  return score;
}

interface RankedScoreSwing {
  event: ContestFeedScoreSwingEvent;
  severity: number;
  impactScore: number;
  rank: number;
}

/** Bonus change weight for score_swing event ranking. */
const SCORE_SWING_BONUS_DELTA_RANK = 15;

function boardDeltaFromPrior(
  prior: ContestFeedPlayerHoleState,
  scoreData: unknown,
): Pick<
  ContestFeedScoreSwingEvent,
  "previousLeaderboardPosition" | "leaderboardPosition" | "previousBonus" | "bonus" | "bonusDelta"
> {
  const current = readScoreDataBoardState(scoreData);
  const hasPriorBoard = typeof prior.bonus === "number";
  const previousBonus = hasPriorBoard ? prior.bonus! : null;
  const previousLeaderboardPosition = hasPriorBoard ? (prior.leaderboardPosition ?? null) : null;
  return {
    previousLeaderboardPosition,
    leaderboardPosition: current.leaderboardPosition,
    previousBonus,
    bonus: current.bonus,
    bonusDelta: previousBonus != null ? current.bonus - previousBonus : 0,
  };
}

function bonusOnlySeverity(bonusDelta: number): number {
  return Math.min(20, Math.abs(bonusDelta) * 2);
}

function compareScoreSwingEvents(
  left: ContestFeedScoreSwingEvent,
  right: ContestFeedScoreSwingEvent,
): number {
  if (left.kind === "hole" && right.kind === "hole") {
    if (left.round !== right.round) return left.round - right.round;
    if (left.hole !== right.hole) return left.hole - right.hole;
  } else if (left.kind !== right.kind) {
    return left.kind === "hole" ? -1 : 1;
  }
  return left.eventParticipantId.localeCompare(right.eventParticipantId);
}

/**
 * Event-first score swings: new outsize holes on contest-owned golfers,
 * gated so plain birdies require a material contest race impact (4+ places
 * or paid-cut cross); plus bonus-only board moves when the field reshuffles
 * podium place without a new outsize hole from that golfer.
 */
export function collectScoreSwingEvents(
  contestPlayers: readonly ContestFeedContestPlayer[],
  previousHoleState: ContestFeedHoleState | null | undefined,
  raceImpacts: readonly ContestFeedRacePositionChange[],
): ContestFeedScoreSwingEvent[] {
  if (previousHoleState == null) return [];
  const impacts = impactByEntryId(raceImpacts);
  const ranked: RankedScoreSwing[] = [];
  const holeParticipantIds = new Set<string>();

  for (const player of contestPlayers) {
    const prior = previousHoleState[player.eventParticipantId];
    if (prior == null) continue;
    const board = boardDeltaFromPrior(prior, player.scoreData);
    const holes = listNewOutsizeHoles(player.scoreData, prior);
    for (const hole of holes) {
      const rare = isRareOutsizeHole(hole);
      // Rare holes always qualify when owned; plain birdies need a material race move.
      if (!rare && !ownerHasPlainBirdieImpact(player.ownerEntryIds, impacts)) {
        continue;
      }
      holeParticipantIds.add(player.eventParticipantId);
      const event: ContestFeedScoreSwingEvent = {
        kind: "hole",
        ...(Math.abs(board.bonusDelta) > 0 ? { cause: "self" as const } : {}),
        eventParticipantId: player.eventParticipantId,
        displayName: player.displayName,
        round: hole.round,
        hole: hole.hole,
        par: hole.par,
        strokes: hole.strokes,
        strokesToPar: hole.strokesToPar,
        stableford: hole.stableford,
        label: hole.label,
        ownerEntryIds: [...player.ownerEntryIds],
        ownerNames: [...player.ownerNames],
        ...board,
      };
      const severity = holeSeverity(hole);
      const impactScore = impactScoreForOwners(player.ownerEntryIds, impacts);
      const bonusRank = Math.abs(board.bonusDelta) > 0 ? SCORE_SWING_BONUS_DELTA_RANK : 0;
      ranked.push({
        event,
        severity,
        impactScore,
        rank: severity + impactScore + bonusRank,
      });
    }
  }

  for (const player of contestPlayers) {
    if (holeParticipantIds.has(player.eventParticipantId)) continue;
    const prior = previousHoleState[player.eventParticipantId];
    if (prior == null) continue;
    const board = boardDeltaFromPrior(prior, player.scoreData);
    if (Math.abs(board.bonusDelta) === 0) continue;
    const event: ContestFeedScoreSwingEvent = {
      kind: "bonus_only",
      cause: "field",
      eventParticipantId: player.eventParticipantId,
      displayName: player.displayName,
      ownerEntryIds: [...player.ownerEntryIds],
      ownerNames: [...player.ownerNames],
      ...board,
    };
    const severity = bonusOnlySeverity(board.bonusDelta);
    const impactScore = impactScoreForOwners(player.ownerEntryIds, impacts);
    ranked.push({
      event,
      severity,
      impactScore,
      rank: severity + impactScore + SCORE_SWING_BONUS_DELTA_RANK,
    });
  }

  ranked.sort((left, right) => {
    if (right.rank !== left.rank) return right.rank - left.rank;
    return compareScoreSwingEvents(left.event, right.event);
  });

  return ranked.slice(0, CONTEST_FEED_SCORE_SWING_EVENT_CAP).map((row) => row.event);
}

function scoreSwingPriority(
  events: readonly ContestFeedScoreSwingEvent[],
  raceImpacts: readonly ContestFeedRacePositionChange[] = [],
): number {
  if (events.length === 0) return 0;
  const top = events[0]!;
  const eventCountBump = Math.min(10, events.length * 2);
  const impacts = impactByEntryId(raceImpacts);
  const impactBump = Math.min(
    SCORE_SWING_IMPACT_PRIORITY_CAP,
    impactScoreForOwners(top.ownerEntryIds, impacts),
  );
  if (top.kind === "bonus_only") {
    const abs = Math.abs(top.bonusDelta);
    const severity = bonusOnlySeverity(top.bonusDelta);
    const bonusBump = abs >= 5 ? 15 : 8;
    return 80 + severity + eventCountBump + bonusBump + impactBump;
  }
  const severity = holeSeverity(top);
  const absBonus = Math.abs(top.bonusDelta);
  const bonusBump = absBonus >= 5 ? 10 : absBonus > 0 ? 5 : 0;
  return 80 + Math.min(20, severity) + eventCountBump + bonusBump + impactBump;
}

function scoreSwingReason(events: readonly ContestFeedScoreSwingEvent[]): string {
  const top = events[0]!;
  if (top.kind === "bonus_only") {
    return `${events.length} board/bonus swing(s); top: ${top.displayName} bonus ${top.previousBonus}→${top.bonus}.`;
  }
  return `${events.length} outsize hole result(s); top: ${top.displayName} ${top.label} on ${top.round}:${top.hole}.`;
}

function scoreDataLeaderboardTotal(scoreData: unknown): string | null {
  if (!isRecord(scoreData)) return null;
  const value = scoreData.leaderboardTotal;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function leaderboardPositionRank(position: string | null): number {
  if (!position) return Number.POSITIVE_INFINITY;
  const parsed = Number(position.replace(/^T/i, "").trim());
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

/** Top tournament board rows from contest-owned golfers' live scoreData. */
export function buildTournamentBoard(
  contestPlayers: readonly ContestFeedContestPlayer[],
  cap: number = CONTEST_FEED_TOURNAMENT_BOARD_CAP,
): ContestFeedTournamentBoardRow[] {
  const rows: ContestFeedTournamentBoardRow[] = contestPlayers.map((player) => {
    const board = readScoreDataBoardState(player.scoreData);
    return {
      eventParticipantId: player.eventParticipantId,
      displayName: player.displayName,
      leaderboardPosition: board.leaderboardPosition,
      leaderboardTotal: scoreDataLeaderboardTotal(player.scoreData),
    };
  });
  rows.sort((left, right) => {
    const rankDelta =
      leaderboardPositionRank(left.leaderboardPosition) -
      leaderboardPositionRank(right.leaderboardPosition);
    if (rankDelta !== 0) return rankDelta;
    return left.displayName.localeCompare(right.displayName);
  });
  return rows.slice(0, Math.max(0, cap));
}

function newestItemGeneratedAtMs(items: readonly ContestFeedItem[]): number | null {
  let newest: number | null = null;
  for (const item of items) {
    const generated = Date.parse(item.generatedAt);
    if (!Number.isFinite(generated)) continue;
    if (newest == null || generated > newest) newest = generated;
  }
  return newest;
}

/**
 * Rule-based story classifier. Does not invent facts — only ranks real deltas.
 */
export function classifyContestFeedStories(
  previous: ContestCommentaryContext | null | undefined,
  current: ContestCommentaryContext,
  options: ClassifyContestFeedStoriesOptions = {},
): ContestFeedStoryCandidate[] {
  const delta = computeContestFeedDelta(previous, current);
  const nowMs = options.nowMs ?? Date.now();
  const recapCooldownMs = options.recapCooldownMs ?? CONTEST_FEED_RECAP_COOLDOWN_MS;
  const pulseGapMs = options.pulseGapMs ?? CONTEST_FEED_PULSE_GAP_MS;
  const maxPerPass = options.maxPerPass ?? CONTEST_FEED_MAX_PER_PASS;
  const minPositionDelta = options.minPositionDelta ?? 1;
  const existingItems = options.existingItems ?? [];
  const contestPlayers = options.contestPlayers ?? [];
  const previousHoleState = options.previousHoleState;
  const periodInProgress = options.periodInProgress === true;

  const candidates: ContestFeedStoryCandidate[] = [];
  const swingCooldown = recentStoryKeys(existingItems, "score_swing", recapCooldownMs, nowMs);

  const raceImpacts = materialRaceChanges(delta, minPositionDelta);
  const swingEvents = collectScoreSwingEvents(contestPlayers, previousHoleState, raceImpacts);
  if (swingEvents.length > 0) {
    const participantIds = [
      ...new Set(swingEvents.map((event) => event.eventParticipantId)),
    ].sort();
    const entryIds = [...new Set(swingEvents.flatMap((event) => event.ownerEntryIds))].sort();
    const subjectKey = participantIds.join(",") || "swing";
    if (!swingCooldown.has(subjectKey)) {
      const priority = scoreSwingPriority(swingEvents, raceImpacts);
      candidates.push({
        storyType: "score_swing",
        priority,
        intensity: scoreSwingIntensityFromPriority(priority),
        subjects: {
          participantIds,
          ...(entryIds.length > 0 ? { entryIds } : {}),
        },
        subjectKey,
        reason: scoreSwingReason(swingEvents),
      });
    }
  }

  const hasRecap = existingItems.some((item) => item.storyType === "stage_recap");
  const recapDue = !hasRecap || delta.stageChanged;
  if (recapDue) {
    const priority = delta.stageChanged ? 90 : 100;
    candidates.push({
      storyType: "stage_recap",
      priority,
      intensity: delta.stageChanged ? "notable" : "major",
      subjects: {},
      subjectKey: "recap",
      reason: delta.stageChanged
        ? `Stage changed from ${delta.previousStageId} to ${delta.currentStageId}.`
        : !delta.hasPreviousContext
          ? "No prior feed context; emit opening stage recap."
          : "No stage_recap in feed; emit stage recap.",
    });
  }

  if (candidates.length === 0 && periodInProgress) {
    const newestMs = newestItemGeneratedAtMs(existingItems);
    const silenceMs = newestMs == null ? Number.POSITIVE_INFINITY : nowMs - newestMs;
    if (silenceMs >= pulseGapMs) {
      candidates.push({
        storyType: "tournament_pulse",
        priority: CONTEST_FEED_PULSE_PRIORITY,
        intensity: "routine",
        subjects: {},
        subjectKey: "pulse",
        reason:
          newestMs == null
            ? "On-course silence with empty feed; emit tournament pulse."
            : `On-course silence of ${Math.round(silenceMs / 60000)} min; emit tournament pulse.`,
      });
    }
  }

  return sortCandidates(candidates).slice(0, Math.max(0, maxPerPass));
}

/**
 * Narrow fact pack for a classified story — prompts must not see the full dump.
 */
export function buildContestFeedFactPack(
  candidate: ContestFeedStoryCandidate,
  current: ContestCommentaryContext,
  previous?: ContestCommentaryContext | null,
  options: BuildContestFeedFactPackOptions = {},
): ContestFeedFactPack {
  const delta = computeContestFeedDelta(previous, current);
  const stageId = current.eventProgress.stageId;
  const minPositionDelta = options.minPositionDelta ?? 1;

  if (candidate.storyType === "score_swing") {
    const participantIds = new Set(candidate.subjects.participantIds ?? []);
    const raceImpacts = materialRaceChanges(delta, minPositionDelta);
    const events = collectScoreSwingEvents(
      options.contestPlayers ?? [],
      options.previousHoleState,
      raceImpacts,
    ).filter((event) =>
      participantIds.size === 0 ? true : participantIds.has(event.eventParticipantId),
    );
    const ownerEntryIds = new Set(events.flatMap((event) => event.ownerEntryIds));
    const impacts = raceImpacts.filter((change) => ownerEntryIds.has(change.entryId));
    return {
      storyType: "score_swing",
      stageId,
      period: current.period,
      paidCount: current.paidCount,
      events,
      impacts,
    };
  }

  if (candidate.storyType === "tournament_pulse") {
    return {
      storyType: "tournament_pulse",
      stageId,
      period: current.period,
      eventProgress: current.eventProgress,
      tournamentBoard: buildTournamentBoard(options.contestPlayers ?? []),
    };
  }

  return {
    storyType: "stage_recap",
    context: current,
  };
}

export interface MergeContestFeedItemsOptions {
  /** Optional trim after merge; omit to keep full history. */
  cap?: number;
  updatedAt?: string;
  lastContext?: ContestCommentaryContext;
  lastHoleState?: ContestFeedHoleState;
}

function generatedAtMs(item: ContestFeedItem): number {
  const parsed = Date.parse(item.generatedAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Merge new items and order newest-first. Keeps full history unless `cap` is set. */
export function mergeContestFeedItems(
  existing: ContestCommentaryFeedDocument,
  newItems: readonly ContestFeedItem[],
  options: MergeContestFeedItemsOptions = {},
): ContestCommentaryFeedDocument {
  const seen = new Set<string>();
  const deduped: ContestFeedItem[] = [];
  for (const item of [...newItems, ...existing.items]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
  }
  let merged = deduped.sort((left, right) => generatedAtMs(right) - generatedAtMs(left));
  if (typeof options.cap === "number" && Number.isFinite(options.cap) && options.cap >= 0) {
    merged = merged.slice(0, options.cap);
  }
  return {
    schemaVersion: 1,
    items: merged,
    ...(options.lastContext != null
      ? { lastContext: options.lastContext }
      : existing.lastContext != null
        ? { lastContext: existing.lastContext }
        : {}),
    ...(options.lastHoleState != null
      ? { lastHoleState: options.lastHoleState }
      : existing.lastHoleState != null
        ? { lastHoleState: existing.lastHoleState }
        : {}),
    ...(options.updatedAt
      ? { updatedAt: options.updatedAt }
      : existing.updatedAt
        ? { updatedAt: existing.updatedAt }
        : {}),
  };
}

/** Newest stage_recap text, else newest item text — for convenience displays. */
export function latestFeedCommentaryText(document: ContestCommentaryFeedDocument): string | null {
  const recap = document.items.find((item) => item.storyType === "stage_recap");
  if (recap?.text.trim()) return recap.text;
  const newest = document.items[0];
  return newest?.text.trim() ? newest.text : null;
}
