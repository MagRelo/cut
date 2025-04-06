import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient, Prisma } from '@prisma/client';
import { TeamService } from '../teamService';
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
} from '../../utils/errors';

// Mock PrismaClient
vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    team: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    league: {
      findUnique: vi.fn(),
    },
  };
  return { PrismaClient: vi.fn(() => mockPrismaClient) };
});

describe('TeamService', () => {
  let teamService: TeamService;
  let prisma: PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = new PrismaClient();
    teamService = new TeamService();
  });

  const mockTeam = {
    id: 'team-1',
    name: 'Test Team',
    leagueId: 'league-1',
    players: [],
    users: [{ id: 'user-1' }],
    league: {
      id: 'league-1',
      members: [{ userId: 'user-1' }],
      teams: [],
      settings: {
        rosterSize: 8,
        weeklyStarters: 4,
      },
    },
  };

  describe('createTeam', () => {
    it('should create a team successfully', async () => {
      const createData = {
        name: 'New Team',
        leagueId: 'league-1',
      };

      (prisma.league.findUnique as any).mockResolvedValue({
        id: 'league-1',
        members: [{ userId: 'user-1' }],
        teams: [],
      });

      (prisma.team.create as any).mockResolvedValue({
        ...mockTeam,
        ...createData,
      });

      const result = await teamService.createTeam('user-1', createData);

      expect(result).toEqual({
        ...mockTeam,
        ...createData,
      });
      expect(prisma.team.create).toHaveBeenCalledWith({
        data: {
          ...createData,
          users: {
            connect: { id: 'user-1' },
          },
        },
        include: {
          players: true,
        },
      });
    });

    it('should throw UnauthorizedError if user is not a league member', async () => {
      (prisma.league.findUnique as any).mockResolvedValue({
        id: 'league-1',
        members: [],
        teams: [],
      });

      await expect(
        teamService.createTeam('user-1', {
          name: 'New Team',
          leagueId: 'league-1',
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw ValidationError if league has reached max teams', async () => {
      (prisma.league.findUnique as any).mockResolvedValue({
        id: 'league-1',
        maxTeams: 8,
        members: [{ userId: 'user-1' }],
        teams: Array(8).fill({ users: [] }), // Assuming maxTeams is 8
      });

      await expect(
        teamService.createTeam('user-1', {
          name: 'New Team',
          leagueId: 'league-1',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('updateTeam', () => {
    it('should update a team successfully', async () => {
      const updateData = { name: 'Updated Team' };

      (prisma.team.findUnique as any).mockResolvedValue(mockTeam);
      (prisma.team.update as any).mockResolvedValue({
        ...mockTeam,
        ...updateData,
      });

      const result = await teamService.updateTeam(
        'team-1',
        'user-1',
        updateData
      );

      expect(result).toEqual({
        ...mockTeam,
        ...updateData,
      });
      expect(prisma.team.update).toHaveBeenCalledWith({
        where: { id: 'team-1' },
        data: updateData,
        include: {
          players: true,
        },
      });
    });

    it('should throw NotFoundError if team does not exist', async () => {
      (prisma.team.findUnique as any).mockResolvedValue(null);

      await expect(
        teamService.updateTeam('team-1', 'user-1', { name: 'Updated Team' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteTeam', () => {
    it('should delete a team successfully', async () => {
      (prisma.team.findUnique as any).mockResolvedValue(mockTeam);
      (prisma.team.delete as any).mockResolvedValue(mockTeam);

      await teamService.deleteTeam('team-1', 'user-1');

      expect(prisma.team.delete).toHaveBeenCalledWith({
        where: { id: 'team-1' },
      });
    });
  });

  describe('getTeam', () => {
    it('should return a team successfully', async () => {
      (prisma.team.findUnique as any).mockResolvedValue(mockTeam);

      const result = await teamService.getTeam('team-1');

      expect(result).toEqual(mockTeam);
      expect(prisma.team.findUnique).toHaveBeenCalledWith({
        where: { id: 'team-1' },
        include: {
          players: true,
        },
      });
    });

    it('should throw NotFoundError if team does not exist', async () => {
      (prisma.team.findUnique as any).mockResolvedValue(null);

      await expect(teamService.getTeam('team-1')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('getTeamsByLeague', () => {
    it('should return all teams in a league', async () => {
      const mockTeams = [mockTeam, { ...mockTeam, id: 'team-2' }];
      (prisma.team.findMany as any).mockResolvedValue(mockTeams);

      const result = await teamService.getTeamsByLeague('league-1');

      expect(result).toEqual(mockTeams);
      expect(prisma.team.findMany).toHaveBeenCalledWith({
        where: { leagueId: 'league-1' },
        include: {
          players: true,
        },
      });
    });
  });

  describe('addPlayer', () => {
    it('should add a player successfully', async () => {
      const playerData = {
        name: 'Test Player',
        leaderboardPosition: 'G',
      };

      (prisma.team.findUnique as any).mockResolvedValue(mockTeam);
      (prisma.team.update as any).mockResolvedValue({
        ...mockTeam,
        players: [playerData],
      });

      const result = await teamService.addPlayer(
        'team-1',
        'user-1',
        playerData
      );

      expect(result.players).toHaveLength(1);
      expect(prisma.team.update).toHaveBeenCalledWith({
        where: { id: 'team-1' },
        data: {
          players: {
            create: playerData,
          },
        },
        include: {
          players: true,
        },
      });
    });

    it('should throw ValidationError if roster is full', async () => {
      const fullTeam = {
        ...mockTeam,
        players: Array(8).fill({}), // Assuming rosterSize is 8
      };

      (prisma.team.findUnique as any).mockResolvedValue(fullTeam);

      await expect(
        teamService.addPlayer('team-1', 'user-1', {
          name: 'Test Player 2',
          leaderboardPosition: 'G',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('removePlayer', () => {
    it('should remove a player successfully', async () => {
      (prisma.team.findUnique as any).mockResolvedValue(mockTeam);
      (prisma.team.update as any).mockResolvedValue({
        ...mockTeam,
        players: [],
      });

      await teamService.removePlayer('team-1', 'user-1', 'player-1');

      expect(prisma.team.update).toHaveBeenCalledWith({
        where: { id: 'team-1' },
        data: {
          players: {
            delete: { id: 'player-1' },
          },
        },
        include: {
          players: true,
        },
      });
    });
  });

  describe('updatePlayer', () => {
    it('should update a player successfully', async () => {
      const playerData = {
        name: 'Test Player',
        leaderboardPosition: 'G',
      };

      const updateData = {
        name: 'Updated Player',
        leaderboardPosition: 'G',
      };

      (prisma.team.findUnique as any).mockResolvedValue(mockTeam);
      (prisma.team.update as any).mockResolvedValue({
        ...mockTeam,
        players: [{ id: 'player-1', ...updateData }],
      });

      const result = await teamService.updatePlayer(
        'team-1',
        'user-1',
        'player-1',
        updateData
      );

      expect(result.players[0]).toEqual({
        id: 'player-1',
        name: 'Updated Player',
        leaderboardPosition: 'G',
      });
      expect(prisma.team.update).toHaveBeenCalledWith({
        where: { id: 'team-1' },
        data: {
          players: {
            update: {
              where: { id: 'player-1' },
              data: updateData,
            },
          },
        },
        include: {
          players: true,
        },
      });
    });

    it('should throw ValidationError if activating too many players', async () => {
      const teamWithActivePlayers = {
        ...mockTeam,
        players: Array(4).fill({ isActive: true }), // Assuming weeklyStarters is 4
      };

      (prisma.team.findUnique as any).mockResolvedValue(teamWithActivePlayers);

      await expect(
        teamService.updatePlayer('team-1', 'user-1', 'player-5', {
          isActive: true,
        })
      ).rejects.toThrow(ValidationError);
    });
  });
});
