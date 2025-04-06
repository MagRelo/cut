import { PrismaClient, Prisma } from '@prisma/client';
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
} from '../utils/errors';

const prisma = new PrismaClient();

export interface CreateTeamDto {
  name: string;
  leagueId: string;
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

type TeamWithPlayers = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  leagueId: string;
  players: Array<{
    id: string;
    name: string;
    isActive: boolean;
    leaderboardPosition: string | null;
    pgaTourId: string | null;
    r1: any | null;
    r2: any | null;
    r3: any | null;
    r4: any | null;
    cut: number | null;
    bonus: number | null;
    total: number | null;
    teamId: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
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
        players: true,
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

    return team;
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

    return prisma.team.create({
      data: {
        ...data,
        users: {
          connect: { id: userId },
        },
      },
      include: {
        players: true,
      },
    });
  }

  async updateTeam(
    teamId: string,
    userId: string,
    data: UpdateTeamDto
  ): Promise<TeamWithPlayers> {
    await this.verifyTeamOwnership(teamId, userId);

    return prisma.team.update({
      where: { id: teamId },
      data: {
        name: data.name,
      },
      include: {
        players: true,
      },
    });
  }

  async deleteTeam(teamId: string, userId: string): Promise<void> {
    await this.verifyTeamOwnership(teamId, userId);

    await prisma.team.delete({
      where: { id: teamId },
    });
  }

  async getTeam(teamId: string): Promise<TeamWithPlayers> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        players: true,
      },
    });

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    return team;
  }

  async getTeamsByLeague(leagueId: string): Promise<TeamWithPlayers[]> {
    return prisma.team.findMany({
      where: { leagueId },
      include: {
        players: true,
      },
    });
  }

  async addPlayer(
    teamId: string,
    userId: string,
    data: AddPlayerDto
  ): Promise<TeamWithPlayers> {
    const team = await this.verifyTeamOwnership(teamId, userId);

    // Check roster size limit
    if (team.players.length >= (team.league.settings?.rosterSize || 8)) {
      throw new ValidationError('Team has reached maximum roster size');
    }

    return prisma.team.update({
      where: { id: teamId },
      data: {
        players: {
          create: data,
        },
      },
      include: {
        players: true,
      },
    });
  }

  async removePlayer(
    teamId: string,
    userId: string,
    playerId: string
  ): Promise<TeamWithPlayers> {
    await this.verifyTeamOwnership(teamId, userId);

    return prisma.team.update({
      where: { id: teamId },
      data: {
        players: {
          delete: { id: playerId },
        },
      },
      include: {
        players: true,
      },
    });
  }

  async updatePlayer(
    teamId: string,
    userId: string,
    playerId: string,
    data: UpdatePlayerDto
  ): Promise<TeamWithPlayers> {
    const team = await this.verifyTeamOwnership(teamId, userId);

    // If updating active status, check weekly starter limit
    if (data.isActive !== undefined) {
      const weeklyStarterLimit = team.league.settings?.weeklyStarters ?? 4;
      const currentActiveCount = team.players.filter((p) => p.isActive).length;
      const targetPlayer = team.players.find((p) => p.id === playerId);

      if (
        data.isActive &&
        !targetPlayer?.isActive &&
        currentActiveCount >= weeklyStarterLimit
      ) {
        throw new ValidationError(
          `Cannot activate more than ${weeklyStarterLimit} players per week`
        );
      }
    }

    return prisma.team.update({
      where: { id: teamId },
      data: {
        players: {
          update: {
            where: { id: playerId },
            data,
          },
        },
      },
      include: {
        players: true,
      },
    });
  }

  async setActivePlayers(
    teamId: string,
    userId: string,
    playerIds: string[]
  ): Promise<TeamWithPlayers> {
    const team = await this.verifyTeamOwnership(teamId, userId);

    // Verify weekly starter limit
    const weeklyStarterLimit = team.league.settings?.weeklyStarters ?? 4;
    if (playerIds.length > weeklyStarterLimit) {
      throw new ValidationError(
        `Cannot activate more than ${weeklyStarterLimit} players per week`
      );
    }

    // Verify all players belong to the team
    const invalidPlayers = playerIds.filter(
      (id) => !team.players.some((p) => p.id === id)
    );
    if (invalidPlayers.length > 0) {
      throw new ValidationError('Some players do not belong to this team');
    }

    // Update all players' active status
    await prisma.player.updateMany({
      where: { teamId },
      data: { isActive: false },
    });

    if (playerIds.length > 0) {
      await prisma.player.updateMany({
        where: {
          id: { in: playerIds },
        },
        data: { isActive: true },
      });
    }

    return this.getTeam(teamId);
  }
}
