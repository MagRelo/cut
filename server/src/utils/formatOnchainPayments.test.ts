import { describe, expect, it } from "vitest";
import { formatOnchainPaymentsForContest } from "./formatOnchainPayments.js";

const ORACLE = "0x1111111111111111111111111111111111111111";
const REFERRER_A = "0x2222222222222222222222222222222222222222";
const REFERRER_B = "0x3333333333333333333333333333333333333333";

function referralRow(
  walletAddress: string,
  amountWei: string,
  metadata: Record<string, unknown> = {},
  name: string | null = "alice",
) {
  return {
    kind: "REFERRAL" as const,
    amountWei,
    walletAddress,
    metadata,
    user: name ? { name, settings: null } : null,
  };
}

describe("formatOnchainPaymentsForContest", () => {
  it("excludes oracle wallet REFERRAL rows when contest oracle is provided", () => {
    const result = formatOnchainPaymentsForContest(
      [
        referralRow(ORACLE, "500"),
        referralRow(REFERRER_A, "300", {}, "alice"),
        referralRow(REFERRER_B, "200", {}, "bob"),
      ],
      undefined,
      ORACLE,
    );

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.walletAddress)).toEqual([REFERRER_A, REFERRER_B]);
    expect(result.map((r) => r.username)).toEqual(["alice", "bob"]);
  });

  it("excludes REFERRAL rows with metadata.path oracle", () => {
    const otherWallet = "0x4444444444444444444444444444444444444444";
    const result = formatOnchainPaymentsForContest(
      [referralRow(otherWallet, "500", { path: "oracle" })],
      undefined,
      ORACLE,
    );

    expect(result).toHaveLength(0);
  });

  it("returns empty array when only oracle referral rows exist", () => {
    const result = formatOnchainPaymentsForContest(
      [referralRow(ORACLE, "1000")],
      undefined,
      ORACLE,
    );

    expect(result).toHaveLength(0);
  });

  it("does not filter PRIMARY or SECONDARY rows for oracle wallet", () => {
    const result = formatOnchainPaymentsForContest(
      [
        {
          kind: "PRIMARY",
          amountWei: "1000",
          walletAddress: ORACLE,
          metadata: {},
          user: null,
        },
        {
          kind: "SECONDARY",
          amountWei: "500",
          walletAddress: ORACLE,
          metadata: {},
          user: null,
        },
      ],
      undefined,
      ORACLE,
    );

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.kind)).toEqual(["PRIMARY", "SECONDARY"]);
  });

  it("matches oracle wallet case-insensitively", () => {
    const result = formatOnchainPaymentsForContest(
      [referralRow(ORACLE.toUpperCase(), "500"), referralRow(REFERRER_A, "300")],
      undefined,
      ORACLE.toLowerCase(),
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.walletAddress).toBe(REFERRER_A);
  });
});
