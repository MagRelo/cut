import type {
  ContestFeedFactPack,
  ContestFeedStoryCandidate,
} from "@cut/sport-pga-golf";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";

export const COMMENTARY_FEED_JOB_STATUS = {
  pending: "pending",
  running: "running",
  done: "done",
  failed: "failed",
} as const;

export type CommentaryFeedJobStatus =
  (typeof COMMENTARY_FEED_JOB_STATUS)[keyof typeof COMMENTARY_FEED_JOB_STATUS];

export interface CommentaryFeedJobStory {
  candidate: ContestFeedStoryCandidate;
  factPack: ContestFeedFactPack;
}

export interface CommentaryFeedJobPayload {
  schemaVersion: 1;
  period: number | null;
  stories: CommentaryFeedJobStory[];
}

export interface ClaimedCommentaryFeedJob {
  id: string;
  contestId: string;
  status: string;
  payload: CommentaryFeedJobPayload;
  attempts: number;
  lastError: string | null;
  runAfter: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function maxPending(): number {
  const raw = process.env.COMMENTARY_FEED_MAX_PENDING?.trim();
  if (!raw) return 20;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 20;
}

function staleMs(): number {
  const raw = process.env.COMMENTARY_FEED_JOB_STALE_MS?.trim();
  if (!raw) return 15 * 60 * 1000;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 15 * 60 * 1000;
}

export function parseCommentaryFeedJobPayload(
  value: unknown,
): CommentaryFeedJobPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== 1) return null;
  if (!Array.isArray(record.stories)) return null;
  return {
    schemaVersion: 1,
    period: typeof record.period === "number" ? record.period : null,
    stories: record.stories as CommentaryFeedJobStory[],
  };
}

export async function countPendingCommentaryFeedJobs(): Promise<number> {
  return prisma.commentaryFeedJob.count({
    where: { status: COMMENTARY_FEED_JOB_STATUS.pending },
  });
}

export async function contestHasActiveCommentaryFeedJob(
  contestId: string,
): Promise<boolean> {
  const existing = await prisma.commentaryFeedJob.findFirst({
    where: {
      contestId,
      status: {
        in: [COMMENTARY_FEED_JOB_STATUS.pending, COMMENTARY_FEED_JOB_STATUS.running],
      },
    },
    select: { id: true },
  });
  return existing != null;
}

/**
 * Insert a pending job if under backlog cap and contest has no active job.
 * Returns null when skipped.
 */
export async function enqueueCommentaryFeedJob(input: {
  contestId: string;
  payload: CommentaryFeedJobPayload;
}): Promise<{ id: string } | null> {
  const pending = await countPendingCommentaryFeedJobs();
  if (pending >= maxPending()) {
    console.warn(
      `[commentaryFeedJobs] Backlog full (${pending}/${maxPending()}); skip enqueue for ${input.contestId}`,
    );
    return null;
  }
  if (await contestHasActiveCommentaryFeedJob(input.contestId)) {
    console.log(
      `[commentaryFeedJobs] Active job already exists for ${input.contestId}; skip enqueue`,
    );
    return null;
  }

  const job = await prisma.commentaryFeedJob.create({
    data: {
      contestId: input.contestId,
      status: COMMENTARY_FEED_JOB_STATUS.pending,
      payload: input.payload as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
  return job;
}

export async function reclaimStaleCommentaryFeedJobs(
  now: Date = new Date(),
): Promise<number> {
  const cutoff = new Date(now.getTime() - staleMs());
  const result = await prisma.commentaryFeedJob.updateMany({
    where: {
      status: COMMENTARY_FEED_JOB_STATUS.running,
      startedAt: { lte: cutoff },
    },
    data: {
      status: COMMENTARY_FEED_JOB_STATUS.pending,
      startedAt: null,
      lastError: "reclaimed: stale running job",
    },
  });
  return result.count;
}

type RawJobRow = {
  id: string;
  contestId: string;
  status: string;
  payload: unknown;
  attempts: number;
  lastError: string | null;
  runAfter: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Claim the next pending job (FOR UPDATE SKIP LOCKED). Returns null when idle.
 */
export async function claimNextCommentaryFeedJob(
  now: Date = new Date(),
): Promise<ClaimedCommentaryFeedJob | null> {
  await reclaimStaleCommentaryFeedJobs(now);

  const rows = await prisma.$queryRaw<RawJobRow[]>`
    UPDATE "CommentaryFeedJob"
    SET
      status = ${COMMENTARY_FEED_JOB_STATUS.running},
      "startedAt" = ${now},
      attempts = attempts + 1,
      "updatedAt" = ${now}
    WHERE id = (
      SELECT id FROM "CommentaryFeedJob"
      WHERE status = ${COMMENTARY_FEED_JOB_STATUS.pending}
        AND "runAfter" <= ${now}
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING
      id,
      "contestId",
      status,
      payload,
      attempts,
      "lastError",
      "runAfter",
      "startedAt",
      "finishedAt",
      "createdAt",
      "updatedAt"
  `;

  const row = rows[0];
  if (!row) return null;
  const payload = parseCommentaryFeedJobPayload(row.payload);
  if (!payload) {
    await markCommentaryFeedJobFailed(row.id, "invalid job payload");
    return null;
  }
  return {
    id: row.id,
    contestId: row.contestId,
    status: row.status,
    payload,
    attempts: row.attempts,
    lastError: row.lastError,
    runAfter: row.runAfter,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function markCommentaryFeedJobDone(jobId: string): Promise<void> {
  const now = new Date();
  await prisma.commentaryFeedJob.update({
    where: { id: jobId },
    data: {
      status: COMMENTARY_FEED_JOB_STATUS.done,
      finishedAt: now,
      lastError: null,
    },
  });
}

export async function markCommentaryFeedJobFailed(
  jobId: string,
  error: string,
  options: { retry?: boolean; runAfter?: Date } = {},
): Promise<void> {
  const now = new Date();
  if (options.retry) {
    await prisma.commentaryFeedJob.update({
      where: { id: jobId },
      data: {
        status: COMMENTARY_FEED_JOB_STATUS.pending,
        startedAt: null,
        lastError: error.slice(0, 2000),
        runAfter: options.runAfter ?? new Date(now.getTime() + 60_000),
      },
    });
    return;
  }
  await prisma.commentaryFeedJob.update({
    where: { id: jobId },
    data: {
      status: COMMENTARY_FEED_JOB_STATUS.failed,
      finishedAt: now,
      lastError: error.slice(0, 2000),
    },
  });
}
