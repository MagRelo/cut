import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, findFirst, findMany, queryRaw } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: { findUnique, findFirst },
    onchainPayment: { findMany },
    $queryRaw: queryRaw,
  },
}));

import { getPaymentTokenAddress } from "../../lib/contractAddresses.js";
import {
  getReferralSummary,
  MAX_REFERRAL_SUMMARY_DEPTH,
  publicReferralName,
} from "./getReferralSummary.js";

const USER_ID = "user-1";
const GROUP = "0x" + "ab".repeat(32);
const SEPOLIA = 84532;
const SEPOLIA_TOKEN = getPaymentTokenAddress(SEPOLIA)!;

describe("publicReferralName", () => {
  it("keeps a display name", () => {
    expect(publicReferralName(" Alice ")).toBe("Alice");
  });

  it("does not leak an email-shaped name", () => {
    expect(publicReferralName("eve@example.com")).toBe("Player");
  });
});

describe("getReferralSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns totalEarned with empty levels when the user has no referral chain", async () => {
    findUnique.mockResolvedValue({ referralChainId: null, referralGroupId: null });
    findFirst.mockResolvedValue(null);
    findMany.mockResolvedValue([
      { amountWei: "2500000", chainId: SEPOLIA, tokenAddress: SEPOLIA_TOKEN },
      { amountWei: "1500000", chainId: SEPOLIA, tokenAddress: SEPOLIA_TOKEN },
    ]);

    await expect(getReferralSummary(USER_ID)).resolves.toEqual({
      chainId: null,
      groupId: null,
      maxDepth: MAX_REFERRAL_SUMMARY_DEPTH,
      levels: [],
      tree: [],
      grandTotal: 0,
      totalEarned: 4,
    });
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("includes named tree nodes, derived counts, and referral payout total", async () => {
    findUnique.mockResolvedValue({ referralChainId: SEPOLIA, referralGroupId: GROUP });
    findMany.mockResolvedValue([
      { amountWei: "10500000", chainId: SEPOLIA, tokenAddress: SEPOLIA_TOKEN },
    ]);
    queryRaw.mockResolvedValue([
      { id: "a", name: "Alice", parentId: null, depth: 1, settings: { color: "#10B981" } },
      { id: "b", name: "Bob", parentId: null, depth: 1, settings: null },
      { id: "d", name: "eve@example.com", parentId: null, depth: 1, settings: { color: "nope" } },
      { id: "c", name: "Cara", parentId: "a", depth: 2, settings: { color: "#3B82F6" } },
    ]);

    await expect(getReferralSummary(USER_ID)).resolves.toEqual({
      chainId: SEPOLIA,
      groupId: GROUP,
      maxDepth: MAX_REFERRAL_SUMMARY_DEPTH,
      levels: [
        { depth: 1, count: 3 },
        { depth: 2, count: 1 },
      ],
      tree: [
        { id: "a", name: "Alice", parentId: null, depth: 1, color: "#10B981" },
        { id: "b", name: "Bob", parentId: null, depth: 1, color: "#9CA3AF" },
        { id: "d", name: "Player", parentId: null, depth: 1, color: "#9CA3AF" },
        { id: "c", name: "Cara", parentId: "a", depth: 2, color: "#3B82F6" },
      ],
      grandTotal: 4,
      totalEarned: 10.5,
    });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("returns 0 earned when there are no referral payments", async () => {
    findUnique.mockResolvedValue({ referralChainId: SEPOLIA, referralGroupId: GROUP });
    findMany.mockResolvedValue([]);
    queryRaw.mockResolvedValue([]);

    const result = await getReferralSummary(USER_ID);
    expect(result.totalEarned).toBe(0);
    expect(result.grandTotal).toBe(0);
    expect(result.tree).toEqual([]);
  });
});
