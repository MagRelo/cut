import { describe, expect, it } from "vitest";
import { contestRouteKey, hasOnchainEscrow } from "./hasOnchainEscrow.js";

describe("hasOnchainEscrow", () => {
  it("is true when a contract address is present", () => {
    expect(hasOnchainEscrow({ address: "0xabc" })).toBe(true);
  });

  it("is false when address is null or empty", () => {
    expect(hasOnchainEscrow({ address: null })).toBe(false);
    expect(hasOnchainEscrow({ address: "" })).toBe(false);
    expect(hasOnchainEscrow({})).toBe(false);
  });
});

describe("contestRouteKey", () => {
  it("uses the lowercase address when present", () => {
    expect(
      contestRouteKey({ id: "clxyz", address: "0xABCABCABCABCABCABCABCABCABCABCABCABCABCA" }),
    ).toBe("0xabcabcabcabcabcabcabcabcabcabcabcabcabca");
  });

  it("falls back to the database id", () => {
    expect(contestRouteKey({ id: "clxyz", address: null })).toBe("clxyz");
  });
});
