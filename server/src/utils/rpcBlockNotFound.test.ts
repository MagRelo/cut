import { describe, expect, it } from "vitest";
import { isRpcBlockNotFoundError } from "./rpcBlockNotFound.js";

describe("isRpcBlockNotFoundError", () => {
  it("matches viem details on a pinned eth_call", () => {
    const error = Object.assign(new Error("Requested resource not found."), {
      details: "block not found: 0x30527e2",
      shortMessage: "Requested resource not found.",
    });
    expect(isRpcBlockNotFoundError(error)).toBe(true);
  });

  it("matches nested cause", () => {
    const cause = Object.assign(new Error("inner"), {
      details: "block not found: 0x1",
    });
    expect(isRpcBlockNotFoundError(new Error("outer", { cause }))).toBe(true);
  });

  it("ignores unrelated RPC errors", () => {
    expect(isRpcBlockNotFoundError(new Error("execution reverted"))).toBe(false);
  });
});
