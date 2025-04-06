import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ScoreUpdateService } from '../scoreUpdateService';
import { fetchScorecard } from '../../lib/scorecard';

// Mock PrismaClient and fetchScorecard
vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    player: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $executeRaw: vi.fn(),
  };
  return { PrismaClient: vi.fn(() => mockPrismaClient) };
});

vi.mock('../../lib/scorecard', () => ({
  fetchScorecard: vi.fn(),
}));

describe('ScoreUpdateService', () => {
  let scoreUpdateService: ScoreUpdateService;
  let prisma: PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = new PrismaClient();
    scoreUpdateService = new ScoreUpdateService();
  });

  const mockRoundData = {
    holes: {
      holes: [1, 2, 3],
      pars: [4, 4, 3],
      scores: [4, 3, 3],
      stableford: [0, 2, 0],
    },
    total: 2,
    ratio: 1,
    icon: '',
  };

  const mockScorecard = {
    playerId: '57975',
    playerName: 'Test Player',
    tournamentId: 'T123',
    tournamentName: 'Test Tournament',
    R1: mockRoundData,
    R2: mockRoundData,
    R3: null,
    R4: null,
    stablefordTotal: 4,
  };

  const mockPlayer = {
    id: 'player-1',
    name: 'Test Player',
    isActive: true,
    pgaTourId: '57975',
    r1: null,
    r2: null,
    r3: null,
    r4: null,
    total: 0,
    teamId: 'team-1',
    team: {
      id: 'team-1',
      name: 'Test Team',
    },
  };

  describe('updateAllScores', () => {
    it('should update scores for all active players', async () => {
      (prisma.player.findMany as any).mockResolvedValue([mockPlayer]);
      (fetchScorecard as any).mockResolvedValue(mockScorecard);

      await scoreUpdateService.updateAllScores('T123');

      expect(prisma.player.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          pgaTourId: {
            not: null,
          },
        },
        include: {
          team: true,
        },
      });

      const executeRawCall = (prisma.$executeRaw as any).mock.calls[0];
      expect(executeRawCall[0].join('')).toContain('UPDATE "Player"');
      expect(executeRawCall[1]).toEqual(JSON.stringify(mockRoundData));
      expect(executeRawCall[2]).toEqual(JSON.stringify(mockRoundData));
      expect(executeRawCall[3]).toBeNull();
      expect(executeRawCall[4]).toBeNull();
      expect(executeRawCall[5]).toBe(4);
      expect(executeRawCall[6]).toBe('player-1');
    });

    it('should handle null round data correctly', async () => {
      (prisma.player.findMany as any).mockResolvedValue([mockPlayer]);
      (fetchScorecard as any).mockResolvedValue({
        ...mockScorecard,
        R1: null,
        R2: null,
      });

      await scoreUpdateService.updateAllScores('T123');

      const executeRawCall = (prisma.$executeRaw as any).mock.calls[0];
      expect(executeRawCall[0].join('')).toContain('UPDATE "Player"');
      expect(executeRawCall[1]).toBeNull();
      expect(executeRawCall[2]).toBeNull();
      expect(executeRawCall[3]).toBeNull();
      expect(executeRawCall[4]).toBeNull();
      expect(executeRawCall[5]).toBe(4);
      expect(executeRawCall[6]).toBe('player-1');
    });

    it('should skip players without pgaTourId', async () => {
      const playerWithoutPgaTourId = { ...mockPlayer, pgaTourId: null };
      (prisma.player.findMany as any).mockResolvedValue([
        playerWithoutPgaTourId,
      ]);

      await scoreUpdateService.updateAllScores('T123');

      expect(fetchScorecard).not.toHaveBeenCalled();
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });

    it('should handle errors during score update', async () => {
      (prisma.player.findMany as any).mockResolvedValue([mockPlayer]);
      (fetchScorecard as any).mockRejectedValue(new Error('API Error'));

      await scoreUpdateService.updateAllScores('T123');

      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });
  });
});
