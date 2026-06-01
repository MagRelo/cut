import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireTournamentEditable } from "../middleware/tournamentStatus.js";
import { tournamentPlayerInclude, lineupPlayersInclude } from "../utils/prismaIncludes.js";
import { transformLineupPlayer } from "../utils/playerTransform.js";
import { isDuplicateLineup } from "../utils/lineupValidation.js";
import {
  DUPLICATE_LINEUP_PREDICTION_MESSAGE,
  isValidWinningScorePrediction,
  randomWinningScorePrediction,
} from "../utils/winningScorePrediction.js";
import { formatContestResponse } from "./contest.js";
import { markSideBetMarketStaleAfterRosterChange } from "../services/sideBets/markSideBetMarketStaleAfterRosterChange.js";

const lineupRouter = new Hono();

function formatTournamentLineup(
  lineup: { id: string; name: string; winningScorePrediction: number | null },
  tournamentId: string,
  lineupEntries: Array<{ tournamentPlayer: Parameters<typeof transformLineupPlayer>[0]["tournamentPlayer"] }>,
) {
  return {
    id: lineup.id,
    name: lineup.name,
    winningScorePrediction: lineup.winningScorePrediction,
    players: lineupEntries.map((lineupPlayer) => transformLineupPlayer(lineupPlayer as any, tournamentId)),
  };
}

// Create a new lineup for a tournament
lineupRouter.post("/:tournamentId", requireAuth, requireTournamentEditable, async (c) => {
  try {
    const tournamentId = c.req.param("tournamentId");
    const body = await c.req.json();
    const { players, name = "My Lineup", winningScorePrediction: bodyPrediction } = body;
    const user = c.get("user");

    if (!Array.isArray(players) || players.length > 4) {
      return c.json({ error: "Players must be an array of 0-4 players" }, 400);
    }

    let winningScorePrediction: number;
    if (bodyPrediction !== undefined && bodyPrediction !== null) {
      if (!isValidWinningScorePrediction(bodyPrediction)) {
        return c.json({ error: "winningScorePrediction must be an integer from 1 to 250" }, 400);
      }
      winningScorePrediction = bodyPrediction;
    } else {
      winningScorePrediction = randomWinningScorePrediction();
    }

    const isDuplicate = await isDuplicateLineup(
      user.userId,
      tournamentId,
      players,
      winningScorePrediction,
    );
    if (isDuplicate) {
      return c.json({ error: DUPLICATE_LINEUP_PREDICTION_MESSAGE }, 400);
    }

    const tournamentLineup = await prisma.tournamentLineup.create({
      data: {
        tournamentId,
        userId: user.userId,
        name,
        winningScorePrediction,
      },
    });

    await prisma.tournamentLineupPlayer.deleteMany({
      where: {
        tournamentLineupId: tournamentLineup.id,
      },
    });

    const lineupEntries = await Promise.all(
      players.map(async (playerId: string) => {
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
      }),
    );

    const formattedLineup = formatTournamentLineup(
      tournamentLineup,
      tournamentId,
      lineupEntries,
    );

    await markSideBetMarketStaleAfterRosterChange(tournamentLineup.id);

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
    const body = await c.req.json();
    const { players, name, winningScorePrediction: bodyPrediction } = body;
    const user = c.get("user");

    if (!Array.isArray(players) || players.length > 4) {
      return c.json({ error: "Players must be an array of 0-4 players" }, 400);
    }

    if (bodyPrediction !== undefined && bodyPrediction !== null && !isValidWinningScorePrediction(bodyPrediction)) {
      return c.json({ error: "winningScorePrediction must be an integer from 1 to 250" }, 400);
    }

    const tournamentLineup = await prisma.tournamentLineup.findFirst({
      where: {
        id: lineupId,
        userId: user.userId,
      },
    });

    if (!tournamentLineup) {
      return c.json({ error: "Lineup not found" }, 404);
    }

    const winningScorePrediction =
      bodyPrediction !== undefined && bodyPrediction !== null
        ? bodyPrediction
        : tournamentLineup.winningScorePrediction;

    const isDuplicate = await isDuplicateLineup(
      user.userId,
      tournamentLineup.tournamentId,
      players,
      winningScorePrediction,
      lineupId,
    );
    if (isDuplicate) {
      return c.json({ error: DUPLICATE_LINEUP_PREDICTION_MESSAGE }, 400);
    }

    const updateData: { name?: string; winningScorePrediction?: number | null } = {};
    if (name) {
      updateData.name = name;
    }
    if (bodyPrediction !== undefined && bodyPrediction !== null) {
      updateData.winningScorePrediction = bodyPrediction;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.tournamentLineup.update({
        where: { id: lineupId },
        data: updateData,
      });
    }

    await prisma.tournamentLineupPlayer.deleteMany({
      where: {
        tournamentLineupId: tournamentLineup.id,
      },
    });

    const lineupEntries = await Promise.all(
      players.map(async (playerId: string) => {
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
      }),
    );

    const refreshedLineup = await prisma.tournamentLineup.findUniqueOrThrow({
      where: { id: lineupId },
    });

    const formattedLineup = formatTournamentLineup(
      refreshedLineup,
      tournamentLineup.tournamentId,
      lineupEntries,
    );

    await markSideBetMarketStaleAfterRosterChange(tournamentLineup.id);

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

    const formattedLineup = {
      id: lineup.id,
      name: lineup.name,
      winningScorePrediction: lineup.winningScorePrediction,
      players: lineup.players.map((lineupPlayer: any) =>
        transformLineupPlayer(lineupPlayer, lineup.tournamentId),
      ),
    };

    return c.json({ lineups: [formattedLineup] });
  } catch (error) {
    console.error("Error getting lineup:", error);
    return c.json({ error: "Failed to get lineup" }, 500);
  }
});

