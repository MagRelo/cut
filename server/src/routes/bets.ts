import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { SideBetMarketStatus, SideBetTicketStatus } from "@prisma/client";
import { sideBetsEnabled } from "../services/sideBets/featureFlag.js";
import {
  placementPlayersMapForTickets,
  sortedEventParticipantIds,
  type PlacementPlayerDto,
} from "../services/sideBets/lineupSideBetUtils.js";

const betsRouter = new Hono();

const placeTicketSchema = z.object({
  lineupId: z.string().min(1),
  hitsRequired: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  topN: z.union([z.literal(5), z.literal(10), z.literal(20)]),
  stakeAmount: z.number().finite().positive().min(0.01).max(1_000_000),
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
  eventParticipantIds: string[];
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
    playerIds: ticket.eventParticipantIds,
    placementPlayers: ticket.placementPlayers,
  };
}

function errToMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

function thrownHttpCode(e: unknown): number | undefined {
  const code = (e as { code?: number }).code;
  if (typeof code === "number" && code >= 100 && code < 600) return code;
  return undefined;
}

async function persistRefundPendingTicket(params: {
  userId: string;
  chainId: number;
  lineupId: string;
  hitsRequired: 2 | 3 | 4;
  topN: 5 | 10 | 20;
  stakeAmount: number;
  transactionHashes: string[];
  cause: unknown;
}) {
  const normalized = params.transactionHashes.map((hash) => hash.toLowerCase());
  const primary = normalized[0]!;

  const existing = await prisma.sideBetTicket.findFirst({
    where: {
      userId: params.userId,
      fundingTxHash: primary,
      status: SideBetTicketStatus.REFUND_PENDING,
    },
    include: { sideBetMarket: { select: { eventId: true } } },
  });
  if (existing) return existing;

  const lineup = await prisma.lineup.findFirst({
    where: { id: params.lineupId, userId: params.userId },
    include: {
      picks: true,
      sideBetMarket: true,
    },
  });
  if (!lineup?.sideBetMarket) return null;

  const market = lineup.sideBetMarket;
  const eventParticipantIds =
    lineup.picks.length === 4 ? sortedEventParticipantIds(lineup.picks) : [];
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
      ...(eventParticipantIds.length === 4 ? { eventParticipantIds } : {}),
    },
    include: { sideBetMarket: { select: { eventId: true } } },
  });
}

