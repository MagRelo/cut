import type {
  ContestCommentaryContext,
  ContestCommentaryLineup,
  ContestCommentaryPlayer,
  ContestCommentaryStageId,
} from "./contestCommentary.js";

/** Rolling window size for the contest commentary feed document. */
export const CONTEST_FEED_ITEM_CAP = 30;

/** Max stories generated in a single feed pass. */
export const CONTEST_FEED_MAX_PER_PASS = 2;

/** Default cooldown before another stage_recap may be emitted (ms). */
export const CONTEST_FEED_RECAP_COOLDOWN_MS = 20 * 60 * 1000;

export type ContestFeedStoryType =
  | "race_shakeup"
  | "leverage_spike"
  | "shared_risk"
  | "route_narrowing"
  | "cut_tension"
  | "stage_recap"
  | "milestone";

/** Story types implemented in the first classifier pass. */
export const CONTEST_FEED_ACTIVE_STORY_TYPES = [
  "race_shakeup",
  "leverage_spike",
  "stage_recap",
] as const satisfies readonly ContestFeedStoryType[];

export type ContestFeedActiveStoryType =
  (typeof CONTEST_FEED_ACTIVE_STORY_TYPES)[number];

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
}

export interface ContestCommentaryFeedDocument {
  schemaVersion: 1;
  /** Newest items first; rolling window. */
  items: ContestFeedItem[];
  /** Analysis snapshot used for next-pass deltas / cooldowns. */
  lastContext?: ContestCommentaryContext;
  /** ISO timestamp of the last successful feed write. */
  updatedAt?: string;
}

