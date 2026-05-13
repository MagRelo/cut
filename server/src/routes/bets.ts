import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { SideBetMarketStatus, SideBetTicketStatus } from "@prisma/client";
import { sideBetsEnabled } from "../services/sideBets/featureFlag.js";

const betsRouter = new Hono();

type PlacementPlayerDto = {
  id: string;
  firstName: string | null;
  lastName: string | null;
};

/** Sorted `TournamentPlayer.id` values for the side bet snapshot. */
function sortedPlayerIdsFromLineupPlayers(
  players: { tournamentPlayerId: string }[],
): string[] {
  return [...players.map((p) => p.tournamentPlayerId)].sort((a, b) => a.localeCompare(b));
}

async function placementPlayersMapForTickets(
  tournamentId: string,
  tickets: { id: string; playerIds: string[] }[],
): Promise<Map<string, PlacementPlayerDto[]>> {
  const allIds = [...new Set(tickets.flatMap((t) => t.playerIds))];
  const byTpId = new Map<string, PlacementPlayerDto>();
  if (allIds.length > 0) {
    const rows = await prisma.tournamentPlayer.findMany({
      where: { tournamentId, id: { in: allIds } },
      select: {
        id: true,
        player: { select: { pga_firstName: true, pga_lastName: true } },
      },
    });
    for (const r of rows) {
      byTpId.set(r.id, {
        id: r.id,
        firstName: r.player.pga_firstName ?? null,
        lastName: r.player.pga_lastName ?? null,
      });
    }
  }
  const out = new Map<string, PlacementPlayerDto[]>();
  for (const t of tickets) {
    const list = [...t.playerIds]
      .sort((a, b) => a.localeCompare(b))
      .map((id) => byTpId.get(id) ?? { id, firstName: null, lastName: null });
    out.set(t.id, list);
  }
  return out;
}

const placeTicketSchema = z.object({
  /** Resolves the live quote row at bet time (selection ids churn when `quoteVersion` bumps). */
  tournamentLineupId: z.string().min(1),
  hitsRequired: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  topN: z.union([z.literal(5), z.literal(10), z.literal(20)]),
  stakeAmount: z.number().finite().positive().min(0.01).max(1_000_000),
  /** Present when stake was already sent on-chain; on book failure we persist `REFUND_PENDING` on `SideBetTicket`. */
  transactionHashes: z.array(z.string().regex(/^0x[0-9a-fA-F]{64}$/)).optional(),
});

function mapPlacedTicketJson(ticket: {
  id: string;
  hitsRequired: number;
  topN: number;
  stakeAmount: number;
  decimalOddsAtPlacement: number;
  americanDisplayAtPlacement: string;
  quoteVersionAtPlacement: number;
  status: SideBetTicketStatus;
  playerIds: string[];
  placementPlayers: PlacementPlayerDto[];
}) {
  return {
    id: ticket.id,
    hitsRequired: ticket.hitsRequired,
    topN: ticket.topN,
    stakeAmount: ticket.stakeAmount,
    decimalOddsAtPlacement: ticket.decimalOddsAtPlacement,
    americanDisplayAtPlacement: ticket.americanDisplayAtPlacement,
    quoteVersionAtPlacement: ticket.quoteVersionAtPlacement,
    status: ticket.status,
    playerIds: ticket.playerIds,
    placementPlayers: ticket.placementPlayers,
  };
}

function errToMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

function thrownHttpCode(e: unknown): number | undefined {
  const c = (e as { code?: number }).code;
  if (typeof c === "number" && c >= 100 && c < 600) return c;
  return undefined;
}

