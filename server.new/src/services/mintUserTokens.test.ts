import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ethers } from "ethers";

// Mock ethers
vi.mock("ethers", () => ({
  ethers: {
    JsonRpcProvider: vi.fn(),
    Wallet: vi.fn(),
    Contract: vi.fn(),
    isAddress: vi.fn(),
    parseUnits: vi.fn(),
  },
}));

// Mock contract ABIs
vi.mock("../../contracts/PlatformToken.json", () => ({
  default: {
    abi: ["function mint(address, uint256)"],
  },
}));

import { mintUserTokens } from "./mintUserTokens.js";

describe("mintUserTokens", () => {
  const mockProvider = {};
  const mockWallet = {};
  const mockPlatformTokenContract = {
    mint: vi.fn(),
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
    (ethers.Contract as any).mockReturnValue(mockPlatformTokenContract);
    (ethers.isAddress as any).mockReturnValue(true);
    (ethers.parseUnits as any).mockReturnValue("25000000000000000000"); // 25 tokens with 18 decimals

    // Setup contract mocks
    mockPlatformTokenContract.mint.mockResolvedValue({
      hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      wait: vi.fn().mockResolvedValue({}),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Success cases", () => {
    it("should mint tokens to a valid wallet address", async () => {
      const walletAddress = "0x1234567890123456789012345678901234567890";
      const amount = 25;

      const result = await mintUserTokens(walletAddress, amount);

      expect(ethers.isAddress).toHaveBeenCalledWith(walletAddress);
      expect(ethers.parseUnits).toHaveBeenCalledWith("25", 18);
      expect(mockPlatformTokenContract.mint).toHaveBeenCalledWith(
        walletAddress,
        "25000000000000000000"
      );
      expect(result).toEqual({
        success: true,
        transactionHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        amount: 25,
        recipient: walletAddress,
      });
    });

    it("should use default amount of 25 when no amount is provided", async () => {
      const walletAddress = "0x1234567890123456789012345678901234567890";

      await mintUserTokens(walletAddress);

      expect(ethers.parseUnits).toHaveBeenCalledWith("25", 18);
      expect(mockPlatformTokenContract.mint).toHaveBeenCalledWith(
        walletAddress,
        "25000000000000000000"
      );
    });
  });

  describe("Error cases", () => {
    it("should throw error for invalid wallet address", async () => {
      const invalidAddress = "invalid-address";
      (ethers.isAddress as any).mockReturnValue(false);

      await expect(mintUserTokens(invalidAddress)).rejects.toThrow(
        "Invalid wallet address: invalid-address"
      );
    });

    it("should throw error when contract mint fails", async () => {
      const walletAddress = "0x1234567890123456789012345678901234567890";
      mockPlatformTokenContract.mint.mockRejectedValue(new Error("Transaction failed"));

      await expect(mintUserTokens(walletAddress)).rejects.toThrow("Transaction failed");
    });

    it("should throw error when transaction wait fails", async () => {
      const walletAddress = "0x1234567890123456789012345678901234567890";
      mockPlatformTokenContract.mint.mockResolvedValue({
        wait: vi.fn().mockRejectedValue(new Error("Transaction confirmation failed")),
      });

      await expect(mintUserTokens(walletAddress)).rejects.toThrow(
        "Transaction confirmation failed"
      );
    });
  });
});
