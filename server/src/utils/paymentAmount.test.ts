import { describe, expect, it } from "vitest";
import { getPaymentTokenAddress } from "../lib/contractAddresses.js";
import { humanFromWei, paymentDecimals, roundMoney, sumHumanPayments } from "./paymentAmount.js";

const SEPOLIA = 84532;
const SEPOLIA_TOKEN = getPaymentTokenAddress(SEPOLIA)!;

describe("paymentDecimals", () => {
  it("uses 6 decimals for the configured payment token", () => {
    expect(paymentDecimals(SEPOLIA, SEPOLIA_TOKEN)).toBe(6);
    expect(paymentDecimals(SEPOLIA, SEPOLIA_TOKEN.toLowerCase())).toBe(6);
  });

  it("uses 6 decimals when the token address is missing", () => {
    expect(paymentDecimals(SEPOLIA, null)).toBe(6);
  });

  it("uses 18 decimals for a legacy token", () => {
    expect(paymentDecimals(SEPOLIA, "0x1111111111111111111111111111111111111111")).toBe(18);
  });
});

describe("humanFromWei", () => {
  it("converts 6-decimal USDC wei", () => {
    expect(humanFromWei("2500000", SEPOLIA, SEPOLIA_TOKEN)).toBe(2.5);
  });

  it("converts 18-decimal legacy wei", () => {
    expect(
      humanFromWei("1500000000000000000", SEPOLIA, "0x1111111111111111111111111111111111111111"),
    ).toBe(1.5);
  });

  it("returns null for empty or invalid wei", () => {
    expect(humanFromWei("", SEPOLIA, SEPOLIA_TOKEN)).toBeNull();
    expect(humanFromWei("not-a-number", SEPOLIA, SEPOLIA_TOKEN)).toBeNull();
  });
});

describe("sumHumanPayments", () => {
  it("sums mixed-decimal payments and rounds to cents", () => {
    expect(
      sumHumanPayments([
        { amountWei: "2500000", chainId: SEPOLIA, tokenAddress: SEPOLIA_TOKEN },
        { amountWei: "1750001", chainId: SEPOLIA, tokenAddress: SEPOLIA_TOKEN },
      ]),
    ).toBe(4.25);
  });

  it("returns 0 for an empty list", () => {
    expect(sumHumanPayments([])).toBe(0);
  });
});

describe("roundMoney", () => {
  it("rounds to two decimal places", () => {
    expect(roundMoney(1.234)).toBe(1.23);
    expect(roundMoney(1.226)).toBe(1.23);
  });
});
