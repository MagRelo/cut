import type { EventStatus } from "@cut/sport-sdk";
import { prisma } from "../lib/prisma.js";
import { requireSportModule } from "../sports/registry.js";

export const LINEUP_LOCKED_CONTEST_STATUSES = [
  "LOCKED",
  "SETTLED",
  "CLOSED",
  "CANCELLED",
] as const;

export type LineupEditBlock =
  | { code: "not_found" }
  | { code: "event_not_editable"; eventStatus: EventStatus }
  | { code: "contest_not_editable"; contestId: string; contestStatus: string };

export function contestAllowsLineupEdits(status: string): boolean {
  return !LINEUP_LOCKED_CONTEST_STATUSES.includes(
    status as (typeof LINEUP_LOCKED_CONTEST_STATUSES)[number],
  );
}

export async function getEventEditBlock(
  eventId: string,
  sportId: string,
): Promise<LineupEditBlock | null> {
  const sportModule = requireSportModule(sportId);
  const eventStatus = await sportModule.getEventStatus(eventId);

  if (eventStatus === "LIVE" || eventStatus === "COMPLETE") {
    return { code: "event_not_editable", eventStatus };
  }

  return null;
}

export async function getContestEditBlock(
  contestId: string,
): Promise<LineupEditBlock | null> {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: {
      id: true,
      status: true,
      eventId: true,
      event: { select: { sportId: true } },
    },
  });

  if (!contest) {
    return { code: "not_found" };
  }

  if (!contestAllowsLineupEdits(contest.status)) {
    return {
      code: "contest_not_editable",
      contestId: contest.id,
      contestStatus: contest.status,
    };
  }

  return getEventEditBlock(contest.eventId, contest.event.sportId);
}

export async function getLineupEditBlock(
  lineupId: string,
  userId: string,
): Promise<LineupEditBlock | null> {
  const lineup = await prisma.lineup.findFirst({
    where: { id: lineupId, userId },
    select: {
      eventId: true,
      contestId: true,
      event: { select: { sportId: true } },
      contestLineups: {
        select: {
          contestId: true,
          contest: { select: { status: true } },
        },
      },
    },
  });

  if (!lineup) {
    return { code: "not_found" };
  }

  const eventBlock = await getEventEditBlock(lineup.eventId, lineup.event.sportId);
  if (eventBlock) {
    return eventBlock;
  }

  for (const entry of lineup.contestLineups) {
    if (!contestAllowsLineupEdits(entry.contest.status)) {
      return {
        code: "contest_not_editable",
        contestId: entry.contestId,
        contestStatus: entry.contest.status,
      };
    }
  }

  if (lineup.contestId) {
    const contest = await prisma.contest.findUnique({
      where: { id: lineup.contestId },
      select: { id: true, status: true },
    });
    if (contest && !contestAllowsLineupEdits(contest.status)) {
      return {
        code: "contest_not_editable",
        contestId: contest.id,
        contestStatus: contest.status,
      };
    }
  }

  return null;
}

export function lineupEditBlockToHttp(block: LineupEditBlock): {
  status: 403 | 404;
  body: Record<string, unknown>;
} {
  switch (block.code) {
    case "not_found":
      return { status: 404, body: { error: "Lineup not found" } };
    case "event_not_editable":
      return {
        status: 403,
        body: {
          error: "Event editing is not allowed",
          message: "Cannot edit lineups while the event is live or complete",
          eventStatus: block.eventStatus,
        },
      };
    case "contest_not_editable":
      return {
        status: 403,
        body: {
          error: "Contest lineup editing is not allowed",
          message: "Cannot edit lineups after a contest has locked or settled",
          contestId: block.contestId,
          contestStatus: block.contestStatus,
        },
      };
  }
}