/** GET /api/bets/side/lineup/:lineupId/market */
betsRouter.get("/side/lineup/:lineupId/market", requireAuth, async (c) => {
  if (!sideBetsEnabled()) {
    return c.json({ error: "Side bets disabled" }, 403);
  }

  const user = c.get("user");
  const lineupId = c.req.param("lineupId");

  const lineup = await prisma.lineup.findFirst({
    where: { id: lineupId, userId: user.userId },
    include: {
      picks: true,
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

  const selections = market.selections.filter(
    (selection) => selection.quoteVersion === market.quoteVersion,
  );

  const bettable =
    market.status === SideBetMarketStatus.OPEN &&
    lineup.picks.length === 4 &&
    selections.length === 9;

  const placementById = await placementPlayersMapForTickets(
    market.eventId,
    market.tickets.map((ticket) => ({
      id: ticket.id,
      eventParticipantIds: ticket.eventParticipantIds,
    })),
  );

  return c.json({
    bettable,
    marketStatus: market.status,
    unavailableReason: market.unavailableReason,
    quoteVersion: market.quoteVersion,
    dgEventName: market.dgEventName,
    dgOddsLastUpdated: market.dgOddsLastUpdated,
    selections: selections.map((selection) => ({
      id: selection.id,
      hitsRequired: selection.hitsRequired,
      topN: selection.topN,
      decimalOdds: selection.decimalOdds,
      americanDisplay: selection.americanDisplay,
      rowLabel: hitsToRowLabel(selection.hitsRequired),
      colLabel: topNToColLabel(selection.topN),
    })),
    tickets: market.tickets.map((ticket) => ({
      id: ticket.id,
      hitsRequired: ticket.hitsRequired,
      topN: ticket.topN,
      stakeAmount: ticket.stakeAmount,
      decimalOddsAtPlacement: ticket.decimalOddsAtPlacement,
      americanDisplayAtPlacement: ticket.americanDisplayAtPlacement,
      quoteVersionAtPlacement: ticket.quoteVersionAtPlacement,
      status: ticket.status,
      createdAt: ticket.createdAt,
      playerIds: ticket.eventParticipantIds,
      placementPlayers: placementById.get(ticket.id) ?? [],
    })),
  });
});

function hitsToRowLabel(hits: number): string {
  if (hits === 2) return "2 of 4";
  if (hits === 3) return "3 of 4";
  return "4 of 4";
}

function topNToColLabel(topN: number): string {
  if (topN === 5) return "Top 5";
  if (topN === 10) return "Top 10";
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

  const lineupId = parsed.data.lineupId;

  const { hitsRequired, topN, stakeAmount, transactionHashes } = parsed.data;

  try {
    const ticket = await prisma.$transaction(async (tx) => {
      const lineup = await tx.lineup.findFirst({
        where: { id: lineupId, userId: user.userId },
        include: { picks: true, sideBetMarket: true },
      });

      if (!lineup) {
        throw Object.assign(new Error("FORBIDDEN"), { code: 403 });
      }

      const market = lineup.sideBetMarket;
      if (!market) {
        throw Object.assign(new Error("NO_MARKET"), { code: 404 });
      }

      if (lineup.picks.length !== 4) {
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

      const eventParticipantIds = sortedEventParticipantIds(lineup.picks);

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
          eventParticipantIds,
        },
        include: { sideBetMarket: { select: { eventId: true } } },
      });
    });

    const placementMap = await placementPlayersMapForTickets(ticket.sideBetMarket.eventId, [
      { id: ticket.id, eventParticipantIds: ticket.eventParticipantIds },
    ]);
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
        eventParticipantIds: ticket.eventParticipantIds,
        placementPlayers: placementMap.get(ticket.id) ?? [],
      }),
    );
  } catch (e) {
    if (transactionHashes && transactionHashes.length > 0) {
      try {
        const recovered = await persistRefundPendingTicket({
          userId: user.userId,
          chainId: user.chainId,
          lineupId,
          hitsRequired,
          topN,
          stakeAmount,
          transactionHashes,
          cause: e,
        });
        if (recovered) {
          const placementMap = await placementPlayersMapForTickets(
            recovered.sideBetMarket.eventId,
            [{ id: recovered.id, eventParticipantIds: recovered.eventParticipantIds }],
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
              eventParticipantIds: recovered.eventParticipantIds,
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
      ...(lineupId ? { sideBetMarket: { lineupId } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      sideBetMarket: { select: { lineupId: true, eventId: true, status: true } },
    },
  });

  const byEvent = new Map<string, typeof tickets>();
  for (const ticket of tickets) {
    const eventId = ticket.sideBetMarket.eventId;
    const list = byEvent.get(eventId);
    if (list) list.push(ticket);
    else byEvent.set(eventId, [ticket]);
  }

  const placementByTicketId = new Map<string, PlacementPlayerDto[]>();
  for (const [eventId, group] of byEvent) {
    const mapped = await placementPlayersMapForTickets(
      eventId,
      group.map((ticket) => ({
        id: ticket.id,
        eventParticipantIds: ticket.eventParticipantIds,
      })),
    );
    for (const [id, players] of mapped) placementByTicketId.set(id, players);
  }

  return c.json({
    tickets: tickets.map((ticket) => ({
      id: ticket.id,
      lineupId: ticket.sideBetMarket.lineupId,
      eventId: ticket.sideBetMarket.eventId,
      marketStatus: ticket.sideBetMarket.status,
      hitsRequired: ticket.hitsRequired,
      topN: ticket.topN,
      stakeAmount: ticket.stakeAmount,
      decimalOddsAtPlacement: ticket.decimalOddsAtPlacement,
      americanDisplayAtPlacement: ticket.americanDisplayAtPlacement,
      quoteVersionAtPlacement: ticket.quoteVersionAtPlacement,
      status: ticket.status,
      createdAt: ticket.createdAt,
      playerIds: ticket.eventParticipantIds,
      placementPlayers: placementByTicketId.get(ticket.id) ?? [],
    })),
  });
});

export default betsRouter;
