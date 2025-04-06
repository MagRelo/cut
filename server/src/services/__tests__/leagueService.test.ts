import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient, Prisma } from '@prisma/client';
import { LeagueService } from '../leagueService';
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
} from '../../utils/errors';

// Mock PrismaClient
vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    league: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    leagueMembership: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    leagueSettings: {
      update: vi.fn(),
    },
  };
  return { PrismaClient: vi.fn(() => mockPrismaClient) };
});

describe('LeagueService', () => {
  let leagueService: LeagueService;
  let prisma: PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = new PrismaClient();
    leagueService = new LeagueService();
  });

  const mockLeague = {
    id: 'league-1',
    name: 'Test League',
    description: 'Test Description',
    isPrivate: false,
    maxTeams: 8,
    commissionerId: 'user-1',
    members: [
      {
        userId: 'user-1',
        leagueId: 'league-1',
        role: 'COMMISSIONER',
      },
    ],
    settings: {
      leagueId: 'league-1',
      rosterSize: 8,
      weeklyStarters: 4,
      scoringType: 'STROKE_PLAY',
    },
    teams: [],
  };

  describe('createLeague', () => {
    it('should create a league successfully', async () => {
      const createData = {
        name: 'New League',
        description: 'New Description',
        isPrivate: false,
        maxTeams: 8,
      };

      (prisma.league.create as any).mockResolvedValue({
        ...mockLeague,
        ...createData,
      });

      const result = await leagueService.createLeague('user-1', createData);

      expect(result).toEqual({
        ...mockLeague,
        ...createData,
      });
      expect(prisma.league.create).toHaveBeenCalledWith({
        data: {
          ...createData,
          commissionerId: 'user-1',
          settings: { create: {} },
          members: {
            create: {
              userId: 'user-1',
              role: 'COMMISSIONER',
            },
          },
        },
        include: {
          settings: true,
          members: true,
        },
      });
    });
  });

  describe('updateLeague', () => {
    it('should update a league successfully', async () => {
      const updateData = { name: 'Updated League' };

      (prisma.league.findUnique as any).mockResolvedValue(mockLeague);
      (prisma.league.update as any).mockResolvedValue({
        ...mockLeague,
        ...updateData,
      });

      const result = await leagueService.updateLeague(
        'league-1',
        'user-1',
        updateData
      );

      expect(result).toEqual({
        ...mockLeague,
        ...updateData,
      });
      expect(prisma.league.update).toHaveBeenCalledWith({
        where: { id: 'league-1' },
        data: updateData,
        include: {
          settings: true,
          members: true,
        },
      });
    });

    it('should throw UnauthorizedError if user is not commissioner', async () => {
      (prisma.league.findUnique as any).mockResolvedValue({
        ...mockLeague,
        commissionerId: 'user-2',
      });

      await expect(
        leagueService.updateLeague('league-1', 'user-1', {
          name: 'Updated League',
        })
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('deleteLeague', () => {
    it('should delete a league successfully', async () => {
      (prisma.league.findUnique as any).mockResolvedValue(mockLeague);
      (prisma.league.delete as any).mockResolvedValue(mockLeague);

      await leagueService.deleteLeague('league-1', 'user-1');

      expect(prisma.league.delete).toHaveBeenCalledWith({
        where: { id: 'league-1' },
      });
    });
  });

  describe('getLeague', () => {
    it('should return a league successfully', async () => {
      (prisma.league.findUnique as any).mockResolvedValue(mockLeague);

      const result = await leagueService.getLeague('league-1');

      expect(result).toEqual(mockLeague);
      expect(prisma.league.findUnique).toHaveBeenCalledWith({
        where: { id: 'league-1' },
        include: {
          settings: true,
          members: true,
          teams: true,
        },
      });
    });

    it('should throw NotFoundError if league does not exist', async () => {
      (prisma.league.findUnique as any).mockResolvedValue(null);

      await expect(leagueService.getLeague('league-1')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('listLeagues', () => {
    it('should return all leagues for a user', async () => {
      const mockLeagues = [mockLeague, { ...mockLeague, id: 'league-2' }];
      (prisma.league.findMany as any).mockResolvedValue(mockLeagues);

      const result = await leagueService.listLeagues('user-1');

      expect(result).toEqual(mockLeagues);
      expect(prisma.league.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { isPrivate: false },
            { members: { some: { userId: 'user-1' } } },
          ],
        },
        include: {
          settings: true,
          members: true,
          teams: true,
        },
      });
    });
  });

  describe('joinLeague', () => {
    it('should allow a user to join a public league', async () => {
      const mockMembership = {
        userId: 'user-2',
        leagueId: 'league-1',
        role: 'MEMBER',
      };

      (prisma.league.findUnique as any).mockResolvedValue({
        ...mockLeague,
        members: [mockLeague.members[0]],
      });
      (prisma.leagueMembership.create as any).mockResolvedValue(mockMembership);

      const result = await leagueService.joinLeague('league-1', 'user-2');

      expect(result).toEqual(mockMembership);
      expect(prisma.leagueMembership.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-2',
          leagueId: 'league-1',
          role: 'MEMBER',
        },
      });
    });

    it('should throw ValidationError if league is private', async () => {
      (prisma.league.findUnique as any).mockResolvedValue({
        ...mockLeague,
        isPrivate: true,
      });

      await expect(
        leagueService.joinLeague('league-1', 'user-2')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if league is full', async () => {
      (prisma.league.findUnique as any).mockResolvedValue({
        ...mockLeague,
        members: Array(8).fill({}), // Assuming maxTeams is 8
      });

      await expect(
        leagueService.joinLeague('league-1', 'user-2')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('leaveLeague', () => {
    it('should allow a member to leave a league', async () => {
      (prisma.leagueMembership.findUnique as any).mockResolvedValue({
        userId: 'user-2',
        leagueId: 'league-1',
        role: 'MEMBER',
      });

      await leagueService.leaveLeague('league-1', 'user-2');

      expect(prisma.leagueMembership.delete).toHaveBeenCalledWith({
        where: {
          userId_leagueId: {
            userId: 'user-2',
            leagueId: 'league-1',
          },
        },
      });
    });

    it('should throw ValidationError if commissioner tries to leave', async () => {
      (prisma.leagueMembership.findUnique as any).mockResolvedValue({
        userId: 'user-1',
        leagueId: 'league-1',
        role: 'COMMISSIONER',
      });

      await expect(
        leagueService.leaveLeague('league-1', 'user-1')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('updateMemberRole', () => {
    it('should update a member role successfully', async () => {
      const mockMembership = {
        userId: 'user-2',
        leagueId: 'league-1',
        role: 'CO_COMMISSIONER',
      };

      (prisma.league.findUnique as any).mockResolvedValue(mockLeague);
      (prisma.leagueMembership.update as any).mockResolvedValue(mockMembership);

      const result = await leagueService.updateMemberRole(
        'league-1',
        'user-1',
        'user-2',
        'CO_COMMISSIONER'
      );

      expect(result).toEqual(mockMembership);
      expect(prisma.leagueMembership.update).toHaveBeenCalledWith({
        where: {
          userId_leagueId: {
            userId: 'user-2',
            leagueId: 'league-1',
          },
        },
        data: { role: 'CO_COMMISSIONER' },
      });
    });
  });

  describe('updateSettings', () => {
    it('should update league settings successfully', async () => {
      const updateData = {
        rosterSize: 10,
        weeklyStarters: 5,
      };

      (prisma.league.findUnique as any).mockResolvedValue(mockLeague);
      (prisma.leagueSettings.update as any).mockResolvedValue({
        ...mockLeague.settings,
        ...updateData,
      });

      const result = await leagueService.updateSettings(
        'league-1',
        'user-1',
        updateData
      );

      expect(result).toEqual({
        ...mockLeague.settings,
        ...updateData,
      });
      expect(prisma.leagueSettings.update).toHaveBeenCalledWith({
        where: { leagueId: 'league-1' },
        data: updateData,
      });
    });
  });
});
