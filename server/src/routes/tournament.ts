import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { transformPlayerWithTournamentData } from "../utils/playerTransform.js";

const tournamentRouter = new Hono();

async function loadPlayersWithTournamentDataForTournament(tournamentId: string) {
  const players = await prisma.player.findMany({
    where: {
      inField: true,
      pga_pgaTourId: {
        not: null,
      },
    },
    select: {
      id: true,
      pga_pgaTourId: true,
      pga_imageUrl: true,
      pga_displayName: true,
      pga_firstName: true,
      pga_lastName: true,
      pga_shortName: true,
      pga_country: true,
      pga_countryFlag: true,
      pga_age: true,
      pga_owgr: true,
      pga_fedex: true,
      pga_performance: true,
      isActive: true,
      inField: true,
      createdAt: true,
      updatedAt: true,
      lastSyncedAt: true,
      tournamentPlayers: {
        where: {
          tournamentId,
        },
        select: {
          leaderboardPosition: true,
          r1: true,
          r2: true,
          r3: true,
          r4: true,
          rCurrent: true,
          cut: true,
          bonus: true,
          stableford: true,
          total: true,
          leaderboardTotal: true,
        },
      },
    },
  });

  return players.map((player: any) => transformPlayerWithTournamentData(player, tournamentId));
}

// Get active tournament metadata only (lightweight, for header + app shell)
tournamentRouter.get("/active/metadata", async (c) => {
  try {
    const tournament = await prisma.tournament.findFirst({
      where: { manualActive: true },
    });

    if (!tournament) {
      return c.json({ error: "No active tournament found" }, 404);
    }

    // Add cache headers - metadata changes infrequently
    c.header("Cache-Control", "public, max-age=300, stale-while-revalidate=120");

    return c.json({ tournament });
  } catch (error) {
    console.error("Error fetching active tournament metadata:", error);
    return c.json({ error: "Failed to fetch tournament" }, 500);
  }
});

// Leaderboard / lineup player payload for the active tournament (refetched frequently on client)
tournamentRouter.get("/active/players", async (c) => {
  try {
    const tournament = await prisma.tournament.findFirst({
      where: { manualActive: true },
    });

    if (!tournament) {
      return c.json({ error: "No active tournament found" }, 404);
    }

    const players = await loadPlayersWithTournamentDataForTournament(tournament.id);

    c.header("Cache-Control", "public, max-age=120, stale-while-revalidate=60");

    return c.json({ players });
  } catch (error) {
    console.error("Error fetching active tournament players:", error);
    return c.json({ error: "Failed to fetch tournament players" }, 500);
  }
});

export default tournamentRouter;
