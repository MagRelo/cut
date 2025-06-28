import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ethers } from "ethers";

// Mock Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    contest: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock ethers
vi.mock("ethers", () => ({
  ethers: {
    JsonRpcProvider: vi.fn(),
    Wallet: vi.fn(),
    Contract: vi.fn(),
  },
}));

// Mock contract ABIs
vi.mock("../../../client/src/utils/contracts/Contest.json", () => ({
  default: {
    abi: [
      "function state() view returns (uint8)",
      "function participants() view returns (address[])",
      "function distribute(uint256[])",
    ],
  },
}));

vi.mock("../../../client/src/utils/contracts/PlatformToken.json", () => ({
  default: {
    abi: ["function mintRewards(address[], uint256[])"],
  },
}));

import { prisma } from "../../lib/prisma.js";
import { distributeContest, calculatePayouts, ContestSettings } from "./distributeContest.js";

describe("distributeContest", () => {
  const mockProvider = {};
  const mockWallet = {};
  const mockContestContract = {
    state: vi.fn(),
    participants: vi.fn(),
    distribute: vi.fn(),
  };
  const mockPlatformTokenContract = {
    mintRewards: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up environment variables for tests
    process.env.RPC_URL = "http://localhost:8545";
    process.env.ORACLE_PRIVATE_KEY =
      "0x1234567890123456789012345678901234567890123456789012345678901234";
    process.env.PLATFORM_TOKEN_ADDRESS = "0xPlatformTokenAddress";

    // Setup ethers mocks
    (ethers.JsonRpcProvider as any).mockReturnValue(mockProvider);
    (ethers.Wallet as any).mockReturnValue(mockWallet);
    (ethers.Contract as any).mockImplementation((address, abi, wallet) => {
      if (address === process.env.PLATFORM_TOKEN_ADDRESS) {
        return mockPlatformTokenContract;
      }
      return mockContestContract;
    });

    // Setup contract mocks
    mockContestContract.state.mockResolvedValue(0); // OPEN state
    mockContestContract.distribute.mockResolvedValue({
      wait: vi.fn().mockResolvedValue({}),
    });
    mockPlatformTokenContract.mintRewards.mockResolvedValue({
      wait: vi.fn().mockResolvedValue({}),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Edge Cases", () => {
    it("should handle no open contests", async () => {
      (prisma.contest.findMany as any).mockResolvedValue([]);

      await distributeContest();

      expect(prisma.contest.findMany).toHaveBeenCalledWith({
        where: { status: "OPEN" },
        include: {
          tournament: true,
          contestLineups: {
            include: { user: true },
            orderBy: { score: "desc" },
          },
        },
      });
      expect(mockContestContract.distribute).not.toHaveBeenCalled();
    });

    it("should skip contests that are not in OPEN state on blockchain", async () => {
      const mockContests = [
        {
          id: "contest1",
          name: "Test Contest",
          status: "OPEN",
          address: "0x1234567890123456789012345678901234567890",
          tournament: { status: "COMPLETED" },
          contestLineups: [],
        },
      ];

      (prisma.contest.findMany as any).mockResolvedValue(mockContests);
      mockContestContract.state.mockResolvedValue(1); // Not OPEN

      await distributeContest();

      expect(mockContestContract.distribute).not.toHaveBeenCalled();
    });

    it("should handle contests with no participants", async () => {
      const mockContests = [
        {
          id: "contest1",
          name: "Test Contest",
          status: "OPEN",
          address: "0x1234567890123456789012345678901234567890",
          tournament: { status: "COMPLETED" },
          contestLineups: [],
          settings: { fee: 100 },
        },
      ];

      (prisma.contest.findMany as any).mockResolvedValue(mockContests);
      mockContestContract.participants.mockResolvedValue([]);

      await distributeContest();

      // Should not call distribute since this will now throw an error
      expect(mockContestContract.distribute).not.toHaveBeenCalled();
      expect(mockPlatformTokenContract.mintRewards).not.toHaveBeenCalled();

      // Should update contest to ERROR status
      expect(prisma.contest.update).toHaveBeenCalledWith({
        where: { id: "contest1" },
        data: {
          status: "ERROR",
          results: {
            error:
              'Processing error: Data integrity error: No lineup found with position "1" (winner)',
            timestamp: expect.any(String),
          },
        },
      });
    });

    it("should handle contests with no lineups", async () => {
      const mockContests = [
        {
          id: "contest1",
          name: "Test Contest",
          status: "OPEN",
          address: "0x1234567890123456789012345678901234567890",
          tournament: { status: "COMPLETED" },
          contestLineups: [],
          settings: { fee: 100 },
        },
      ];

      const participants = ["0x123", "0x456"];
      (prisma.contest.findMany as any).mockResolvedValue(mockContests);
      mockContestContract.participants.mockResolvedValue(participants);

      await distributeContest();

      // Should not call distribute or mintRewards since this is now an error
      expect(mockContestContract.distribute).not.toHaveBeenCalled();
      expect(mockPlatformTokenContract.mintRewards).not.toHaveBeenCalled();

      // Should update contest to ERROR status
      expect(prisma.contest.update).toHaveBeenCalledWith({
        where: { id: "contest1" },
        data: {
          status: "ERROR",
          results: {
            error: "Data integrity error: Contest has participants but no lineups",
            timestamp: expect.any(String),
          },
        },
      });
    });

    it("should handle blockchain transaction failures", async () => {
      const mockContests = [
        {
          id: "contest1",
          name: "Test Contest",
          status: "OPEN",
          address: "0x1234567890123456789012345678901234567890",
          tournament: { status: "COMPLETED" },
          contestLineups: [
            {
              user: { walletAddress: "0x123" },
              score: 100,
              position: "1",
            },
          ],
          settings: { fee: 100 },
        },
      ];

      (prisma.contest.findMany as any).mockResolvedValue(mockContests);
      mockContestContract.participants.mockResolvedValue(["0x123"]);
      mockContestContract.distribute.mockRejectedValue(new Error("Transaction failed"));

      await distributeContest();

      // Should update contest to ERROR status instead of throwing
      expect(prisma.contest.update).toHaveBeenCalledWith({
        where: { id: "contest1" },
        data: {
          status: "ERROR",
          results: {
            error: "Processing error: Transaction failed",
            timestamp: expect.any(String),
          },
        },
      });
    });

    it("should handle missing contest settings", async () => {
      const mockContests = [
        {
          id: "contest1",
          name: "Test Contest",
          status: "OPEN",
          address: "0x1234567890123456789012345678901234567890",
          tournament: { status: "COMPLETED" },
          contestLineups: [
            {
              user: { walletAddress: "0x123" },
              score: 100,
              position: "1",
            },
          ],
          settings: null,
        },
      ];

      const participants = ["0x123"];
      (prisma.contest.findMany as any).mockResolvedValue(mockContests);
      mockContestContract.participants.mockResolvedValue(participants);

      await distributeContest();

      expect(mockPlatformTokenContract.mintRewards).toHaveBeenCalledWith(participants, [0]);
    });

    it("should handle case where winner is not in participants list", async () => {
      const mockContests = [
        {
          id: "contest1",
          name: "Test Contest",
          status: "OPEN",
          address: "0x1234567890123456789012345678901234567890",
          tournament: { status: "COMPLETED" },
          contestLineups: [
            {
              user: { walletAddress: "0x999" }, // Not in participants
              score: 100,
              position: "1",
            },
          ],
          settings: { fee: 100 },
        },
      ];

      const participants = ["0x123", "0x456"];
      (prisma.contest.findMany as any).mockResolvedValue(mockContests);
      mockContestContract.participants.mockResolvedValue(participants);

      await distributeContest();

      // Should not call distribute since an error should be thrown
      expect(mockContestContract.distribute).not.toHaveBeenCalled();

      // Should update contest to ERROR status
      expect(prisma.contest.update).toHaveBeenCalledWith({
        where: { id: "contest1" },
        data: {
          status: "ERROR",
          results: {
            error: expect.stringContaining(
              "Winner with wallet address 0x999 is not found in participants list"
            ),
            timestamp: expect.any(String),
          },
        },
      });
    });
  });

  describe("Payout Calculation", () => {
    it("should calculate payouts correctly for single winner", async () => {
      const mockContests = [
        {
          id: "contest1",
          name: "Test Contest",
          status: "OPEN",
          address: "0x1234567890123456789012345678901234567890",
          tournament: { status: "COMPLETED" },
          contestLineups: [
            {
              user: { walletAddress: "0x123" },
              score: 100,
              position: "1",
            },
            {
              user: { walletAddress: "0x456" },
              score: 90,
              position: "2",
            },
          ],
          settings: { fee: 100 },
        },
      ];

      const participants = ["0x123", "0x456"];
      (prisma.contest.findMany as any).mockResolvedValue(mockContests);
      mockContestContract.participants.mockResolvedValue(participants);

      await distributeContest();

      expect(mockContestContract.distribute).toHaveBeenCalledWith([10000, 0]);
    });

    it("should handle case-insensitive wallet address matching", async () => {
      const mockContests = [
        {
          id: "contest1",
          name: "Test Contest",
          status: "OPEN",
          address: "0x1234567890123456789012345678901234567890",
          tournament: { status: "COMPLETED" },
          contestLineups: [
            {
              user: { walletAddress: "0xABC123" },
              score: 100,
              position: "1",
            },
          ],
          settings: { fee: 100 },
        },
      ];

      const participants = ["0xabc123"]; // Lowercase
      (prisma.contest.findMany as any).mockResolvedValue(mockContests);
      mockContestContract.participants.mockResolvedValue(participants);

      await distributeContest();

      expect(mockContestContract.distribute).toHaveBeenCalledWith([10000]);
    });
  });

  describe("Database Updates", () => {
    it("should update contest status to SETTLED after successful distribution", async () => {
      const mockContests = [
        {
          id: "contest1",
          name: "Test Contest",
          status: "OPEN",
          address: "0x1234567890123456789012345678901234567890",
          tournament: { status: "COMPLETED" },
          contestLineups: [
            {
              user: { walletAddress: "0x123" },
              score: 100,
              position: "1",
            },
          ],
          settings: { fee: 100 },
        },
      ];

      const participants = ["0x123"];
      (prisma.contest.findMany as any).mockResolvedValue(mockContests);
      mockContestContract.participants.mockResolvedValue(participants);

      await distributeContest();

      expect(prisma.contest.update).toHaveBeenCalledWith({
        where: { id: "contest1" },
        data: {
          status: "SETTLED",
          results: {
            payouts: [10000],
            participants,
            distributeTx: expect.any(Object),
            mintTx: expect.any(Object),
          },
        },
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      (prisma.contest.findMany as any).mockRejectedValue(new Error("Database connection failed"));

      await expect(distributeContest()).rejects.toThrow("Database connection failed");
    });

    it("should handle missing environment variables", async () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv };
      delete process.env.ORACLE_PRIVATE_KEY;

      // Should return early without throwing when environment variables are missing
      await distributeContest();

      process.env = originalEnv;
    });
  });
});

describe("calculatePayouts", () => {
  describe("Edge Cases", () => {
    it("should handle empty lineups array", async () => {
      const lineups: any[] = [];
      const participants = ["0x123", "0x456"];

      await expect(calculatePayouts(lineups, participants)).rejects.toThrow(
        'Data integrity error: No lineup found with position "1" (winner)'
      );
    });

    it("should handle empty participants array", async () => {
      const lineups = [
        {
          user: { walletAddress: "0x123" },
          score: 100,
          position: "1",
        },
      ];
      const participants: string[] = [];

      await expect(calculatePayouts(lineups, participants)).rejects.toThrow(
        "Winner with wallet address 0x123 is not found in participants list"
      );
    });

    it("should handle lineups without position field", async () => {
      const lineups = [
        {
          user: { walletAddress: "0x123" },
          score: 100,
          // No position field
        },
      ];
      const participants = ["0x123", "0x456"];

      await expect(calculatePayouts(lineups, participants)).rejects.toThrow(
        "Data integrity error: Lineup missing position field"
      );
    });

    it("should handle lineups without user field", async () => {
      const lineups = [
        {
          // No user field
          score: 100,
          position: "1",
        },
      ];
      const participants = ["0x123", "0x456"];

      await expect(calculatePayouts(lineups, participants)).rejects.toThrow(
        "Data integrity error: Lineup missing user field"
      );
    });

    it("should handle lineups without walletAddress", async () => {
      const lineups = [
        {
          user: {
            /* No walletAddress */
          },
          score: 100,
          position: "1",
        },
      ];
      const participants = ["0x123", "0x456"];

      await expect(calculatePayouts(lineups, participants)).rejects.toThrow(
        "Data integrity error: Lineup missing walletAddress"
      );
    });

    it("should handle multiple winners (tie for first place) in small contests", async () => {
      const lineups = [
        {
          user: { walletAddress: "0x123" },
          score: 100,
          position: "1",
        },
        {
          user: { walletAddress: "0x456" },
          score: 100,
          position: "1", // Also position 1 - tie for first
        },
      ];
      const participants = ["0x123", "0x456", "0x789"]; // 3 participants < 10

      const payouts = await calculatePayouts(lineups, participants);

      // Each winner should get 50% of the 100% payout (5000 basis points each)
      expect(payouts).toEqual([5000, 5000, 0]);
    });

    it("should handle multiple winners (tie for first place) in large contests", async () => {
      const lineups = [
        {
          user: { walletAddress: "0x123" },
          score: 100,
          position: "1",
        },
        {
          user: { walletAddress: "0x456" },
          score: 100,
          position: "1", // Also position 1 - tie for first
        },
      ];
      const participants = [
        "0x123",
        "0x456",
        "0x789",
        "0xabc",
        "0xdef",
        "0xghi",
        "0xjkl",
        "0xmno",
        "0xpqr",
        "0xstu",
      ]; // 10 participants >= 10

      const payouts = await calculatePayouts(lineups, participants);

      // Each winner should get 50% of the 70% payout (3500 basis points each)
      expect(payouts).toEqual([3500, 3500, 0, 0, 0, 0, 0, 0, 0, 0]);
    });

    it("should handle tie for second place in large contests", async () => {
      const lineups = [
        {
          user: { walletAddress: "0x123" },
          score: 100,
          position: "1",
        },
        {
          user: { walletAddress: "0x456" },
          score: 90,
          position: "2",
        },
        {
          user: { walletAddress: "0x789" },
          score: 90,
          position: "2", // Tie for second place
        },
      ];
      const participants = [
        "0x123",
        "0x456",
        "0x789",
        "0xabc",
        "0xdef",
        "0xghi",
        "0xjkl",
        "0xmno",
        "0xpqr",
        "0xstu",
      ]; // 10 participants >= 10

      const payouts = await calculatePayouts(lineups, participants);

      // First place gets 70%, each second place gets 50% of 20% (1000 basis points each)
      expect(payouts).toEqual([7000, 1000, 1000, 0, 0, 0, 0, 0, 0, 0]);
    });

    it("should handle tie for third place in large contests", async () => {
      const lineups = [
        {
          user: { walletAddress: "0x123" },
          score: 100,
          position: "1",
        },
        {
          user: { walletAddress: "0x456" },
          score: 90,
          position: "2",
        },
        {
          user: { walletAddress: "0x789" },
          score: 80,
          position: "3",
        },
        {
          user: { walletAddress: "0xabc" },
          score: 80,
          position: "3", // Tie for third place
        },
      ];
      const participants = [
        "0x123",
        "0x456",
        "0x789",
        "0xabc",
        "0xdef",
        "0xghi",
        "0xjkl",
        "0xmno",
        "0xpqr",
        "0xstu",
      ]; // 10 participants >= 10

      const payouts = await calculatePayouts(lineups, participants);

      // First place gets 70%, second place gets 20%, each third place gets 50% of 10% (500 basis points each)
      expect(payouts).toEqual([7000, 2000, 500, 500, 0, 0, 0, 0, 0, 0]);
    });

    it("should handle three-way tie for first place in small contests", async () => {
      const lineups = [
        {
          user: { walletAddress: "0x123" },
          score: 100,
          position: "1",
        },
        {
          user: { walletAddress: "0x456" },
          score: 100,
          position: "1",
        },
        {
          user: { walletAddress: "0x789" },
          score: 100,
          position: "1", // Three-way tie for first
        },
      ];
      const participants = ["0x123", "0x456", "0x789"]; // 3 participants < 10

      const payouts = await calculatePayouts(lineups, participants);

      // Each winner should get 33.33% of the 100% payout (3333 basis points each, with rounding)
      expect(payouts).toEqual([3333, 3333, 3333]);
    });

    it("should handle three-way tie for first place in large contests", async () => {
      const lineups = [
        {
          user: { walletAddress: "0x123" },
          score: 100,
          position: "1",
        },
        {
          user: { walletAddress: "0x456" },
          score: 100,
          position: "1",
        },
        {
          user: { walletAddress: "0x789" },
          score: 100,
          position: "1", // Three-way tie for first
        },
      ];
      const participants = [
        "0x123",
        "0x456",
        "0x789",
        "0xabc",
        "0xdef",
        "0xghi",
        "0xjkl",
        "0xmno",
        "0xpqr",
        "0xstu",
      ]; // 10 participants >= 10

      const payouts = await calculatePayouts(lineups, participants);

      // Each winner should get 33.33% of the 70% payout (2333 basis points each, with rounding)
      expect(payouts).toEqual([2333, 2333, 2333, 0, 0, 0, 0, 0, 0, 0]);
    });

    it("should handle ties for multiple positions simultaneously", async () => {
      const lineups = [
        {
          user: { walletAddress: "0x123" },
          score: 100,
          position: "1",
        },
        {
          user: { walletAddress: "0x456" },
          score: 100,
          position: "1", // Tie for first
        },
        {
          user: { walletAddress: "0x789" },
          score: 90,
          position: "2",
        },
        {
          user: { walletAddress: "0xabc" },
          score: 90,
          position: "2", // Tie for second
        },
      ];
      const participants = [
        "0x123",
        "0x456",
        "0x789",
        "0xabc",
        "0xdef",
        "0xghi",
        "0xjkl",
        "0xmno",
        "0xpqr",
        "0xstu",
      ]; // 10 participants >= 10

      const payouts = await calculatePayouts(lineups, participants);

      // Each first place gets 50% of 70% (3500), each second place gets 50% of 20% (1000)
      expect(payouts).toEqual([3500, 3500, 1000, 1000, 0, 0, 0, 0, 0, 0]);
    });

    it('should handle case where no lineup has position "1"', async () => {
      const lineups = [
        {
          user: { walletAddress: "0x123" },
          score: 100,
          position: "2",
        },
        {
          user: { walletAddress: "0x456" },
          score: 90,
          position: "3",
        },
      ];
      const participants = ["0x123", "0x456"];

      await expect(calculatePayouts(lineups, participants)).rejects.toThrow(
        'Data integrity error: No lineup found with position "1" (winner)'
      );
    });

    it("should throw error when winner is not in participants list", async () => {
      const lineups = [
        {
          user: { walletAddress: "0x999" },
          score: 100,
          position: "1",
        },
      ];
      const participants = ["0x123", "0x456"]; // 2 participants < 10

      await expect(calculatePayouts(lineups, participants)).rejects.toThrow(
        "Winner with wallet address 0x999 is not found in participants list"
      );
    });

    it("should throw error when first place is not in participants list for large contests", async () => {
      const lineups = [
        {
          user: { walletAddress: "0x999" },
          score: 100,
          position: "1",
        },
      ];
      const participants = [
        "0x123",
        "0x456",
        "0x789",
        "0xabc",
        "0xdef",
        "0xghi",
        "0xjkl",
        "0xmno",
        "0xpqr",
        "0xstu",
      ]; // 10 participants >= 10

      await expect(calculatePayouts(lineups, participants)).rejects.toThrow(
        "Winner with wallet address 0x999 is not found in participants list"
      );
    });

    it("should throw error when second place is not in participants list for large contests", async () => {
      const lineups = [
        {
          user: { walletAddress: "0x123" },
          score: 100,
          position: "1",
        },
        {
          user: { walletAddress: "0x999" },
          score: 90,
          position: "2",
        },
      ];
      const participants = [
        "0x123",
        "0x456",
        "0x789",
        "0xabc",
        "0xdef",
        "0xghi",
        "0xjkl",
        "0xmno",
        "0xpqr",
        "0xstu",
      ]; // 10 participants >= 10

      await expect(calculatePayouts(lineups, participants)).rejects.toThrow(
        "Second place with wallet address 0x999 is not found in participants list"
      );
    });

    it("should throw error when third place is not in participants list for large contests", async () => {
      const lineups = [
        {
          user: { walletAddress: "0x123" },
          score: 100,
          position: "1",
        },
        {
          user: { walletAddress: "0x456" },
          score: 90,
          position: "2",
        },
        {
          user: { walletAddress: "0x999" },
          score: 80,
          position: "3",
        },
      ];
      const participants = [
        "0x123",
        "0x456",
        "0x789",
        "0xabc",
        "0xdef",
        "0xghi",
        "0xjkl",
        "0xmno",
        "0xpqr",
        "0xstu",
      ]; // 10 participants >= 10

      await expect(calculatePayouts(lineups, participants)).rejects.toThrow(
        "Third place with wallet address 0x999 is not found in participants list"
      );
    });
  });

  describe("Normal Cases", () => {
    it("should correctly identify and payout the winner for small contests (<10 participants)", async () => {
      const lineups = [
        {
          user: { walletAddress: "0x123" },
          score: 100,
          position: "1",
        },
        {
          user: { walletAddress: "0x456" },
          score: 90,
          position: "2",
        },
      ];
      const participants = ["0x123", "0x456"]; // 2 participants < 10

      const payouts = await calculatePayouts(lineups, participants);

      expect(payouts).toEqual([10000, 0]); // 100% to winner, 0% to others
    });

    it("should correctly payout top 3 for large contests (>=10 participants)", async () => {
      const lineups = [
        {
          user: { walletAddress: "0x123" },
          score: 100,
          position: "1",
        },
        {
          user: { walletAddress: "0x456" },
          score: 90,
          position: "2",
        },
        {
          user: { walletAddress: "0x789" },
          score: 80,
          position: "3",
        },
        {
          user: { walletAddress: "0xabc" },
          score: 70,
          position: "4",
        },
      ];
      const participants = [
        "0x123",
        "0x456",
        "0x789",
        "0xabc",
        "0xdef",
        "0xghi",
        "0xjkl",
        "0xmno",
        "0xpqr",
        "0xstu",
      ]; // 10 participants >= 10

      const payouts = await calculatePayouts(lineups, participants);

      expect(payouts).toEqual([7000, 2000, 1000, 0, 0, 0, 0, 0, 0, 0]); // 70% to 1st, 20% to 2nd, 10% to 3rd
    });

    it("should handle large contests with missing second place", async () => {
      const lineups = [
        {
          user: { walletAddress: "0x123" },
          score: 100,
          position: "1",
        },
        {
          user: { walletAddress: "0x789" },
          score: 80,
          position: "3",
        },
      ];
      const participants = [
        "0x123",
        "0x456",
        "0x789",
        "0xabc",
        "0xdef",
        "0xghi",
        "0xjkl",
        "0xmno",
        "0xpqr",
        "0xstu",
      ]; // 10 participants

      const payouts = await calculatePayouts(lineups, participants);

      expect(payouts).toEqual([7000, 0, 1000, 0, 0, 0, 0, 0, 0, 0]); // 70% to 1st, 10% to 3rd, 2nd gets 0
    });

    it("should handle large contests with missing third place", async () => {
      const lineups = [
        {
          user: { walletAddress: "0x123" },
          score: 100,
          position: "1",
        },
        {
          user: { walletAddress: "0x456" },
          score: 90,
          position: "2",
        },
      ];
      const participants = [
        "0x123",
        "0x456",
        "0x789",
        "0xabc",
        "0xdef",
        "0xghi",
        "0xjkl",
        "0xmno",
        "0xpqr",
        "0xstu",
      ]; // 10 participants

      const payouts = await calculatePayouts(lineups, participants);

      expect(payouts).toEqual([7000, 2000, 0, 0, 0, 0, 0, 0, 0, 0]); // 70% to 1st, 20% to 2nd, 3rd gets 0
    });

    it("should handle participants not in lineups", async () => {
      const lineups = [
        {
          user: { walletAddress: "0x123" },
          score: 100,
          position: "1",
        },
      ];
      const participants = ["0x123", "0x456", "0x789"]; // 3 participants < 10

      const payouts = await calculatePayouts(lineups, participants);

      expect(payouts).toEqual([10000, 0, 0]); // 100% to winner for small contest
    });

    it("should handle large contests with participants not in lineups", async () => {
      const lineups = [
        {
          user: { walletAddress: "0x123" },
          score: 100,
          position: "1",
        },
        {
          user: { walletAddress: "0x456" },
          score: 90,
          position: "2",
        },
        {
          user: { walletAddress: "0x789" },
          score: 80,
          position: "3",
        },
      ];
      const participants = [
        "0x123",
        "0x456",
        "0x789",
        "0xabc",
        "0xdef",
        "0xghi",
        "0xjkl",
        "0xmno",
        "0xpqr",
        "0xstu",
        "0xvwx",
      ]; // 11 participants >= 10

      const payouts = await calculatePayouts(lineups, participants);

      expect(payouts).toEqual([7000, 2000, 1000, 0, 0, 0, 0, 0, 0, 0, 0]); // 70% to 1st, 20% to 2nd, 10% to 3rd
    });
  });
});