async function persistRefundPendingTicket(params: {
  userId: string;
  chainId: number;
  tournamentLineupId: string;
  hitsRequired: 2 | 3 | 4;
  topN: 5 | 10 | 20;
  stakeAmount: number;
  transactionHashes: string[];
  cause: unknown;
}) {
  const normalized = params.transactionHashes.map((h) => h.toLowerCase());
  const primary = normalized[0]!;

  const existing = await prisma.sideBetTicket.findFirst({
    where: {
      userId: params.userId,
      fundingTxHash: primary,
      status: SideBetTicketStatus.REFUND_PENDING,
    },
    include: { sideBetMarket: { select: { tournamentId: true } } },
  });
  if (existing) return existing;

  const lineup = await prisma.tournamentLineup.findFirst({
    where: { id: params.tournamentLineupId, userId: params.userId },
    include: { players: true, sideBetMarket: true },
  });
  if (!lineup?.sideBetMarket) return null;

  const market = lineup.sideBetMarket;
  const playerIds =
    lineup.players.length === 4 ? sortedPlayerIdsFromLineupPlayers(lineup.players) : [];
  const httpStatus = thrownHttpCode(params.cause);
  const settlementNotes = {
    kind: "orphan_stake_after_transfer" as const,
    transactionHashes: normalized,
    chainId: params.chainId,
    httpStatus: httpStatus ?? null,
    ticketCreationError: errToMessage(params.cause),
  };

  return prisma.sideBetTicket.create({
    data: {
      sideBetMarketId: market.id,
      userId: params.userId,
      hitsRequired: params.hitsRequired,
      topN: params.topN,
      stakeAmount: params.stakeAmount,
      decimalOddsAtPlacement: 0,
      americanDisplayAtPlacement: "—",
      quoteVersionAtPlacement: market.quoteVersion,
      status: SideBetTicketStatus.REFUND_PENDING,
      settlementNotes,
      fundingTxHash: primary,
      ...(playerIds.length === 4 ? { playerIds } : {}),
    },
    include: { sideBetMarket: { select: { tournamentId: true } } },
  });
}

/** GET /api/bets/side/lineup/:lineupId/market */
betsRouter.get("/side/lineup/:lineupId/market", requireAuth, async (c) => {
  if (!sideBetsEnabled()) {
    return c.json({ error: "Side bets disabled" }, 403);
  }

  const user = c.get("user");
  const lineupId = c.req.param("lineupId");

  const lineup = await prisma.tournamentLineup.findFirst({
    where: { id: lineupId, userId: user.userId },
    include: {
      players: true,
      sideBetMarket: {
        include: {
          selections: true,
          tickets: { where: { userId: user.userId }, orderBy: { createdAt: "desc" } },
        },
      },
    },
  });

  if (!lineup) {
    return c.json({ error: "Lineup not found" }, 404);
  }

  const market = lineup.sideBetMarket;
  if (!market) {
    return c.json({
      bettable: false,
      marketStatus: null,
      unavailableReason: "NO_MARKET_ROW",
      quoteVersion: 0,
      selections: [],
      tickets: [],
    });
  }

  const selections = market.selections.filter((s) => s.quoteVersion === market.quoteVersion);

  const bettable =
    market.status === SideBetMarketStatus.OPEN &&
    lineup.players.length === 4 &&
    selections.length === 9;

  const placementById = await placementPlayersMapForTickets(
    lineup.tournamentId,
    market.tickets.map((t) => ({ id: t.id, playerIds: t.playerIds })),
  );

  return c.json({
    bettable,
    marketStatus: market.status,
    unavailableReason: market.unavailableReason,
    quoteVersion: market.quoteVersion,
    dgEventName: market.dgEventName,
    dgOddsLastUpdated: market.dgOddsLastUpdated,
    selections: selections.map((s) => ({
      id: s.id,
      hitsRequired: s.hitsRequired,
      topN: s.topN,
      decimalOdds: s.decimalOdds,
      americanDisplay: s.americanDisplay,
      rowLabel: hitsToRowLabel(s.hitsRequired),
      colLabel: topNToColLabel(s.topN),
    })),
    tickets: market.tickets.map((t) => ({
      id: t.id,
      hitsRequired: t.hitsRequired,
      topN: t.topN,
      stakeAmount: t.stakeAmount,
      decimalOddsAtPlacement: t.decimalOddsAtPlacement,
      americanDisplayAtPlacement: t.americanDisplayAtPlacement,
      quoteVersionAtPlacement: t.quoteVersionAtPlacement,
      status: t.status,
      createdAt: t.createdAt,
      playerIds: t.playerIds,
      placementPlayers: placementById.get(t.id) ?? [],
    })),
  });
});

