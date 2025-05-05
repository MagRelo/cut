import { Team, TeamPlayer, Player } from '@prisma/client';
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
} from '../utils/errors.js';
import { TournamentStatus } from '../schemas/tournament.js';
import { prisma } from '../lib/prisma.js';

export interface CreateTeamDto {
  name: string;
  players: string[];
  color?: string;
}

export interface UpdateTeamDto {
  name?: string;
  players?: string[];
  color?: string;
}

export interface AddPlayerDto {
  name: string;
  leaderboardPosition?: string;
}

export interface UpdatePlayerDto {
  name?: string;
  isActive?: boolean;
  leaderboardPosition?: string;
  r1?: number;
  r2?: number;
  r3?: number;
  r4?: number;
  cut?: number;
  bonus?: number;
  total?: number;
}

type TeamWithPlayers = Team & {
  players: (TeamPlayer & {
    player: Player;
  })[];
  owner: {
    id: string;
    email: string;
    name: string;
  };
};

type TeamWithPlayersAndLeague = Team & {
  players: (TeamPlayer & {
    player: Player;
  })[];
  owner: {
    id: string;
    email: string;
    name: string;
  };
  league: {
    members: Array<{
      id: string;
      userId: string;
      leagueId: string;
      role: string;
      joinedAt: Date;
    }>;
    settings: {
      rosterSize: number;
      weeklyStarters: number;
    } | null;
  };
};

