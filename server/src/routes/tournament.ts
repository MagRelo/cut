import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { transformPlayerWithTournamentData } from "../utils/playerTransform.js";
import {
  tournamentShellSelect,
  tournamentLiveSelect,
} from "../schemas/activeTournament.js";

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
          teeTimes: true,
        },
      },
    },
  });

  return players.map((player: any) => transformPlayerWithTournamentData(player, tournamentId));
}

async function findActiveTournament() {
  return prisma.tournament.findFirst({
    where: { manualActive: true },
  });
}

// Week/setup fields for header shell (init-tournament; long client cache)
tournamentRouter.get("/active/shell", async (c) => {
  try {
    const tournament = await prisma.tournament.findFirst({
      where: { manualActive: true },
      select: tournamentShellSelect,
    });

    if (!tournament) {
      return c.json({ error: "No active tournament found" }, 404);
    }

    // React Query caches shell for 24h; avoid HTTP caching — same URL must reflect
    // manualActive switches immediately (Chrome mobile aggressively caches public max-age).
    c.header("Cache-Control", "private, no-cache, must-revalidate");

    return c.json({ tournament });
  } catch (error) {
    console.error("Error fetching active tournament shell:", error);
    return c.json({ error: "Failed to fetch tournament shell" }, 500);
  }
});

// Cron-updated round status + player scores (single payload, 5 min client poll)
tournamentRouter.get("/active/live", async (c) => {
  try {
    const tournament = await findActiveTournament();

    if (!tournament) {
      return c.json({ error: "No active tournament found" }, 404);
    }

    const [liveTournament, players] = await Promise.all([
      prisma.tournament.findUnique({
        where: { id: tournament.id },
        select: tournamentLiveSelect,
      }),
      loadPlayersWithTournamentDataForTournament(tournament.id),
    ]);

    if (!liveTournament) {
      return c.json({ error: "No active tournament found" }, 404);
    }

    c.header("Cache-Control", "public, max-age=120, stale-while-revalidate=60");

    return c.json({ tournament: liveTournament, players });
  } catch (error) {
    console.error("Error fetching active tournament live data:", error);
    return c.json({ error: "Failed to fetch tournament live data" }, 500);
  }
});

export default tournamentRouter;
