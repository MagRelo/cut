import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("../../lib/prisma.js", () => ({
  prisma: { lineup: { findMany } },
}));

import { nextLineupName } from "./nextLineupName.js";

describe("nextLineupName", () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it("starts at Lineup #1", async () => {
    findMany.mockResolvedValue([]);
    await expect(nextLineupName("user-1", "event-1")).resolves.toBe("Lineup #1");
  });

  it("counts unnumbered lineups", async () => {
    findMany.mockResolvedValue([{ name: "My Lineup" }, { name: "My Lineup" }]);
    await expect(nextLineupName("user-1", "event-1")).resolves.toBe("Lineup #3");
  });

  it("skips past an existing number", async () => {
    findMany.mockResolvedValue([{ name: "Lineup #3" }, { name: "My Lineup" }]);
    await expect(nextLineupName("user-1", "event-1")).resolves.toBe("Lineup #4");
  });
});
