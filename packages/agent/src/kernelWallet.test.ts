import { getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { kernelWalletAddress } from "./kernelWallet.js";

describe("kernelWalletAddress", () => {
  const owner = getAddress("0x190589B7a6ce3b84D8C2806ea9bBBe6BB58D67A4");
  const wallet = getAddress("0x38fc929C3B54538143e17A1d7553BDE10064c431");

  it("matches the Kernel v3.1 account ZeroDev deploys for this owner", () => {
    expect(kernelWalletAddress(owner, 8453)).toBe(wallet);
    expect(kernelWalletAddress(owner, 84532)).toBe(wallet);
  });

  it("rejects a chain that has no Kernel factory", () => {
    expect(() => kernelWalletAddress(owner, 1)).toThrow(/Chain is not supported/);
  });
});
