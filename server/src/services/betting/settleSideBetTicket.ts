import { SideBetTicketStatus, type Prisma } from "@prisma/client";
import type { PropBetResultsShell, PropBetTicketShell } from "@cut/sport-sdk";
import { getPropBetModule } from "../../sports/propBetRegistry.js";
import { eventParticipantLeaderboardPosition } from "../sideBets/lineupSideBetUtils.js";

function propBetGradeToTicketStatus(grade: "WON" | "LOST" | "VOID"): SideBetTicketStatus {
  switch (grade) {
    case "WON":
      return SideBetTicketStatus.WON;
    case "LOST":
      return SideBetTicketStatus.LOST;
    default:
      return SideBetTicketStatus.VOID;
  }
}

export async function settleOpenTicketIfPossible(
  tx: Prisma.TransactionClient,
  ticketId: string,
): Promise<{ ok: true; status: SideBetTicketStatus } | { ok: false; reason: string }> {
  const ticket = await tx.sideBetTicket.findUnique({
    where: { id: ticketId },
    include: {
      sideBetMarket: {
        select: { eventId: true, lineupId: true, event: { select: { sportId: true } } },
      },
    },
  });

  if (!ticket) return { ok: false, reason: "TICKET_NOT_FOUND" };
  if (ticket.status !== SideBetTicketStatus.OPEN) {
    return { ok: true, status: ticket.status };
  }

  const eventParticipantIds = ticket.eventParticipantIds;
  if (!eventParticipantIds || eventParticipantIds.length === 0) {
    await tx.sideBetTicket.update({
      where: { id: ticketId },
      data: {
        status: SideBetTicketStatus.VOID,
        settlementNotes: { reason: "MISSING_EVENT_PARTICIPANT_IDS" },
      },
    });
    return { ok: true, status: SideBetTicketStatus.VOID };
  }

  const eventId = ticket.sideBetMarket.eventId;
  const sportId = ticket.sideBetMarket.event.sportId;
  const propBetModule = getPropBetModule(sportId);
  if (!propBetModule) {
    await tx.sideBetTicket.update({
      where: { id: ticketId },
      data: {
        status: SideBetTicketStatus.VOID,
        settlementNotes: { reason: "PROP_BETS_NOT_SUPPORTED_FOR_SPORT" },
      },
    });
    return { ok: true, status: SideBetTicketStatus.VOID };
  }

  const eventParticipants = await tx.eventParticipant.findMany({
    where: { eventId, id: { in: eventParticipantIds } },
  });

  if (eventParticipants.length !== eventParticipantIds.length) {
    await tx.sideBetTicket.update({
      where: { id: ticketId },
      data: {
        status: SideBetTicketStatus.VOID,
        settlementNotes: {
          reason: "PLACEMENT_PLAYERS_NOT_FOUND",
          expected: eventParticipantIds.length,
          found: eventParticipants.length,
        },
      },
    });
    return { ok: true, status: SideBetTicketStatus.VOID };
  }

  const sortedIds = [...eventParticipantIds].sort((a, b) => a.localeCompare(b));
  const byId = new Map(eventParticipants.map((row) => [row.id, row]));
  const leaderboardPositions = sortedIds.map((id) => {
    const row = byId.get(id);
    return row ? eventParticipantLeaderboardPosition(row) : null;
  });

  const ticketShell: PropBetTicketShell = {
    id: ticket.id,
    lineupId: ticket.sideBetMarket.lineupId,
    metadata: {
      hitsRequired: ticket.hitsRequired,
      topN: ticket.topN,
      eventParticipantIds: sortedIds,
    },
  };

  const resultsShell: PropBetResultsShell = {
    eventId,
    metadata: {
      leaderboardPositions,
    },
  };

  const grade = propBetModule.gradeTicket(ticketShell, resultsShell);
  const status = propBetGradeToTicketStatus(grade);
  const described = propBetModule.describeGrade?.(ticketShell, resultsShell) ?? null;

  await tx.sideBetTicket.update({
    where: { id: ticketId },
    data: {
      status,
      settlementNotes:
        status === SideBetTicketStatus.VOID
          ? ({ reason: "INDETERMINATE_POSITION" } satisfies Prisma.InputJsonObject)
          : ((described ?? {
              hitsRequired: ticket.hitsRequired,
              topN: ticket.topN,
            }) as Prisma.InputJsonValue),
    },
  });

  return { ok: true, status };
}
