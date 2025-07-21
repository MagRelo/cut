import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Create a new lineup for a tournament
router.post("/:tournamentId", requireAuth, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { players, name = "My Lineup" } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!Array.isArray(players) || players.length > 4) {
      return res.status(400).json({ error: "Players must be an array of 0-4 players" });
    }

    // Create a new tournament lineup
    const tournamentLineup = await prisma.tournamentLineup.create({
      data: {
        tournamentId,
        userId,
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
            tournamentPlayer: {
              include: {
                player: true,
              },
            },
          },
        });
      })
    );

    // Transform the data into TournamentLineup type
    const formattedLineup = {
      id: tournamentLineup.id,
      name: tournamentLineup.name,
      players: lineupEntries.map((lineupPlayer) => ({
        ...lineupPlayer.tournamentPlayer.player,
        tournamentId,
        tournamentData: {
          leaderboardPosition: lineupPlayer.tournamentPlayer.leaderboardPosition,
          r1: lineupPlayer.tournamentPlayer.r1,
          r2: lineupPlayer.tournamentPlayer.r2,
          r3: lineupPlayer.tournamentPlayer.r3,
          r4: lineupPlayer.tournamentPlayer.r4,
          cut: lineupPlayer.tournamentPlayer.cut,
          bonus: lineupPlayer.tournamentPlayer.bonus,
          total: lineupPlayer.tournamentPlayer.total,
          leaderboardTotal: lineupPlayer.tournamentPlayer.leaderboardTotal,
        },
      })),
    };

    res.json({ lineups: [formattedLineup] });
  } catch (error) {
    console.error("Error creating lineup:", error);
    res.status(500).json({ error: "Failed to create lineup" });
  }
});

// Update an existing lineup
router.put("/:lineupId", requireAuth, async (req, res) => {
  try {
    const { lineupId } = req.params;
    const { players, name } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!Array.isArray(players) || players.length > 4) {
      return res.status(400).json({ error: "Players must be an array of 0-4 players" });
    }

    // Get the existing tournament lineup
    const tournamentLineup = await prisma.tournamentLineup.findFirst({
      where: {
        id: lineupId,
        userId,
      },
    });

    if (!tournamentLineup) {
      return res.status(404).json({ error: "Lineup not found" });
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
            tournamentPlayer: {
              include: {
                player: true,
              },
            },
          },
        });
      })
    );

    // Transform the data into TournamentLineup type
    const formattedLineup = {
      id: tournamentLineup.id,
      name: tournamentLineup.name,
      players: lineupEntries.map((lineupPlayer) => ({
        ...lineupPlayer.tournamentPlayer.player,
        tournamentId: tournamentLineup.tournamentId,
        tournamentData: {
          leaderboardPosition: lineupPlayer.tournamentPlayer.leaderboardPosition,
          r1: lineupPlayer.tournamentPlayer.r1,
          r2: lineupPlayer.tournamentPlayer.r2,
          r3: lineupPlayer.tournamentPlayer.r3,
          r4: lineupPlayer.tournamentPlayer.r4,
          cut: lineupPlayer.tournamentPlayer.cut,
          bonus: lineupPlayer.tournamentPlayer.bonus,
          total: lineupPlayer.tournamentPlayer.total,
          leaderboardTotal: lineupPlayer.tournamentPlayer.leaderboardTotal,
        },
      })),
    };

    res.json({ lineups: [formattedLineup] });
  } catch (error) {
    console.error("Error updating lineup:", error);
    res.status(500).json({ error: "Failed to update lineup" });
  }
});

// Get a specific lineup by ID
router.get("/lineup/:lineupId", requireAuth, async (req, res) => {
  const { lineupId } = req.params;
  const userId = req.user?.userId;

  try {
    const lineup = await prisma.tournamentLineup.findFirst({
      where: {
        id: lineupId,
        userId,
      },
      include: {
        players: {
          include: {
            tournamentPlayer: {
              include: {
                player: true,
              },
            },
          },
        },
      },
    });

    if (!lineup) {
      return res.status(404).json({ error: "Lineup not found" });
    }

    // Transform the data into TournamentLineup type
    const formattedLineup = {
      id: lineup.id,
      name: lineup.name,
      players: lineup.players.map((lineupPlayer) => ({
        ...lineupPlayer.tournamentPlayer.player,
        tournamentId: lineup.tournamentId,
        tournamentData: {
          leaderboardPosition: lineupPlayer.tournamentPlayer.leaderboardPosition,
          r1: lineupPlayer.tournamentPlayer.r1,
          r2: lineupPlayer.tournamentPlayer.r2,
          r3: lineupPlayer.tournamentPlayer.r3,
          r4: lineupPlayer.tournamentPlayer.r4,
          cut: lineupPlayer.tournamentPlayer.cut,
          bonus: lineupPlayer.tournamentPlayer.bonus,
          total: lineupPlayer.tournamentPlayer.total,
          leaderboardTotal: lineupPlayer.tournamentPlayer.leaderboardTotal,
        },
      })),
    };

    res.json({ lineups: [formattedLineup] });
  } catch (error) {
    console.error("Error getting lineup:", error);
    res.status(500).json({ error: "Failed to get lineup" });
  }
});

// Get all lineups for a tournament
router.get("/:tournamentId", requireAuth, async (req, res) => {
  const { tournamentId } = req.params;
  const userId = req.user?.userId;

  try {
    const lineups = await prisma.tournamentLineup.findMany({
      where: { tournamentId, userId },
      include: {
        players: {
          include: {
            tournamentPlayer: {
              include: {
                player: true,
              },
            },
          },
        },
      },
    });

    // Transform the data into TournamentLineup type
    const formattedLineups = lineups.map((lineup) => ({
      id: lineup.id,
      name: lineup.name,
      players: lineup.players.map((lineupPlayer) => ({
        ...lineupPlayer.tournamentPlayer.player,
        tournamentId,
        tournamentData: {
          leaderboardPosition: lineupPlayer.tournamentPlayer.leaderboardPosition,
          r1: lineupPlayer.tournamentPlayer.r1,
          r2: lineupPlayer.tournamentPlayer.r2,
          r3: lineupPlayer.tournamentPlayer.r3,
          r4: lineupPlayer.tournamentPlayer.r4,
          cut: lineupPlayer.tournamentPlayer.cut,
          bonus: lineupPlayer.tournamentPlayer.bonus,
          total: lineupPlayer.tournamentPlayer.total,
          leaderboardTotal: lineupPlayer.tournamentPlayer.leaderboardTotal,
        },
      })),
    }));

    res.json({ lineups: formattedLineups });
  } catch (error) {
    console.error("Error getting lineups:", error);
    res.status(500).json({ error: "Failed to get lineups" });
  }
});

export default router;
