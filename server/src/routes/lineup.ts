import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireTournamentEditable } from "../middleware/tournamentStatus.js";
import { tournamentPlayerInclude, lineupPlayersInclude } from "../utils/prismaIncludes.js";
import { transformLineupPlayer } from "../utils/playerTransform.js";

const lineupRouter = new Hono();

// Create a new lineup for a tournament
lineupRouter.post("/:tournamentId", requireAuth, requireTournamentEditable, async (c) => {
  try {
    const tournamentId = c.req.param("tournamentId");
    const { players, name = "My Lineup" } = await c.req.json();
    const user = c.get("user");

    if (!Array.isArray(players) || players.length > 4) {
      return c.json({ error: "Players must be an array of 0-4 players" }, 400);
    }

    // Create a new tournament lineup
    const tournamentLineup = await prisma.tournamentLineup.create({
      data: {
        tournamentId,
        userId: user.userId,
        name,
      },
    });

    // Delete existing lineup players
    await prisma.tournamentLineupPlayer.deleteMany({
      where: {
        tournamentLineupId: tournamentLineup.id,
      },
    });

    // Create new lineup entries for each player
    const lineupEntries = await Promise.all(
      players.map(async (playerId) => {
        // Get the tournament player record
        const tournamentPlayer = await prisma.tournamentPlayer.findUnique({
          where: {
            tournamentId_playerId: {
              tournamentId,
              playerId,
            },
          },
          include: {
            player: true,
          },
        });

        if (!tournamentPlayer) {
          throw new Error(`Player ${playerId} is not in the tournament`);
        }

        return prisma.tournamentLineupPlayer.create({
          data: {
            tournamentLineupId: tournamentLineup.id,
            tournamentPlayerId: tournamentPlayer.id,
          },
          include: {
            tournamentPlayer: tournamentPlayerInclude,
          },
        });
      })
    );

    // Transform the data into TournamentLineup type
    const formattedLineup = {
      id: tournamentLineup.id,
      name: tournamentLineup.name,
      players: lineupEntries.map((lineupPlayer) =>
        transformLineupPlayer(lineupPlayer, tournamentId)
      ),
    };

    return c.json({ lineups: [formattedLineup] });
  } catch (error) {
    console.error("Error creating lineup:", error);
    return c.json({ error: "Failed to create lineup" }, 500);
  }
});

// Update an existing lineup
lineupRouter.put("/:lineupId", requireAuth, requireTournamentEditable, async (c) => {
  try {
    const lineupId = c.req.param("lineupId");
    const { players, name } = await c.req.json();
    const user = c.get("user");

    if (!Array.isArray(players) || players.length > 4) {
      return c.json({ error: "Players must be an array of 0-4 players" }, 400);
    }

    // Get the existing tournament lineup
    const tournamentLineup = await prisma.tournamentLineup.findFirst({
      where: {
        id: lineupId,
        userId: user.userId,
      },
    });

    if (!tournamentLineup) {
      return c.json({ error: "Lineup not found" }, 404);
    }

    // Update lineup name if provided
    if (name) {
      await prisma.tournamentLineup.update({
        where: { id: lineupId },
        data: { name },
      });
    }

    // Delete existing lineup players
    await prisma.tournamentLineupPlayer.deleteMany({
      where: {
        tournamentLineupId: tournamentLineup.id,
      },
    });

    // Create new lineup entries for each player
    const lineupEntries = await Promise.all(
      players.map(async (playerId) => {
        // Get the tournament player record
        const tournamentPlayer = await prisma.tournamentPlayer.findUnique({
          where: {
            tournamentId_playerId: {
              tournamentId: tournamentLineup.tournamentId,
              playerId,
            },
          },
          include: {
            player: true,
          },
        });

        if (!tournamentPlayer) {
          throw new Error(`Player ${playerId} is not in the tournament`);
        }

        return prisma.tournamentLineupPlayer.create({
          data: {
            tournamentLineupId: tournamentLineup.id,
            tournamentPlayerId: tournamentPlayer.id,
          },
          include: {
            tournamentPlayer: tournamentPlayerInclude,
          },
        });
      })
    );

    // Transform the data into TournamentLineup type
    const formattedLineup = {
      id: tournamentLineup.id,
      name: tournamentLineup.name,
      players: lineupEntries.map((lineupPlayer) =>
        transformLineupPlayer(lineupPlayer, tournamentLineup.tournamentId)
      ),
    };

    return c.json({ lineups: [formattedLineup] });
  } catch (error) {
    console.error("Error updating lineup:", error);
    return c.json({ error: "Failed to update lineup" }, 500);
  }
});

// Get a specific lineup by ID
lineupRouter.get("/lineup/:lineupId", requireAuth, async (c) => {
  const lineupId = c.req.param("lineupId");
  const user = c.get("user");

  try {
    const lineup = await prisma.tournamentLineup.findFirst({
      where: {
        id: lineupId,
        userId: user.userId,
      },
      include: lineupPlayersInclude,
    });

    if (!lineup) {
      return c.json({ error: "Lineup not found" }, 404);
    }

    // Transform the data into TournamentLineup type
    const formattedLineup = {
      id: lineup.id,
      name: lineup.name,
      players: lineup.players.map((lineupPlayer) =>
        transformLineupPlayer(lineupPlayer, lineup.tournamentId)
      ),
    };

    return c.json({ lineups: [formattedLineup] });
  } catch (error) {
    console.error("Error getting lineup:", error);
    return c.json({ error: "Failed to get lineup" }, 500);
  }
});

// Get all lineups for a tournament
lineupRouter.get("/:tournamentId", requireAuth, async (c) => {
  const tournamentId = c.req.param("tournamentId");
  const user = c.get("user");

  try {
    const lineups = await prisma.tournamentLineup.findMany({
      where: { tournamentId, userId: user.userId },
      include: lineupPlayersInclude,
    });

    // Transform the data into TournamentLineup type
    const formattedLineups = lineups.map((lineup) => ({
      id: lineup.id,
      name: lineup.name,
      players: lineup.players.map((lineupPlayer) =>
        transformLineupPlayer(lineupPlayer, tournamentId)
      ),
    }));

    return c.json({ lineups: formattedLineups });
  } catch (error) {
    console.error("Error getting lineups:", error);
    return c.json({ error: "Failed to get lineups" }, 500);
  }
});

export default lineupRouter;
