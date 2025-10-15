import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { transformPlayerWithTournamentData } from "../utils/playerTransform.js";

const tournamentRouter = new Hono();

// Get active tournament
tournamentRouter.get("/active", async (c) => {
  try {
    const tournament = await prisma.tournament.findFirst({
      where: { manualActive: true },
    });

    if (!tournament) {
      return c.json({ error: "No active tournament found" }, 404);
    }

    const players = await prisma.player.findMany({
      where: {
        inField: true,
        pga_pgaTourId: {
          not: null,
        },
      },
      include: {
        tournamentPlayers: {
          where: {
            tournamentId: tournament.id,
          },
        },
      },
    });

    // Transform players to match PlayerWithTournamentData type
    const playersWithTournamentData = players.map((player) =>
      transformPlayerWithTournamentData(player, tournament.id)
    );

    // Fetch all contests for this tournament
    const contests = await prisma.contest.findMany({
      where: {
        tournamentId: tournament.id,
      },
      include: {
        _count: {
          select: {
            contestLineups: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return c.json({ tournament, players: playersWithTournamentData, contests });
  } catch (error) {
    console.error("Error fetching active tournament:", error);
    return c.json({ error: "Failed to fetch tournament" }, 500);
  }
});

export default tournamentRouter;
