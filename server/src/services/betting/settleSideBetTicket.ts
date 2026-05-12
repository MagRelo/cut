import { SideBetTicketStatus, type Prisma } from "@prisma/client";

/**
 * Official finish position vs top-N threshold.
 * `null` = cannot grade conservatively (unknown position string).
 */
export function isFinishInTopN(
  leaderboardPosition: string | null | undefined,
  topN: number,
): boolean | null {
  if (leaderboardPosition == null || leaderboardPosition === "") return null;
  const u = leaderboardPosition.trim().toUpperCase();
  if (u === "CUT" || u === "WD" || u === "DQ" || u === "MDF" || u === "DNS") return false;
  const m = u.match(/^T?(\d+)$/);
  if (!m) return null;
  const n = parseInt(m[1]!, 10);
  if (!Number.isFinite(n)) return null;
  return n <= topN;
}

export async function settleOpenTicketIfPossible(
  tx: Prisma.TransactionClient,
  ticketId: string,
): Promise<{ ok: true; status: SideBetTicketStatus } | { ok: false; reason: string }> {
  const ticket = await tx.sideBetTicket.findUnique({
    where: { id: ticketId },
    include: {
      sideBetMarket: {
        include: {
          tournamentLineup: {
            include: {
              players: { include: { tournamentPlayer: true } },
            },
          },
        },
      },
    },
  });

  if (!ticket) return { ok: false, reason: "TICKET_NOT_FOUND" };
  if (ticket.status !== SideBetTicketStatus.OPEN) {
    return { ok: true, status: ticket.status };
  }

  const lineup = ticket.sideBetMarket.tournamentLineup;
  if (lineup.players.length !== 4) {
    await tx.sideBetTicket.update({
      where: { id: ticketId },
      data: {
        status: SideBetTicketStatus.VOID,
        settlementNotes: { reason: "LINEUP_NOT_FOUR" },
      },
    });
    return { ok: true, status: SideBetTicketStatus.VOID };
  }

  const sorted = [...lineup.players].sort((a, b) => a.id.localeCompare(b.id));
  const results: (boolean | null)[] = [];

  for (const lp of sorted) {
    const pos = lp.tournamentPlayer.leaderboardPosition;
    const r = isFinishInTopN(pos, ticket.topN);
    results.push(r);
  }

  if (results.some((r) => r === null)) {
    await tx.sideBetTicket.update({
      where: { id: ticketId },
      data: {
        status: SideBetTicketStatus.VOID,
        settlementNotes: { reason: "INDETERMINATE_POSITION" },
      },
    });
    return { ok: true, status: SideBetTicketStatus.VOID };
  }

  const hits = results.filter((r) => r === true).length;
  const won = hits >= ticket.hitsRequired;
  const status = won ? SideBetTicketStatus.WON : SideBetTicketStatus.LOST;

  await tx.sideBetTicket.update({
    where: { id: ticketId },
    data: {
      status,
      settlementNotes: { hits, hitsRequired: ticket.hitsRequired, topN: ticket.topN },
    },
  });

  return { ok: true, status };
}
