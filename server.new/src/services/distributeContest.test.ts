import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ethers } from "ethers";
import { distributeContest, calculatePayouts, ContestSettings } from "./distributeContest.js";

// Mock Prisma
vi.mock("../lib/prisma.js", () => ({
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

import { prisma } from "../lib/prisma.js";

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
    mockContestContract.distribute.mockResolvedValue({ wait: vi.fn().mockResolvedValue({}) });
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

    it("should skip contests with non-completed tournaments", async () => {
      const mockContests = [
        {
          id: "contest1",
          name: "Test Contest",
          status: "OPEN",
          address: "0x1234567890123456789012345678901234567890",
          tournament: { status: "IN_PROGRESS" },
          contestLineups: [],
        },
      ];

      (prisma.contest.findMany as any).mockResolvedValue(mockContests);

      await distributeContest();

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

      expect(mockContestContract.distribute).toHaveBeenCalledWith([]);
      expect(mockPlatformTokenContract.mintRewards).toHaveBeenCalledWith([], []);
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

      const payouts = await calculatePayouts(lineups, participants);

      expect(payouts).toEqual([0, 0]);
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

      const payouts = await calculatePayouts(lineups, participants);

      expect(payouts).toEqual([0, 0]);
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

      const payouts = await calculatePayouts(lineups, participants);

      expect(payouts).toEqual([0, 0]);
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

      const payouts = await calculatePayouts(lineups, participants);

      expect(payouts).toEqual([0, 0]);
    });

    it("should handle multiple winners (tie for first place)", async () => {
      const lineups = [
        {
          user: { walletAddress: "0x123" },
          score: 100,
          position: "1",
        },
        {
          user: { walletAddress: "0x456" },
          score: 100,
          position: "1", // Also position 1
        },
      ];
      const participants = ["0x123", "0x456", "0x789"];

      const payouts = await calculatePayouts(lineups, participants);

      // Current implementation only gives 100% to the first winner found
      // This might need to be updated to handle ties properly
      expect(payouts).toEqual([10000, 0, 0]);
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

      const payouts = await calculatePayouts(lineups, participants);

      expect(payouts).toEqual([0, 0]);
    });

    it("should throw error when winner is not in participants list", async () => {
      const lineups = [
        {
          user: { walletAddress: "0x999" },
          score: 100,
          position: "1",
        },
      ];
      const participants = ["0x123", "0x456"];

      await expect(calculatePayouts(lineups, participants)).rejects.toThrow(
        "Winner with wallet address 0x999 is not found in participants list"
      );
    });
  });

  describe("Normal Cases", () => {
    it("should correctly identify and payout the winner", async () => {
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
      const participants = ["0x123", "0x456"];

      const payouts = await calculatePayouts(lineups, participants);

      expect(payouts).toEqual([10000, 0]); // 100% to winner, 0% to others
    });

    it("should handle participants not in lineups", async () => {
      const lineups = [
        {
          user: { walletAddress: "0x123" },
          score: 100,
          position: "1",
        },
      ];
      const participants = ["0x123", "0x456", "0x789"]; // Extra participants

      const payouts = await calculatePayouts(lineups, participants);

      expect(payouts).toEqual([10000, 0, 0]);
    });
  });
});
