import { describe, expect, it } from "vitest";
import { pickWalletForChain, pickWalletPublicKeyForChain } from "./pickWalletForChain.js";

describe("pickWalletForChain", () => {
  const wallets = [
    { publicKey: "0xaaa", chainId: 84532, isPrimary: false },
    { publicKey: "0xbbb", chainId: 84532, isPrimary: true },
    { publicKey: "0xccc", chainId: 8453, isPrimary: true },
  ];

  it("prefers isPrimary on the requested chain", () => {
    expect(pickWalletForChain(wallets, 84532)?.publicKey).toBe("0xbbb");
    expect(pickWalletPublicKeyForChain(wallets, 84532)).toBe("0xbbb");
  });

  it("returns null when chain has no wallet", () => {
    expect(pickWalletForChain(wallets, 1)).toBeNull();
  });
});
