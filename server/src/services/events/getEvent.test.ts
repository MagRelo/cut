import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    competitionEvent: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: prismaMock,
}));

import { getEventForSport } from "./getEvent.js";

describe("getEventForSport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the event shell for a sport", async () => {
    prismaMock.competitionEvent.findFirst.mockResolvedValue({
      id: "evt-1",
      sportId: "pga-golf",
      externalId: "R2026001",
      isActive: true,
      metadata: { status: "IN_PROGRESS", name: "Mexico Open" },
    });

    await expect(getEventForSport("pga-golf", "evt-1")).resolves.toEqual({
      id: "evt-1",
      sportId: "pga-golf",
      externalId: "R2026001",
      isActive: true,
      metadata: { status: "IN_PROGRESS", name: "Mexico Open" },
    });
    expect(prismaMock.competitionEvent.findFirst).toHaveBeenCalledWith({
      where: { id: "evt-1", sportId: "pga-golf" },
      select: {
        id: true,
        sportId: true,
        externalId: true,
        isActive: true,
        metadata: true,
      },
    });
  });

  it("returns null when the event is not in that sport", async () => {
    prismaMock.competitionEvent.findFirst.mockResolvedValue(null);
    await expect(getEventForSport("pga-golf", "missing")).resolves.toBeNull();
  });
});