function hitsToRowLabel(h: number): string {
  if (h === 2) return "2 of 4";
  if (h === 3) return "3 of 4";
  return "4 of 4";
}

function topNToColLabel(n: number): string {
  if (n === 5) return "Top 5";
  if (n === 10) return "Top 10";
  return "Top 20";
}

/** POST /api/bets/side/tickets */
betsRouter.post("/side/tickets", requireAuth, async (c) => {
  if (!sideBetsEnabled()) {
    return c.json({ error: "Side bets disabled" }, 403);
  }

  const user = c.get("user");
  const parsed = placeTicketSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }
  const { tournamentLineupId, hitsRequired, topN, stakeAmount, transactionHashes } = parsed.data;

  try {
    const ticket = await prisma.$transaction(async (tx) => {
      const lineup = await tx.tournamentLineup.findFirst({
        where: { id: tournamentLineupId, userId: user.userId },
        include: { players: true, sideBetMarket: true },
      });

      if (!lineup) {
        throw Object.assign(new Error("FORBIDDEN"), { code: 403 });
      }

      const market = lineup.sideBetMarket;
      if (!market) {
        throw Object.assign(new Error("NO_MARKET"), { code: 404 });
      }

      if (lineup.players.length !== 4) {
        throw Object.assign(new Error("LINEUP_NOT_FOUR_PLAYERS"), { code: 400 });
      }

      if (market.status !== SideBetMarketStatus.OPEN) {
        throw Object.assign(new Error("MARKET_NOT_OPEN"), { code: 409 });
      }

      const selection = await tx.sideBetSelection.findFirst({
        where: {
          sideBetMarketId: market.id,
          hitsRequired,
          topN,
          quoteVersion: market.quoteVersion,
        },
      });

      if (!selection) {
        throw Object.assign(new Error("SELECTION_NOT_FOUND"), { code: 409 });
      }

      const playerIds = sortedPlayerIdsFromLineupPlayers(lineup.players);

      return tx.sideBetTicket.create({
        data: {
          sideBetMarketId: market.id,
          userId: user.userId,
          hitsRequired: selection.hitsRequired,
          topN: selection.topN,
          stakeAmount,
          decimalOddsAtPlacement: selection.decimalOdds,
          americanDisplayAtPlacement: selection.americanDisplay,
          quoteVersionAtPlacement: market.quoteVersion,
          status: SideBetTicketStatus.OPEN,
          playerIds,
        },
        include: { sideBetMarket: { select: { tournamentId: true } } },
      });
    });

    const placementMap = await placementPlayersMapForTickets(
      ticket.sideBetMarket.tournamentId,
      [{ id: ticket.id, playerIds: ticket.playerIds }],
    );
    return c.json(
      mapPlacedTicketJson({
        id: ticket.id,
        hitsRequired: ticket.hitsRequired,
        topN: ticket.topN,
        stakeAmount: ticket.stakeAmount,
        decimalOddsAtPlacement: ticket.decimalOddsAtPlacement,
        americanDisplayAtPlacement: ticket.americanDisplayAtPlacement,
        quoteVersionAtPlacement: ticket.quoteVersionAtPlacement,
        status: ticket.status,
        playerIds: ticket.playerIds,
        placementPlayers: placementMap.get(ticket.id) ?? [],
      }),
    );
  } catch (e) {
    const txHashes = transactionHashes;
    if (txHashes && txHashes.length > 0) {
      try {
        const recovered = await persistRefundPendingTicket({
          userId: user.userId,
          chainId: user.chainId,
          tournamentLineupId,
          hitsRequired,
          topN,
          stakeAmount,
          transactionHashes: txHashes,
          cause: e,
        });
        if (recovered) {
          const placementMap = await placementPlayersMapForTickets(
            recovered.sideBetMarket.tournamentId,
            [{ id: recovered.id, playerIds: recovered.playerIds }],
          );
          return c.json(
            mapPlacedTicketJson({
              id: recovered.id,
              hitsRequired: recovered.hitsRequired,
              topN: recovered.topN,
              stakeAmount: recovered.stakeAmount,
              decimalOddsAtPlacement: recovered.decimalOddsAtPlacement,
              americanDisplayAtPlacement: recovered.americanDisplayAtPlacement,
              quoteVersionAtPlacement: recovered.quoteVersionAtPlacement,
              status: recovered.status,
              playerIds: recovered.playerIds,
              placementPlayers: placementMap.get(recovered.id) ?? [],
            }),
          );
        }
      } catch (persistErr) {
        console.error("[POST /bets/side/tickets] REFUND_PENDING persist failed", persistErr);
      }
    }

    const code = (e as { code?: number }).code;
    if (code === 404) {
      return c.json({ error: "No side bet market for this lineup" }, 404);
    }
    if (code === 403) return c.json({ error: "Forbidden" }, 403);
    if (code === 400) return c.json({ error: "Lineup must have four players" }, 400);
    if (code === 409) {
      const msg = e instanceof Error ? e.message : "Conflict";
      if (msg === "SELECTION_NOT_FOUND") {
        return c.json(
          { error: "That price is no longer available. Refresh and try again." },
          409,
        );
      }
      return c.json({ error: msg }, 409);
    }
    console.error("[POST /bets/side/tickets]", e);
    return c.json({ error: "Failed to place ticket" }, 500);
  }
});

