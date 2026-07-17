import type { EventStatus } from "@cut/sport-sdk";
import { prisma } from "../lib/prisma.js";
import { requireSportModule } from "../sports/registry.js";
import { readContestState } from "../services/shared/contractClient.js";
import {
  arePrimaryActionsLocked,
  contractStateToStatus,
  type ContestStatus,
} from "../services/shared/types.js";

export type LineupEditBlock =
  | { code: "not_found" }
  | { code: "event_not_editable"; eventStatus: EventStatus }
  | { code: "contest_not_editable"; contestId: string; contestStatus: string };

/**
 * Contest-scoped lineup create/edit matches primary join/leave: only while OPEN.
 */
export function contestAllowsLineupEdits(status: string): boolean {
  return !arePrimaryActionsLocked(status as ContestStatus);
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

async function resolveContestStatusForEdit(contest: {
  id: string;
  status: string;
  address: string;
  chainId: number;
}): Promise<string> {
  try {
    const onChain = await readContestState(contest.address, contest.chainId);
    return contractStateToStatus(onChain);
  } catch (error) {
    console.warn(
      `[lineupEditable] Falling back to DB status for contest ${contest.id}:`,
      error instanceof Error ? error.message : error,
    );
    return contest.status;
  }
}

/** Contest-scoped edits: contest OPEN only (prefer on-chain state). No event gate. */
export async function getContestEditBlock(
  contestId: string,
): Promise<LineupEditBlock | null> {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: {
      id: true,
      status: true,
      address: true,
      chainId: true,
    },
  });

  if (!contest) {
    return { code: "not_found" };
  }

  const status = await resolveContestStatusForEdit(contest);
  if (!contestAllowsLineupEdits(status)) {
    return {
      code: "contest_not_editable",
      contestId: contest.id,
      contestStatus: status,
    };
  }

  return null;
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
          contest: {
            select: { id: true, status: true, address: true, chainId: true },
          },
        },
      },
    },
  });

  if (!lineup) {
    return { code: "not_found" };
  }

  const contestScoped =
    Boolean(lineup.contestId) || lineup.contestLineups.length > 0;

  // Contest-scoped lineups follow contest OPEN (on-chain preferred), not event status.
  if (contestScoped) {
    for (const entry of lineup.contestLineups) {
      const status = await resolveContestStatusForEdit(entry.contest);
      if (!contestAllowsLineupEdits(status)) {
        return {
          code: "contest_not_editable",
          contestId: entry.contestId,
          contestStatus: status,
        };
      }
    }

    if (lineup.contestId) {
      const contest = await prisma.contest.findUnique({
        where: { id: lineup.contestId },
        select: { id: true, status: true, address: true, chainId: true },
      });
      if (contest) {
        const status = await resolveContestStatusForEdit(contest);
        if (!contestAllowsLineupEdits(status)) {
          return {
            code: "contest_not_editable",
            contestId: contest.id,
            contestStatus: status,
          };
        }
      }
    }

    return null;
  }

  return getEventEditBlock(lineup.eventId, lineup.event.sportId);
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
          message: "Cannot edit lineups after contest entry has closed",
          contestId: block.contestId,
          contestStatus: block.contestStatus,
        },
      };
  }
}