export interface ContestFeedStoryCandidate {
  storyType: ContestFeedActiveStoryType;
  priority: number;
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

export interface ContestFeedLeverageSpike {
  eventParticipantId: string;
  displayName: string;
  previousLeverage: number;
  currentLeverage: number;
  leverageDelta: number;
  ownerEntryIds: string[];
  ownerNames: string[];
}

export interface ContestFeedDelta {
  racePositionChanges: ContestFeedRacePositionChange[];
  leverageSpikes: ContestFeedLeverageSpike[];
  stageChanged: boolean;
  previousStageId: ContestCommentaryStageId | null;
  currentStageId: ContestCommentaryStageId;
  hasPreviousContext: boolean;
}

export interface ClassifyContestFeedStoriesOptions {
  /** Existing feed items used for cooldown / dedupe. */
  existingItems?: readonly ContestFeedItem[];
  /** Wall clock for recap cooldown (defaults to Date.now). */
  nowMs?: number;
  /** Override recap cooldown; default CONTEST_FEED_RECAP_COOLDOWN_MS. */
  recapCooldownMs?: number;
  /** Max candidates returned after ranking; default CONTEST_FEED_MAX_PER_PASS. */
  maxPerPass?: number;
  /** Minimum absolute position move to count as a race shakeup. */
  minPositionDelta?: number;
  /** Minimum leverage delta to count as a leverage spike. */
  minLeverageDelta?: number;
}

export interface ContestFeedWordLimits {
  minWords: number;
  maxWords: number;
}

export const CONTEST_FEED_WORD_LIMITS: Record<
  ContestFeedActiveStoryType,
  ContestFeedWordLimits
> = {
  race_shakeup: { minWords: 50, maxWords: 100 },
  leverage_spike: { minWords: 40, maxWords: 80 },
  stage_recap: { minWords: 125, maxWords: 175 },
};

export type ContestFeedFactPack =
  | {
      storyType: "race_shakeup";
      stageId: ContestCommentaryStageId;
      period: number | null;
      paidCount: number;
      race: ContestCommentaryContext["race"];
      changes: ContestFeedRacePositionChange[];
      contentionLineups: ContestCommentaryLineup[];
    }
  | {
      storyType: "leverage_spike";
      stageId: ContestCommentaryStageId;
      period: number | null;
      spikes: ContestFeedLeverageSpike[];
      highLeveragePlayers: ContestCommentaryPlayer[];
      race: ContestCommentaryContext["race"];
    }
  | {
      storyType: "stage_recap";
      context: ContestCommentaryContext;
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
  return {
    id: value.id,
    storyType: value.storyType as ContestFeedStoryType,
    priority: value.priority,
    subjects: {
      ...(asStringArray(subjects.entryIds)
        ? { entryIds: asStringArray(subjects.entryIds) }
        : {}),
      ...(asStringArray(subjects.participantIds)
        ? { participantIds: asStringArray(subjects.participantIds) }
        : {}),
    },
    text: value.text,
    generatedAt: value.generatedAt,
  };
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
export function parseContestCommentaryFeedDocument(
  raw: unknown,
): ContestCommentaryFeedDocument {
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
  if (typeof raw.updatedAt === "string" && raw.updatedAt.trim()) {
    document.updatedAt = raw.updatedAt;
  }
  return document;
}

function lineupByEntryId(
  context: ContestCommentaryContext,
): Map<string, ContestCommentaryLineup> {
  return new Map(context.contentionLineups.map((lineup) => [lineup.entryId, lineup]));
}

function playerById(
  context: ContestCommentaryContext,
): Map<string, ContestCommentaryPlayer> {
  return new Map(
    context.highLeveragePlayers.map((player) => [player.eventParticipantId, player]),
  );
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
      leverageSpikes: [],
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

  const prevPlayers = playerById(previous);
  const leverageSpikes: ContestFeedLeverageSpike[] = [];
  for (const player of current.highLeveragePlayers) {
    const prior = prevPlayers.get(player.eventParticipantId);
    const previousLeverage = prior?.leverage ?? 0;
    const leverageDelta = player.leverage - previousLeverage;
    if (leverageDelta === 0 && prior != null) continue;
    leverageSpikes.push({
      eventParticipantId: player.eventParticipantId,
      displayName: player.displayName,
      previousLeverage,
      currentLeverage: player.leverage,
      leverageDelta,
      ownerEntryIds: [...player.ownerEntryIds],
      ownerNames: [...player.ownerNames],
    });
  }

  return {
    racePositionChanges,
    leverageSpikes,
    stageChanged: previous.eventProgress.stageId !== currentStageId,
    previousStageId: previous.eventProgress.stageId,
    currentStageId,
    hasPreviousContext: true,
  };
}

function minutesBucket(iso: string, nowMs: number): string {
  const generated = Date.parse(iso);
  if (!Number.isFinite(generated)) return "unknown";
  const ageMs = Math.max(0, nowMs - generated);
  return String(Math.floor(ageMs / (5 * 60 * 1000)));
}

/** Stable feed item id for dedupe within a pass / cooldown window. */
export function buildContestFeedItemId(
  storyType: ContestFeedStoryType,
  subjectKey: string,
  generatedAt: string,
  nowMs: number = Date.now(),
): string {
  return `${storyType}:${subjectKey}:${minutesBucket(generatedAt, nowMs)}`;
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
    const subjectKey = [
      ...(item.subjects.entryIds ?? []),
      ...(item.subjects.participantIds ?? []),
    ].sort().join(",") || "all";
    keys.add(subjectKey);
    // Also treat whole-story cooldown for stage_recap.
    if (storyType === "stage_recap") keys.add("recap");
  }
  return keys;
}

function sortCandidates(
  candidates: ContestFeedStoryCandidate[],
): ContestFeedStoryCandidate[] {
  return [...candidates].sort((left, right) => {
    if (right.priority !== left.priority) return right.priority - left.priority;
    return left.storyType.localeCompare(right.storyType);
  });
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
  const maxPerPass = options.maxPerPass ?? CONTEST_FEED_MAX_PER_PASS;
  const minPositionDelta = options.minPositionDelta ?? 1;
  const minLeverageDelta = options.minLeverageDelta ?? 0.05;
  const existingItems = options.existingItems ?? [];

  const candidates: ContestFeedStoryCandidate[] = [];
  const raceCooldown = recentStoryKeys(
    existingItems,
    "race_shakeup",
    recapCooldownMs,
    nowMs,
  );
  const leverageCooldown = recentStoryKeys(
    existingItems,
    "leverage_spike",
    recapCooldownMs,
    nowMs,
  );
  const recapCooldown = recentStoryKeys(
    existingItems,
    "stage_recap",
    recapCooldownMs,
    nowMs,
  );

  const materialRaceChanges = delta.racePositionChanges.filter(
    (change) =>
      change.crossedPaidCut || Math.abs(change.positionDelta) >= minPositionDelta,
  );
  if (materialRaceChanges.length > 0) {
    const entryIds = materialRaceChanges.map((change) => change.entryId).sort();
    const subjectKey = entryIds.join(",") || "race";
    if (!raceCooldown.has(subjectKey)) {
      const crossed = materialRaceChanges.filter((change) => change.crossedPaidCut);
      const maxMove = Math.max(
        ...materialRaceChanges.map((change) => Math.abs(change.positionDelta)),
      );
      candidates.push({
        storyType: "race_shakeup",
        priority: 80 + Math.min(20, maxMove * 5) + (crossed.length > 0 ? 10 : 0),
        subjects: { entryIds },
        subjectKey,
        reason:
          crossed.length > 0
            ? `${crossed.length} lineup(s) crossed the paid cut; ${materialRaceChanges.length} position move(s).`
            : `${materialRaceChanges.length} material contest position move(s).`,
      });
    }
  }

  const materialSpikes = delta.leverageSpikes
    .filter((spike) => spike.leverageDelta >= minLeverageDelta)
    .sort((left, right) => right.leverageDelta - left.leverageDelta);
  if (materialSpikes.length > 0) {
    const top = materialSpikes[0]!;
    const subjectKey = top.eventParticipantId;
    if (!leverageCooldown.has(subjectKey)) {
      candidates.push({
        storyType: "leverage_spike",
        priority: 70 + Math.min(25, Math.round(top.leverageDelta * 100)),
        subjects: {
          participantIds: [top.eventParticipantId],
          entryIds: [...top.ownerEntryIds],
        },
        subjectKey,
        reason: `${top.displayName} leverage rose by ${top.leverageDelta.toFixed(3)}.`,
      });
    }
  }

  const lastRecap = existingItems.find((item) => item.storyType === "stage_recap");
  const lastRecapAt = lastRecap ? Date.parse(lastRecap.generatedAt) : NaN;
  const recapDue =
    !delta.hasPreviousContext ||
    delta.stageChanged ||
    !Number.isFinite(lastRecapAt) ||
    nowMs - lastRecapAt >= recapCooldownMs;
  if (recapDue && !recapCooldown.has("recap")) {
    candidates.push({
      storyType: "stage_recap",
      priority: delta.stageChanged ? 90 : !delta.hasPreviousContext ? 100 : 40,
      subjects: {},
      subjectKey: "recap",
      reason: !delta.hasPreviousContext
        ? "No prior feed context; emit opening stage recap."
        : delta.stageChanged
          ? `Stage changed from ${delta.previousStageId} to ${delta.currentStageId}.`
          : "Stage recap cooldown elapsed.",
    });
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
): ContestFeedFactPack {
  const delta = computeContestFeedDelta(previous, current);
  const stageId = current.eventProgress.stageId;

  if (candidate.storyType === "race_shakeup") {
    const entryIds = new Set(candidate.subjects.entryIds ?? []);
    const changes = delta.racePositionChanges.filter((change) =>
      entryIds.size === 0 ? true : entryIds.has(change.entryId),
    );
    const contentionLineups = current.contentionLineups.filter((lineup) =>
      entryIds.size === 0 ? true : entryIds.has(lineup.entryId),
    );
    return {
      storyType: "race_shakeup",
      stageId,
      period: current.period,
      paidCount: current.paidCount,
      race: current.race,
      changes,
      contentionLineups,
    };
  }

  if (candidate.storyType === "leverage_spike") {
    const participantIds = new Set(candidate.subjects.participantIds ?? []);
    const spikes = delta.leverageSpikes.filter((spike) =>
      participantIds.size === 0 ? true : participantIds.has(spike.eventParticipantId),
    );
    const highLeveragePlayers = current.highLeveragePlayers.filter((player) =>
      participantIds.size === 0
        ? true
        : participantIds.has(player.eventParticipantId),
    );
    return {
      storyType: "leverage_spike",
      stageId,
      period: current.period,
      spikes,
      highLeveragePlayers,
      race: current.race,
    };
  }

  return {
    storyType: "stage_recap",
    context: current,
  };
}

export interface MergeContestFeedItemsOptions {
  cap?: number;
  updatedAt?: string;
  lastContext?: ContestCommentaryContext;
}

/** Prepend new items and trim to the rolling cap. */
export function mergeContestFeedItems(
  existing: ContestCommentaryFeedDocument,
  newItems: readonly ContestFeedItem[],
  options: MergeContestFeedItemsOptions = {},
): ContestCommentaryFeedDocument {
  const cap = options.cap ?? CONTEST_FEED_ITEM_CAP;
  const seen = new Set<string>();
  const merged: ContestFeedItem[] = [];
  for (const item of [...newItems, ...existing.items]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
    if (merged.length >= cap) break;
  }
  return {
    schemaVersion: 1,
    items: merged,
    ...(options.lastContext != null
      ? { lastContext: options.lastContext }
      : existing.lastContext != null
        ? { lastContext: existing.lastContext }
        : {}),
    ...(options.updatedAt
      ? { updatedAt: options.updatedAt }
      : existing.updatedAt
        ? { updatedAt: existing.updatedAt }
        : {}),
  };
}

/** Newest stage_recap text, else newest item text — for convenience displays. */
export function latestFeedCommentaryText(
  document: ContestCommentaryFeedDocument,
): string | null {
  const recap = document.items.find((item) => item.storyType === "stage_recap");
  if (recap?.text.trim()) return recap.text;
  const newest = document.items[0];
  return newest?.text.trim() ? newest.text : null;
}
