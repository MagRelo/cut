import { PrismaClient, Prisma, Team, TeamPlayer, Player } from '@prisma/client';
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
} from '../utils/errors';

const prisma = new PrismaClient();

export interface CreateTeamDto {
  name: string;
  leagueId: string;
  players: string[];
}

export interface UpdateTeamDto {
  name?: string;
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
};

type TeamWithPlayersAndLeague = TeamWithPlayers & {
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
  ): Promise<TeamWithPlayersAndLeague> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        players: {
          include: {
            player: true,
          },
        },
        league: {
          include: {
            members: true,
            settings: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    const membership = team.league.members.find(
      (m: { userId: string }) => m.userId === userId
    );
    if (!membership) {
      throw new UnauthorizedError('You are not a member of this league');
    }

    return team as TeamWithPlayersAndLeague;
  }

  async createTeam(
    userId: string,
    data: CreateTeamDto
  ): Promise<TeamWithPlayers> {
    // Check if user is a member of the league
    const league = await prisma.league.findUnique({
      where: { id: data.leagueId },
      include: {
        members: true,
        teams: {
          include: {
            users: true,
          },
        },
      },
    });

    if (!league) {
      throw new NotFoundError('League not found');
    }

    const membership = league.members.find(
      (m: { userId: string }) => m.userId === userId
    );
    if (!membership) {
      throw new UnauthorizedError('You are not a member of this league');
    }

    // Check if league has reached max teams
    if (league.teams.length >= league.maxTeams) {
      throw new ValidationError('League has reached maximum number of teams');
    }

    // Check if user already has a team in this league
    const existingTeam = league.teams.find(
      (t: { users: Array<{ id: string }> }) =>
        t.users.some((u: { id: string }) => u.id === userId)
    );
    if (existingTeam) {
      throw new ValidationError('You already have a team in this league');
    }

    // First, find all players by their pgaTourIds
    const players = await prisma.player.findMany({
      where: {
        pgaTourId: {
          in: data.players,
        },
      },
    });

    if (players.length !== data.players.length) {
      throw new ValidationError('One or more players not found');
    }

    // Create team with players using their database IDs
    const team = await prisma.team.create({
      data: {
        name: data.name,
        leagueId: data.leagueId,
        users: {
          connect: { id: userId },
        },
        players: {
          create: players.map((player) => ({
            player: {
              connect: { id: player.id },
            },
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
      },
    });

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    return team as TeamWithPlayers;
  }

  async getTeamsByLeague(leagueId: string): Promise<TeamWithPlayers[]> {
    const teams = await prisma.team.findMany({
      where: { leagueId },
      include: {
        players: {
          include: {
            player: true,
          },
        },
      },
    });

    return teams as TeamWithPlayers[];
  }

  async updateTeam(
    teamId: string,
    userId: string,
    data: UpdateTeamDto
  ): Promise<TeamWithPlayers> {
    await this.verifyTeamOwnership(teamId, userId);

    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        name: data.name,
      },
      include: {
        players: {
          include: {
            player: true,
          },
        },
      },
    });

    return team as TeamWithPlayers;
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

    // Get league settings for weekly starter limit
    const weeklyStarterLimit = team.league.settings?.weeklyStarters ?? 4;

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
}