/** GET /api/bets/side/tickets */
betsRouter.get("/side/tickets", requireAuth, async (c) => {
  if (!sideBetsEnabled()) {
    return c.json({ error: "Side bets disabled" }, 403);
  }

  const user = c.get("user");
  const lineupId = c.req.query("lineupId")?.trim();

  const tickets = await prisma.sideBetTicket.findMany({
    where: {
      userId: user.userId,
      ...(lineupId
        ? { sideBetMarket: { tournamentLineupId: lineupId } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      sideBetMarket: { select: { tournamentLineupId: true, tournamentId: true, status: true } },
    },
  });

  const byTournament = new Map<string, typeof tickets>();
  for (const t of tickets) {
    const tid = t.sideBetMarket.tournamentId;
    const list = byTournament.get(tid);
    if (list) list.push(t);
    else byTournament.set(tid, [t]);
  }

  const placementByTicketId = new Map<string, PlacementPlayerDto[]>();
  for (const [tid, group] of byTournament) {
    const m = await placementPlayersMapForTickets(
      tid,
      group.map((t) => ({ id: t.id, playerIds: t.playerIds })),
    );
    for (const [id, arr] of m) placementByTicketId.set(id, arr);
  }

  return c.json({
    tickets: tickets.map((t) => ({
      id: t.id,
      lineupId: t.sideBetMarket.tournamentLineupId,
      tournamentId: t.sideBetMarket.tournamentId,
      marketStatus: t.sideBetMarket.status,
      hitsRequired: t.hitsRequired,
      topN: t.topN,
      stakeAmount: t.stakeAmount,
      decimalOddsAtPlacement: t.decimalOddsAtPlacement,
      americanDisplayAtPlacement: t.americanDisplayAtPlacement,
      quoteVersionAtPlacement: t.quoteVersionAtPlacement,
      status: t.status,
      createdAt: t.createdAt,
      playerIds: t.playerIds,
      placementPlayers: placementByTicketId.get(t.id) ?? [],
    })),
  });
});

export default betsRouter;
