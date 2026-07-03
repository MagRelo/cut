import { describe, expect, it } from "vitest";
import type { Contest } from "../types/contest";
import { computeContestPayoutSections } from "./useContestPayoutSections";

function buildContest(overrides: Partial<Contest> = {}): Contest {
  return {
    id: "contest-1",
    name: "Free Weekend",
    description: null,
    eventId: "event-1",
    userGroupId: "group-1",
    endTime: new Date(),
    status: "SETTLED",
    settings: {
      contestType: "PUBLIC",
      chainId: 84532,
      expiryTimestamp: 0,
      paymentTokenAddress: "0x0000000000000000000000000000000000000001",
      paymentTokenSymbol: "xUSDC",
      oracle: "0x0000000000000000000000000000000000000002",
      primaryDeposit: 0,
      oracleFeeBps: 500,
      primaryDepositSecondarySubsidyBps: 0,
    },
    address: "0x1234567890123456789012345678901234567890",
    chainId: 84532,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("useContestPayoutSections", () => {
  it("shows full standings for free contests with zero payout amounts", () => {
    const contest = buildContest({
      results: {
        winningEntries: ["1", "2"],
        payoutBps: [7000, 3000],
        detailedResults: [
          {
            entryId: "1",
            position: 1,
            score: 24,
            payoutBasisPoints: 7000,
            payoutAmountWei: "0",
            positionBonusAmountWei: "0",
            lineupName: "Lineup A",
            username: "alice",
          },
          {
            entryId: "2",
            position: 2,
            score: 18,
            payoutBasisPoints: 3000,
            payoutAmountWei: "0",
            positionBonusAmountWei: "0",
            lineupName: "Lineup B",
            username: "bob",
          },
          {
            entryId: "3",
            position: 3,
            score: 12,
            payoutBasisPoints: 0,
            lineupName: "Lineup C",
            username: "carol",
          },
        ],
      },
    });

    const result = computeContestPayoutSections(contest);

    expect(result.hasAnyRows).toBe(true);
    expect(result.primary).toHaveLength(3);
    expect(result.primary[0]?.username).toBe("alice");
    expect(result.primary[0]?.score).toBe(24);
    expect(result.primary[2]?.username).toBe("carol");
  });

  it("keeps paid-contest behavior when payout amounts are non-zero", () => {
    const contest = buildContest({
      settings: {
        contestType: "PUBLIC",
        chainId: 84532,
        expiryTimestamp: 0,
        paymentTokenAddress: "0x0000000000000000000000000000000000000001",
        paymentTokenSymbol: "xUSDC",
        oracle: "0x0000000000000000000000000000000000000002",
        primaryDeposit: 10,
        oracleFeeBps: 500,
        primaryDepositSecondarySubsidyBps: 0,
      },
      results: {
        winningEntries: ["1"],
        payoutBps: [10000],
        detailedResults: [
          {
            entryId: "1",
            position: 1,
            score: 24,
            payoutBasisPoints: 10000,
            payoutAmountWei: "1000000000000000000",
            positionBonusAmountWei: "0",
            lineupName: "Lineup A",
            username: "alice",
          },
          {
            entryId: "2",
            position: 2,
            score: 18,
            payoutBasisPoints: 0,
            lineupName: "Lineup B",
            username: "bob",
          },
        ],
      },
    });

    const result = computeContestPayoutSections(contest);

    expect(result.primary).toHaveLength(1);
    expect(result.primary[0]?.username).toBe("alice");
  });
});