export class TeamService {
  private async verifyTeamOwnership(
    teamId: string,
    userId: string
  ): Promise<TeamWithPlayers> {
    // Fetch the team with owner and players
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        players: {
          include: {
            player: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    if (team.owner.id !== userId) {
      throw new UnauthorizedError('You are not the owner of this team');
    }

    // Find the LeagueTeam entry for this team
    const leagueTeam = await prisma.leagueTeam.findFirst({
      where: { teamId },
    });
    if (!leagueTeam) {
      throw new UnauthorizedError(
        'This team is not associated with any league'
      );
    }

    // Check that the user is a member of the league
    const membership = await prisma.leagueMembership.findUnique({
      where: {
        userId_leagueId: {
          userId,
          leagueId: leagueTeam.leagueId,
        },
      },
    });
    if (!membership) {
      throw new UnauthorizedError('You are not a member of this league');
    }

    return team as TeamWithPlayers;
  }

  async createTeam(
    userId: string,
    data: CreateTeamDto
  ): Promise<TeamWithPlayers> {
    // Check if user already has a team
    const existingTeam = await prisma.team.findFirst({
      where: { userId },
    });
    if (existingTeam) {
      throw new ValidationError('User already has a team');
    }

    // First, find all players by their IDs
    const players = await prisma.player.findMany({
      where: {
        id: {
          in: data.players,
        },
      },
    });

    if (players.length !== data.players.length) {
      throw new ValidationError('One or more players not found');
    }

    // Create team with players using their database IDs
    // NOTE: If you see a type error here about leagueId, run `npx prisma generate` to update the client after schema changes.
    const team = await prisma.team.create({
      data: {
        name: data.name,
        color: data.color,
        userId,
        players: {
          create: data.players.map((playerId) => ({
            playerId,
            active: true,
          })),
        },
      },
      include: {
        players: {
          include: {
            player: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return team as TeamWithPlayers;
  }

  async getTeam(teamId: string): Promise<TeamWithPlayers> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        players: {
          include: {
            player: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    return team as TeamWithPlayers;
  }

  // Get all teams for a specific league using LeagueTeam join table
  async getTeamsByLeague(leagueId: string): Promise<TeamWithPlayers[]> {
    const leagueTeams = await prisma.leagueTeam.findMany({
      where: { leagueId },
      include: {
        team: {
          include: {
            players: {
              include: {
                player: true,
              },
            },
            owner: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });
    // Map to just the team objects
    return leagueTeams.map((lt) => lt.team as TeamWithPlayers);
  }

  async updateTeam(
    teamId: string,
    userId: string,
    data: UpdateTeamDto
  ): Promise<TeamWithPlayers> {
    const team = await this.verifyTeamOwnership(teamId, userId);

    // If players are being updated, verify they exist
    let players: Player[] = [];
    if (data.players) {
      players = await prisma.player.findMany({
        where: {
          id: {
            in: data.players,
          },
        },
      });

      if (players.length !== data.players.length) {
        throw new ValidationError('One or more players not found');
      }
    }

    // Update team with transaction to handle both name and player updates
    const updatedTeam = await prisma.$transaction(async (tx) => {
      // If players are provided, first remove all existing players
      if (data.players) {
        await tx.teamPlayer.deleteMany({
          where: { teamId },
        });
      }

      // Update the team and add new players if provided
      return tx.team.update({
        where: { id: teamId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.color && { color: data.color }),
          ...(data.players && {
            players: {
              create: players.map((player) => ({
                player: {
                  connect: { id: player.id },
                },
                active: false,
              })),
            },
          }),
        },
        include: {
          players: {
            include: {
              player: true,
            },
          },
          owner: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    });

    return updatedTeam as TeamWithPlayers;
  }

  async deleteTeam(teamId: string, userId: string): Promise<void> {
    await this.verifyTeamOwnership(teamId, userId);

    await prisma.team.delete({
      where: { id: teamId },
    });
  }

  async addPlayer(
    teamId: string,
    userId: string,
    playerId: string
  ): Promise<TeamWithPlayers> {
    const team = await this.verifyTeamOwnership(teamId, userId);

    // Check if player is already on the team
    const existingPlayer = team.players.find((tp) => tp.player.id === playerId);
    if (existingPlayer) {
      throw new ValidationError('Player is already on the team');
    }

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        players: {
          create: {
            player: {
              connect: { id: playerId },
            },
            active: false,
          },
        },
      },
      include: {
        players: {
          include: {
            player: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return updatedTeam as TeamWithPlayers;
  }

  async removePlayer(
    teamId: string,
    userId: string,
    playerId: string
  ): Promise<TeamWithPlayers> {
    await this.verifyTeamOwnership(teamId, userId);

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        players: {
          delete: {
            teamId_playerId: {
              teamId,
              playerId,
            },
          },
        },
      },
      include: {
        players: {
          include: {
            player: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return updatedTeam as TeamWithPlayers;
  }

  async updatePlayer(
    teamId: string,
    userId: string,
    playerId: string,
    active: boolean
  ): Promise<TeamWithPlayers> {
    await this.verifyTeamOwnership(teamId, userId);

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        players: {
          update: {
            where: {
              teamId_playerId: {
                teamId,
                playerId,
              },
            },
            data: {
              active,
            },
          },
        },
      },
      include: {
        players: {
          include: {
            player: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return updatedTeam as TeamWithPlayers;
  }

  async setActivePlayers(
    teamId: string,
    userId: string,
    playerIds: string[]
  ): Promise<TeamWithPlayers> {
    const team = await this.verifyTeamOwnership(teamId, userId);

    // Get the leagueId via LeagueTeam
    const leagueTeam = await prisma.leagueTeam.findFirst({
      where: { teamId },
    });
    if (!leagueTeam) {
      throw new ValidationError('Team is not associated with a league');
    }

    // Get league settings for weekly starter limit
    const league = await prisma.league.findUnique({
      where: { id: leagueTeam.leagueId },
      include: { settings: true },
    });
    const weeklyStarterLimit = league?.settings?.weeklyStarters ?? 4;

    if (playerIds.length > weeklyStarterLimit) {
      throw new ValidationError(
        `Cannot activate more than ${weeklyStarterLimit} players per week`
      );
    }

    // Update all players to inactive first
    await prisma.teamPlayer.updateMany({
      where: { teamId },
      data: { active: false },
    });

    // Then set selected players to active
    if (playerIds.length > 0) {
      await prisma.teamPlayer.updateMany({
        where: {
          id: { in: playerIds },
          teamId,
        },
        data: { active: true },
      });
    }

    // Return updated team
    return this.getTeam(teamId);
  }

  // Create a new team for a user in a league
  async createTeamForUser(
    userId: string,
    leagueId: string,
    name: string,
    color?: string
  ) {
    // First verify user is a member of the league
    const membership = await prisma.leagueMembership.findUnique({
      where: {
        userId_leagueId: {
          userId,
          leagueId,
        },
      },
    });

    if (!membership) {
      throw new Error('User must be a league member to create a team');
    }

    // Check if user already has a team in this league
    const existingLeagueTeam = await prisma.leagueTeam.findFirst({
      where: {
        leagueId,
        team: { userId },
      },
    });

    if (existingLeagueTeam) {
      throw new Error('User already has a team in this league');
    }

    // Create the new team
    const team = await prisma.team.create({
      data: {
        name,
        color,
        userId,
      },
      include: {
        players: {
          include: {
            player: true,
          },
        },
      },
    });

    // Link the team to the league via LeagueTeam
    await prisma.leagueTeam.create({
      data: {
        leagueId,
        teamId: team.id,
      },
    });

    return team as TeamWithPlayers;
  }

  // Get all teams for a user
  async getUserTeams(userId: string) {
    return prisma.team.findMany({
      where: {
        userId,
      },
      include: {
        players: {
          include: {
            player: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  // Get a user's team for a specific league
  async getUserLeagueTeam(userId: string, leagueId: string) {
    const leagueTeam = await prisma.leagueTeam.findFirst({
      where: {
        leagueId,
        team: { userId },
      },
      include: {
        team: {
          include: {
            players: {
              include: {
                player: true,
              },
            },
            owner: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });
    return leagueTeam?.team ?? null;
  }

  // Update team details
  async updateTeamForUser(
    teamId: string,
    userId: string,
    data: { name: string }
  ) {
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        userId,
      },
    });

    if (!team) {
      throw new Error('Team not found or user not authorized');
    }

    return prisma.team.update({
      where: { id: teamId },
      data,
      include: {
        players: {
          include: {
            player: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  // Delete a team
  async deleteTeamForUser(teamId: string, userId: string) {
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        userId,
      },
    });

    if (!team) {
      throw new Error('Team not found or user not authorized');
    }

    // Delete all team players first
    await prisma.teamPlayer.deleteMany({
      where: { teamId },
    });

    // Then delete the team
    return prisma.team.delete({
      where: { id: teamId },
    });
  }
}
