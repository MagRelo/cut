import {
  PrismaClient,
  League,
  LeagueSettings,
  LeagueMembership,
  User,
  Prisma,
  Team,
} from '@prisma/client';
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
} from '../utils/errors';

const prisma = new PrismaClient();

type LeagueWithMembers = Prisma.LeagueGetPayload<{
  include: { members: true };
}>;

type LeagueWithMembersAndSettings = Prisma.LeagueGetPayload<{
  include: { members: true; settings: true };
}>;

type LeagueWithAll = Prisma.LeagueGetPayload<{
  include: { members: true; settings: true; teams: true };
}>;

export interface CreateLeagueDto {
  name: string;
  description?: string;
  isPrivate?: boolean;
  maxTeams?: number;
}

export interface UpdateLeagueDto {
  name?: string;
  description?: string;
  isPrivate?: boolean;
  maxTeams?: number;
}

export interface UpdateSettingsDto {
  rosterSize?: number;
  weeklyStarters?: number;
  scoringType?: string;
  draftDate?: Date;
  seasonStart?: Date;
  seasonEnd?: Date;
}

export class LeagueService {
  private async verifyCommissioner(
    leagueId: string,
    userId: string
  ): Promise<LeagueWithMembers> {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { members: true },
    });

    if (!league) {
      throw new NotFoundError('League not found');
    }

    if (league.commissionerId !== userId) {
      throw new UnauthorizedError(
        'Only the commissioner can perform this action'
      );
    }

    return league;
  }

  async createLeague(
    userId: string,
    data: CreateLeagueDto
  ): Promise<LeagueWithMembersAndSettings> {
    return prisma.league.create({
      data: {
        ...data,
        commissionerId: userId,
        settings: { create: {} },
        members: {
          create: {
            userId,
            role: 'COMMISSIONER',
          },
        },
      },
      include: {
        settings: true,
        members: true,
      },
    });
  }

  async updateLeague(
    leagueId: string,
    userId: string,
    data: UpdateLeagueDto
  ): Promise<LeagueWithMembersAndSettings> {
    await this.verifyCommissioner(leagueId, userId);

    return prisma.league.update({
      where: { id: leagueId },
      data,
      include: {
        settings: true,
        members: true,
      },
    });
  }

  async deleteLeague(leagueId: string, userId: string): Promise<void> {
    await this.verifyCommissioner(leagueId, userId);

    await prisma.league.delete({
      where: { id: leagueId },
    });
  }

  async getLeague(leagueId: string): Promise<LeagueWithAll> {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        settings: true,
        members: true,
        teams: true,
      },
    });

    if (!league) {
      throw new NotFoundError('League not found');
    }

    return league;
  }

  async listLeagues(
    userId: string,
    includePrivate: boolean = false
  ): Promise<LeagueWithAll[]> {
    return prisma.league.findMany({
      where: {
        OR: [{ isPrivate: false }, { members: { some: { userId } } }],
      },
      include: {
        settings: true,
        members: true,
        teams: true,
      },
    });
  }

  async joinLeague(
    leagueId: string,
    userId: string
  ): Promise<Prisma.LeagueMembershipGetPayload<{}>> {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { members: true },
    });

    if (!league) {
      throw new NotFoundError('League not found');
    }

    if (league.isPrivate) {
      throw new ValidationError(
        'This league is private and requires an invitation'
      );
    }

    if (league.members.length >= league.maxTeams) {
      throw new ValidationError('League is full');
    }

    if (league.members.some((m) => m.userId === userId)) {
      throw new ValidationError('Already a member of this league');
    }

    return prisma.leagueMembership.create({
      data: {
        userId,
        leagueId,
        role: 'MEMBER',
      },
    });
  }

  async leaveLeague(leagueId: string, userId: string): Promise<void> {
    const membership = await prisma.leagueMembership.findUnique({
      where: {
        userId_leagueId: {
          userId,
          leagueId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundError('Not a member of this league');
    }

    if (membership.role === 'COMMISSIONER') {
      throw new ValidationError('Commissioner cannot leave the league');
    }

    // Find the user's team in this league
    const team = await prisma.team.findFirst({
      where: {
        leagueId,
        users: {
          some: {
            id: userId,
          },
        },
      },
    });

    // Use a transaction to ensure all operations succeed or fail together
    await prisma.$transaction(async (tx) => {
      if (team) {
        // Delete all TeamPlayer records for this team
        await tx.teamPlayer.deleteMany({
          where: { teamId: team.id },
        });

        // Delete the team itself
        await tx.team.delete({
          where: { id: team.id },
        });
      }

      // Delete the league membership
      await tx.leagueMembership.delete({
        where: {
          userId_leagueId: {
            userId,
            leagueId,
          },
        },
      });
    });
  }

  async updateMemberRole(
    leagueId: string,
    userId: string,
    targetUserId: string,
    newRole: string
  ): Promise<LeagueMembership> {
    await this.verifyCommissioner(leagueId, userId);

    return prisma.leagueMembership.update({
      where: {
        userId_leagueId: {
          userId: targetUserId,
          leagueId,
        },
      },
      data: { role: newRole },
    });
  }

  async updateSettings(
    leagueId: string,
    userId: string,
    data: UpdateSettingsDto
  ): Promise<LeagueSettings> {
    await this.verifyCommissioner(leagueId, userId);

    return prisma.leagueSettings.update({
      where: { leagueId },
      data,
    });
  }

  async getSettings(leagueId: string): Promise<LeagueSettings> {
    const settings = await prisma.leagueSettings.findUnique({
      where: { leagueId },
    });

    if (!settings) {
      throw new NotFoundError('League settings not found');
    }

    return settings;
  }
}
