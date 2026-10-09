import { describe, expect, it, vi } from "vitest";
import { isRpcBlockNotFoundError, retryOnceOnRpcBlockNotFound } from "./rpcBlockNotFound.js";

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

describe("retryOnceOnRpcBlockNotFound", () => {
  it("reads again when the block is not indexed yet", async () => {
    const read = vi
      .fn()
      .mockRejectedValueOnce(new Error("Requested resource not found."))
      .mockResolvedValueOnce(2);

    await expect(retryOnceOnRpcBlockNotFound(read)).resolves.toBe(2);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("does not retry an execution revert", async () => {
    const read = vi.fn().mockRejectedValue(new Error("execution reverted"));

    await expect(retryOnceOnRpcBlockNotFound(read)).rejects.toThrow("execution reverted");
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("throws when the block is still missing", async () => {
    const read = vi.fn().mockRejectedValue(new Error("Requested resource not found."));

    await expect(retryOnceOnRpcBlockNotFound(read)).rejects.toThrow("Requested resource not found.");
    expect(read).toHaveBeenCalledTimes(2);
  });
});
