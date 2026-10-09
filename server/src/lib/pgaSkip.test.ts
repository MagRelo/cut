import { afterEach, describe, expect, it, vi } from "vitest";
import { getPlayerProfileOverview } from "./pgaPlayerProfile.js";
import { fetchScorecardRaw } from "./pgaScorecard.js";

describe("PGA skips", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.PGA_API_KEY;
  });

  it("returns null when a scorecard body is truncated", async () => {
    process.env.PGA_API_KEY = "test-key";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => {
          throw new SyntaxError("Unexpected end of JSON input");
        },
      })),
    );

    await expect(fetchScorecardRaw("28237", "R2026001")).resolves.toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it("returns null when a player profile query fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          errors: [
            {
              message:
                "Cannot return null for non-nullable type: 'ID' within parent 'ProfileOverview'",
            },
          ],
        }),
      })),
    );

    await expect(getPlayerProfileOverview("52372")).resolves.toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});