/** Nested contest payload aligned with GET /contests list (for entry counts, etc.). */
const contestSelectForLineupList = {
  id: true,
  name: true,
  description: true,
  tournamentId: true,
  userGroupId: true,
  endTime: true,
  address: true,
  chainId: true,
  status: true,
  settings: true,
  results: true,
  createdAt: true,
  updatedAt: true,
  contestLineups: {
    select: {
      id: true,
      contestId: true,
      userId: true,
      tournamentLineupId: true,
      position: true,
      score: true,
      status: true,
      entryId: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          settings: true,
        },
      },
    },
  },
} as const;

// Get all lineups for a tournament
lineupRouter.get("/:tournamentId", requireAuth, async (c) => {
  const tournamentId = c.req.param("tournamentId");
  const user = c.get("user");

  try {
    const lineups = await prisma.tournamentLineup.findMany({
      where: { tournamentId, userId: user.userId },
      include: {
        ...lineupPlayersInclude,
        contestLineups: {
          where: {
            contest: { tournamentId },
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                settings: true,
              },
            },
            contest: {
              select: contestSelectForLineupList,
            },
          },
        },
      },
    });

    const formattedLineups = lineups.map((lineup: any) => ({
      id: lineup.id,
      name: lineup.name,
      winningScorePrediction: lineup.winningScorePrediction,
      players: lineup.players.map((lineupPlayer: any) =>
        transformLineupPlayer(lineupPlayer, tournamentId),
      ),
      contestLineups: lineup.contestLineups.map((cl: any) => ({
        id: cl.id,
        contestId: cl.contestId,
        userId: cl.userId,
        tournamentLineupId: cl.tournamentLineupId,
        position: cl.position ?? 0,
        score: cl.score,
        status: cl.status,
        entryId: cl.entryId,
        createdAt: cl.createdAt,
        updatedAt: cl.updatedAt,
        user: cl.user,
        contest: formatContestResponse(cl.contest, tournamentId),
      })),
    }));

    return c.json({ lineups: formattedLineups });
  } catch (error) {
    console.error("Error getting lineups:", error);
    return c.json({ error: "Failed to get lineups" }, 500);
  }
});

export default lineupRouter;
