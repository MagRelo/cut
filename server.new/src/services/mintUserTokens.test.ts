import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ethers } from "ethers";

// Mock ethers
vi.mock("ethers", () => ({
  ethers: {
    JsonRpcProvider: vi.fn(),
    Wallet: vi.fn(),
    Contract: vi.fn(),
    parseUnits: vi.fn(),
  },
}));

// Mock contract ABIs
vi.mock("../../contracts/MockUSDC.json", () => ({
  default: {
    abi: ["function mint(address, uint256)"],
  },
}));

import { mintUSDCToUser, quickMintUSDCToUser } from "./mintUserTokens.js";

describe("mintUserTokens", () => {
  const mockProvider = {};
  const mockWallet = {};
  const mockPaymentTokenContract = {
    mint: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up environment variables for tests
    process.env.RPC_URL = "http://localhost:8545";
    process.env.ORACLE_PRIVATE_KEY =
      "0x1234567890123456789012345678901234567890123456789012345678901234";
    process.env.PAYMENT_TOKEN_ADDRESS = "0xMockUSDCAddress";

    // Setup ethers mocks
    (ethers.JsonRpcProvider as any).mockReturnValue(mockProvider);
    (ethers.Wallet as any).mockReturnValue(mockWallet);
    (ethers.Contract as any).mockReturnValue(mockPaymentTokenContract);
    (ethers.parseUnits as any).mockReturnValue("1000000000"); // 1000 USDC with 6 decimals

    // Setup contract mocks
    mockPaymentTokenContract.mint.mockResolvedValue({
      hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      wait: vi.fn().mockResolvedValue({}),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("mintUSDCToUser", () => {
    describe("Success cases", () => {
      it("should mint USDC(x) to a valid user address", async () => {
        const userAddress = "0x1234567890123456789012345678901234567890";
        const amount = 1000;

        const result = await mintUSDCToUser(userAddress, amount);

        expect(ethers.parseUnits).toHaveBeenCalledWith("1000", 6);
        expect(mockPaymentTokenContract.mint).toHaveBeenCalledWith(userAddress, "1000000000");
        expect(result).toEqual({
          success: true,
          transaction: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          amount: 1000,
          recipient: userAddress,
        });
      });

      it("should use default amount of 1000 when no amount is provided", async () => {
        const userAddress = "0x1234567890123456789012345678901234567890";

        await mintUSDCToUser(userAddress);

        expect(ethers.parseUnits).toHaveBeenCalledWith("1000", 6);
        expect(mockPaymentTokenContract.mint).toHaveBeenCalledWith(userAddress, "1000000000");
      });
    });

    describe("Error cases", () => {
      it("should return error when contract mint fails", async () => {
        const userAddress = "0x1234567890123456789012345678901234567890";
        mockPaymentTokenContract.mint.mockRejectedValue(new Error("Transaction failed"));

        const result = await mintUSDCToUser(userAddress);

        expect(result).toEqual({
          success: false,
          error: "Transaction failed",
        });
      });

      it("should return error when transaction wait fails", async () => {
        const userAddress = "0x1234567890123456789012345678901234567890";
        mockPaymentTokenContract.mint.mockResolvedValue({
          wait: vi.fn().mockRejectedValue(new Error("Transaction confirmation failed")),
        });

        const result = await mintUSDCToUser(userAddress);

        expect(result).toEqual({
          success: false,
          error: "Transaction confirmation failed",
        });
      });

      it("should return error when ORACLE_PRIVATE_KEY is missing", async () => {
        delete process.env.ORACLE_PRIVATE_KEY;
        const userAddress = "0x1234567890123456789012345678901234567890";

        const result = await mintUSDCToUser(userAddress);

        expect(result).toEqual({
          success: false,
          error: "ORACLE_WALLET_PRIVATE_KEY environment variable is required",
        });
      });

      it("should return error when private key format is invalid", async () => {
        process.env.ORACLE_PRIVATE_KEY = "invalid-key";
        const userAddress = "0x1234567890123456789012345678901234567890";

        const result = await mintUSDCToUser(userAddress);

        expect(result).toEqual({
          success: false,
          error:
            "Invalid private key format. Expected 64 character hex string or 0x-prefixed hex string",
        });
      });
    });
  });

  describe("quickMintUSDCToUser", () => {
    it("should call mintUSDCToUser with the provided parameters", async () => {
      const userAddress = "0x1234567890123456789012345678901234567890";
      const amount = 500;

      const result = await quickMintUSDCToUser(userAddress, amount);

      expect(ethers.parseUnits).toHaveBeenCalledWith("500", 6);
      expect(mockPaymentTokenContract.mint).toHaveBeenCalledWith(
        userAddress,
        "1000000000" // This will be the mocked return value
      );
      expect(result).toEqual({
        success: true,
        transaction: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        amount: 500,
        recipient: userAddress,
      });
    });

    it("should use default amount of 1000 when no amount is provided", async () => {
      const userAddress = "0x1234567890123456789012345678901234567890";

      await quickMintUSDCToUser(userAddress);

      expect(ethers.parseUnits).toHaveBeenCalledWith("1000", 6);
    });
  });
});
