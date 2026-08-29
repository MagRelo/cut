import { describe, expect, it } from "vitest";
import {
  contestLineupEntryKey,
  contestLineupIdentityKeys,
  contestRouteKey,
  hasOnchainEscrow,
} from "./hasOnchainEscrow";

describe("hasOnchainEscrow", () => {
  it("is true when a contract address is present", () => {
    expect(hasOnchainEscrow({ address: "0xabc" })).toBe(true);
  });

  it("is false when address is missing", () => {
    expect(hasOnchainEscrow({ address: null })).toBe(false);
    expect(hasOnchainEscrow({})).toBe(false);
  });
});

describe("contestRouteKey", () => {
  it("falls back to the database id", () => {
    expect(contestRouteKey({ id: "clxyz", address: null })).toBe("clxyz");
  });
});

describe("contestLineupEntryKey", () => {
  it("uses the on-chain entryId when present", () => {
    expect(contestLineupEntryKey({ id: "clxyz", entryId: "9001" })).toBe("9001");
  });

  it("falls back to ContestLineup.id for free entries", () => {
    expect(contestLineupEntryKey({ id: "clxyz", entryId: null })).toBe("clxyz");
  });
});

describe("contestLineupIdentityKeys", () => {
  it("includes both ids for paid entries so mention matching stays compatible", () => {
    expect(contestLineupIdentityKeys({ id: "clxyz", entryId: "9001" })).toEqual([
      "clxyz",
      "9001",
    ]);
  });

  it("uses only ContestLineup.id for free entries", () => {
    expect(contestLineupIdentityKeys({ id: "clxyz", entryId: null })).toEqual(["clxyz"]);
  });
});
