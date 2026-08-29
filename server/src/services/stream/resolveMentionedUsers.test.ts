import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    contestLineup: { findMany },
    user: { findMany: vi.fn() },
  },
}));

import { resolveMentionedUserIds } from "./resolveMentionedUsers.js";

beforeEach(() => {
  vi.clearAllMocks();
  findMany.mockResolvedValue([]);
});

describe("resolveMentionedUserIds", () => {
  it("matches subjects by on-chain entryId or ContestLineup.id", async () => {
    findMany.mockResolvedValue([{ userId: "user-free" }, { userId: "user-paid" }]);

    const userIds = await resolveMentionedUserIds({
      contestId: "contest-1",
      entryIds: ["cl-free", "9001"],
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        contestId: "contest-1",
        OR: [
          { entryId: { in: ["cl-free", "9001"] } },
          { id: { in: ["cl-free", "9001"] } },
        ],
      },
      select: { userId: true },
    });
    expect(userIds).toEqual(["user-free", "user-paid"]);
  });

  it("returns an empty list when no subject entry ids are present", async () => {
    expect(
      await resolveMentionedUserIds({ contestId: "contest-1", entryIds: [] }),
    ).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
