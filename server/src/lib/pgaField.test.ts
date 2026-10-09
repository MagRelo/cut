import { afterEach, describe, expect, it, vi } from "vitest";
import { getActivePlayers } from "./pgaField.js";

const fieldPayload = {
  data: {
    field: {
      tournamentName: "The Open",
      players: [],
    },
  },
};

describe("getActivePlayers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PGA_API_KEY;
  });

  it("retries a truncated body once", async () => {
    process.env.PGA_API_KEY = "test-key";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        statusText: "OK",
        json: async () => {
          throw new SyntaxError("Unexpected end of JSON input");
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        statusText: "OK",
        json: async () => fieldPayload,
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getActivePlayers("R2026001")).resolves.toMatchObject({
      tournamentName: "The Open",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws when the field payload is still invalid", async () => {
    process.env.PGA_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        statusText: "OK",
        json: async () => ({ data: {} }),
      })),
    );

    await expect(getActivePlayers("R2026001")).rejects.toThrow(
      "Failed to fetch PGA Tour field data: Invalid response format from PGA Tour API",
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry a missing API key", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(getActivePlayers("R2026001")).rejects.toThrow("PGA_API_KEY");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
