/**
 * Open one free public contest for an event.
 *
 * Database row only: `primaryDeposit` 0, no contract address, no escrow.
 * Idempotent: an event that already has a contest with no league (`userGroupId`)
 * is left alone. `chainId` is `REFERRAL_SYNC_CHAIN_ID` so the row sits with the
 * rest of that environment's contests. Expiry is 7 days after session close
 * (commodities) or tournament end (golf).
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { getReferralSyncChainIdFromEnv } from "../../lib/referralConfig.js";

export const PUBLIC_CONTEST_PRIMARY_DEPOSIT = 0;
export const PUBLIC_CONTEST_REFERRAL_NETWORK_BPS = 0;
export const PUBLIC_CONTEST_SUBSIDY_BPS = 0;
export const PUBLIC_CONTEST_EXPIRY_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export type EnsurePublicContestResult =
  | { action: "exists"; contestId: string }
  | { action: "created"; contestId: string }
  | { action: "skipped"; reason: string };

export function publicContestExpiryTimestamp(metadata: unknown, now = Date.now()): number {
  const endMs = eventEndMs(metadata);
  return Math.floor(((endMs ?? now) + PUBLIC_CONTEST_EXPIRY_DAYS * DAY_MS) / 1000);
}

export function publicContestName(metadata: unknown, fallback: string): string {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const name = (metadata as { name?: unknown }).name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return fallback;
}

function eventEndMs(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const record = metadata as Record<string, unknown>;
  const commodities = record.commodities;
  const sessionClose =
    commodities &&
    typeof commodities === "object" &&
    !Array.isArray(commodities) &&
    typeof (commodities as { sessionClose?: unknown }).sessionClose === "string"
      ? (commodities as { sessionClose: string }).sessionClose
      : null;
  const endDate = typeof record.endDate === "string" ? record.endDate : null;
  const raw = sessionClose ?? endDate;
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

export async function ensurePublicContestForEvent(
  eventId: string,
  options: { now?: Date } = {},
): Promise<EnsurePublicContestResult> {
  const event = await prisma.competitionEvent.findUnique({
    where: { id: eventId },
    include: { sport: true },
  });
  if (!event) {
    return { action: "skipped", reason: "event not found" };
  }

  const existing = await prisma.contest.findFirst({
    where: { eventId, userGroupId: null },
    select: { id: true },
  });
  if (existing) {
    return { action: "exists", contestId: existing.id };
  }

  const chainId = getReferralSyncChainIdFromEnv();
  const now = options.now ?? new Date();
  const expiryTimestamp = publicContestExpiryTimestamp(event.metadata, now.getTime());
  const name = publicContestName(event.metadata, `${event.sport.name} ${event.externalId}`);

  const contest = await prisma.contest.create({
    data: {
      name,
      description: `${event.sport.name} — ${event.externalId}`,
      eventId: event.id,
      endTime: new Date(expiryTimestamp * 1000),
      address: null,
      chainId,
      status: "OPEN",
      settings: {
        contestType: "PUBLIC",
        chainId,
        expiryTimestamp,
        primaryDeposit: PUBLIC_CONTEST_PRIMARY_DEPOSIT,
        referralNetworkBps: PUBLIC_CONTEST_REFERRAL_NETWORK_BPS,
        primaryDepositSecondarySubsidyBps: PUBLIC_CONTEST_SUBSIDY_BPS,
      } as Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  return { action: "created", contestId: contest.id };
}

/** Log and continue. Event init still succeeds when contest creation fails. */
export async function ensurePublicContestSafe(
  eventId: string,
  options?: { logSkips?: boolean },
): Promise<void> {
  try {
    const result = await ensurePublicContestForEvent(eventId);
    if (result.action === "created") {
      console.log(`[public-contest] created free contest ${result.contestId} for ${eventId}`);
    } else if (result.action === "skipped" && options?.logSkips) {
      console.warn(`[public-contest] skipped ${eventId}: ${result.reason}`);
    }
  } catch (error) {
    console.error(`[public-contest] failed for ${eventId}:`, error);
  }
}
