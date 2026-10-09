import { describe, expect, it, vi } from "vitest";
import { isDbConnectivityError, retryOnceOnDbConnectivity } from "./dbConnectivity.js";

describe("retryOnceOnDbConnectivity", () => {
  it("retries a database connectivity failure once", async () => {
    const task = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error("Can't reach database server at db.example:25060"), {
          code: "P1001",
        }),
      )
      .mockResolvedValueOnce("ok");
    const wait = vi.fn(async () => undefined);

    await expect(retryOnceOnDbConnectivity(task, wait)).resolves.toBe("ok");
    expect(task).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledTimes(1);
  });

  it("throws when the database is still unreachable on the retry", async () => {
    const error = Object.assign(
      new Error("Timed out fetching a new connection from the connection pool"),
      { code: "P2024" },
    );
    const task = vi.fn().mockRejectedValue(error);

    await expect(retryOnceOnDbConnectivity(task, async () => undefined)).rejects.toBe(error);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("does not retry oracle mismatch or an unregistered winner", async () => {
    const messages = [
      "Oracle address mismatch",
      "Winner 0xabc is not registered on ReferralGraph for group 1. Run platform-root bootstrap and user registration before settlement.",
    ];

    for (const message of messages) {
      const task = vi.fn().mockRejectedValue(new Error(message));
      await expect(retryOnceOnDbConnectivity(task, async () => undefined)).rejects.toThrow(message);
      expect(task).toHaveBeenCalledTimes(1);
      expect(isDbConnectivityError(new Error(message))).toBe(false);
    }
  });

  it("treats a socket timeout as a connectivity failure", () => {
    expect(
      isDbConnectivityError(
        Object.assign(new Error("Operations timed out after `60s`"), { code: "P2028" }),
      ),
    ).toBe(true);
  });
});
